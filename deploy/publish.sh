#!/usr/bin/env bash
#
# Publish the API reference end to end, from a laptop, in one command.
#
#   ./deploy/publish.sh              # the whole chain
#   ./deploy/publish.sh --dry-run    # say what it would do, touch nothing
#
# The chain exists because the two halves are coupled and ordered: the docs site
# builds its API Reference by fetching the live spec from api.loyalty.lt, so the
# API must be deployed first or the docs publish the previous API surface.
#
#   1. regenerate the OpenAPI spec locally and commit it if it changed
#   2. push api.loyalty.lt and docs.loyalty.lt
#   3. deploy api.loyalty.lt, clear its caches, regenerate its spec
#   4. verify the live spec: no ghost endpoints, credentials declared correctly
#   5. deploy the frontends (admin, partners, loyalty.lt) and reload them
#   6. deploy docs.loyalty.lt against that now-correct spec
#   7. verify the published pages and the frontends
#
# The three frontends are NOT git checkouts on the server, so they ship over
# rsync from this laptop and are built there. Only their own pm2 processes are
# reloaded: the box also runs unrelated projects (avitra, care, convylo,
# manskin, meet), and `pm2 restart all` would take those down too. Pass
# --restart-all if you really mean every process on the machine.
#
# Every step is idempotent — re-running it when nothing changed is a no-op.

set -euo pipefail

SSH_HOST="root@185.170.198.15"
SSH_PORT=29485
SSH_KEY="$HOME/.ssh/id_ed25519"
REMOTE_ROOT="/var/www/vhosts/loyalty.lt"

DOCS_LOCAL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_LOCAL="$(cd "$DOCS_LOCAL/../api.loyalty.lt" && pwd)"

# vietinis katalogas | nuotolinis katalogas | pm2 proceso vardas | viešas adresas
# loyalty.lt serveryje gyvena `httpdocs`, ne to paties pavadinimo kataloge.
FRONTENDS=(
  "admin.loyalty.lt|admin.loyalty.lt|admin.loyalty.lt|https://admin.loyalty.lt"
  "partners.loyalty.lt|partners.loyalty.lt|partners.loyalty.lt|https://partners.loyalty.lt"
  "loyalty.lt|httpdocs|loyalty.lt|https://loyalty.lt"
)

DRY_RUN=0
RESTART_ALL=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --restart-all) RESTART_ALL=1 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

bold() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[33m    %s\033[0m\n' "$1"; }
die() { printf '\033[31m\nFAILED: %s\033[0m\n' "$1" >&2; exit 1; }

remote() {
  ssh -i "$SSH_KEY" -p "$SSH_PORT" -o BatchMode=yes "$SSH_HOST" "$@"
}

# nvm is not loaded by non-interactive shells, so anything needing node/pm2 goes
# through this rather than `remote` directly.
remote_node() {
  remote "export NVM_DIR=\$HOME/.nvm && . \"\$NVM_DIR/nvm.sh\" && $*"
}

run() {
  if (( DRY_RUN )); then
    warn "would run: $*"
  else
    "$@"
  fi
}

# Šaltinis keliauja rsync'u, nes serveryje šie katalogai nėra git checkout'ai.
# node_modules, .next ir .env lieka serveryje: priklausomybės ir build'as
# daromi ten, o .env yra tik ten ir jį perrašyti reikštų nutrūkusią produkciją.
rsync_app() {
  local src="$1" dest="$2"

  rsync -az --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.next.backup*' \
    --exclude '.turbo' \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude 'logs' \
    --exclude '.DS_Store' \
    -e "ssh -i $SSH_KEY -p $SSH_PORT -o BatchMode=yes" \
    "$src/" "$SSH_HOST:$dest/"
}

# ---------------------------------------------------------------- preflight

bold "Preflight"

for repo in "$API_LOCAL" "$DOCS_LOCAL"; do
  branch=$(git -C "$repo" branch --show-current)
  [[ "$branch" == "main" ]] || die "$(basename "$repo") is on '$branch', not main"
  echo "    $(basename "$repo"): main @ $(git -C "$repo" log --oneline -1)"
done

remote 'echo ok' >/dev/null 2>&1 || die "cannot reach $SSH_HOST:$SSH_PORT — check the VPN and that $SSH_KEY is the right key"
echo "    ssh: reachable"

# ------------------------------------------------- 1. regenerate the spec

bold "Regenerating the OpenAPI spec from the annotations"

if (( DRY_RUN )); then
  warn "would run php artisan l5-swagger:generate in $API_LOCAL"
else
  (cd "$API_LOCAL" && php artisan l5-swagger:generate >/dev/null)
  if ! git -C "$API_LOCAL" diff --quiet -- storage/api-docs/api-docs.json; then
    echo "    spec changed — committing"
    git -C "$API_LOCAL" add storage/api-docs/api-docs.json
    git -C "$API_LOCAL" commit -q -m "chore: regenerate the OpenAPI spec"
  else
    echo "    spec unchanged"
  fi
fi

# ------------------------------------------------------------- 2. push

bold "Pushing"

for repo in "$API_LOCAL" "$DOCS_LOCAL"; do
  name=$(basename "$repo")
  if [[ -n "$(git -C "$repo" status --porcelain --untracked-files=no)" ]]; then
    die "$name has uncommitted tracked changes — commit or stash them first"
  fi
  # api.loyalty.lt's auto-version workflow commits the bumped VERSION back to main,
  # so the remote is routinely ahead of a laptop that has not fetched since.
  run git -C "$repo" fetch --quiet origin main
  behind=$(git -C "$repo" rev-list --count "main..origin/main" 2>/dev/null || echo 0)
  if [[ "$behind" != "0" ]] && ! (( DRY_RUN )); then
    echo "    $name: $behind commit(s) behind — rebasing"
    git -C "$repo" pull --rebase --quiet origin main || die "$name: rebase hit a conflict, resolve it and re-run"
  fi

  ahead=$(git -C "$repo" rev-list --count "origin/main..main" 2>/dev/null || echo 0)
  if [[ "$ahead" == "0" ]]; then
    echo "    $name: already pushed"
  else
    echo "    $name: pushing $ahead commit(s)"
    run git -C "$repo" push origin main
  fi
done

# -------------------------------------------------------- 3. deploy api

bold "Deploying api.loyalty.lt"

if (( DRY_RUN )); then
  warn "would pull, clear caches and regenerate the spec on the server"
else
  remote "set -e
    cd $REMOTE_ROOT/api.loyalty.lt
    # l5-swagger rewrites this tracked file in place on every deploy, so the tree is
    # permanently dirty here and --ff-only refuses. It is regenerated two lines down.
    git checkout -- storage/api-docs/api-docs.json 2>/dev/null || true
    git pull --ff-only origin main
    php artisan route:clear
    php artisan config:clear
    php artisan l5-swagger:generate" | tail -4
fi

# NOTE: migrations are deliberately not run here. Laravel refuses to migrate a
# production database without a confirmation prompt, and forcing past it from a
# script is how someone loses data. Run them yourself when a deploy adds one:
#   ssh -i ~/.ssh/id_ed25519 -p 29485 root@185.170.198.15
#   cd /var/www/vhosts/loyalty.lt/api.loyalty.lt && php artisan migrate
if ! (( DRY_RUN )); then
  pending=$(remote "cd $REMOTE_ROOT/api.loyalty.lt && php artisan migrate:status 2>/dev/null | grep -c 'Pending' || true")
  if [[ "${pending:-0}" != "0" ]]; then
    warn "$pending migration(s) pending on production — run 'php artisan migrate' there yourself"
  fi
fi

# ---------------------------------------------------- 3b. deploy staging

bold "Deploying staging-api.loyalty.lt"

# Staging ships the same commit as production, always. Integrators build against
# staging; when it lags, they are testing an API that no longer exists. It sat
# seven minor versions behind before this step existed.
if (( DRY_RUN )); then
  warn "would pull, composer install, migrate and clear caches on staging"
else
  if remote "test -d $REMOTE_ROOT/staging-api.loyalty.lt/.git"; then
    remote "$REMOTE_ROOT/staging-api.loyalty.lt/deploy/staging-deploy.sh" 2>&1 | grep -E '==>|version|FAILED' | tail -8
  else
    warn "staging is not a git checkout yet — run deploy/staging-bootstrap.sh on the server once"
    warn "  ssh -i ~/.ssh/id_ed25519 -p 29485 root@185.170.198.15"
    warn "  cd $REMOTE_ROOT/staging-api.loyalty.lt && ./deploy/staging-bootstrap.sh"
  fi
fi

# ------------------------------------------------------ 4. verify the API

bold "Verifying the live spec"

if (( DRY_RUN )); then
  warn "would check the live spec for ghosts and credential declarations"
else
  node - <<'NODE' || die "the live spec is wrong — docs not deployed"
const GHOSTS = [
  '/{locale}/shop/auth/logout',
  '/{locale}/shop/points/summary',
  '/{locale}/shop/game-sessions/history',
  '/{locale}/shop/shops/nearby',
];
const REQUIRED = [
  '/{locale}/shop/transactions/create',
  '/{locale}/shop/coupons/verify',
  '/{locale}/sms/send',
];

const res = await fetch('https://api.loyalty.lt/docs?api-docs.json', { cache: 'no-store' });
if (!res.ok) { console.error(`    spec fetch failed: ${res.status}`); process.exit(1); }
const spec = await res.json();
const paths = spec.paths ?? {};
let bad = 0;

for (const p of GHOSTS) if (paths[p]) { console.error(`    ghost endpoint still published: ${p}`); bad++; }
for (const p of REQUIRED) if (!paths[p]) { console.error(`    endpoint missing from the spec: ${p}`); bad++; }

// X-API-Key and X-API-Secret must be required together. As separate entries in the
// security array they mean "either one", and the reference renders a picker.
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
for (const [p, item] of Object.entries(paths)) {
  if (!/^\/\{locale\}\/(shop|sms)\b/.test(p)) continue;
  for (const [m, op] of Object.entries(item)) {
    if (!METHODS.includes(m)) continue;
    const sec = op.security;
    if (!sec) continue;
    const usesKey = JSON.stringify(sec).includes('apiKey');
    if (!usesKey) continue;
    const both = sec.length === 1 && 'apiKey' in sec[0] && 'apiSecret' in sec[0];
    if (!both) { console.error(`    ${m.toUpperCase()} ${p}: apiKey/apiSecret are alternatives, not both`); bad++; }
  }
}

// The docs document one response envelope. Assert the live API still returns it,
// rather than trusting the prose — this is exactly what drifted once already.
const ok = await fetch('https://api.loyalty.lt/lt/site/partners/categories');
const okBody = await ok.json();
for (const k of ['success', 'code', 'request_id']) {
  if (!(k in okBody)) { console.error(`    success envelope is missing "${k}"`); bad++; }
}

const err = await fetch('https://api.loyalty.lt/lt/shop/transactions');
const errBody = await err.json();
for (const k of ['success', 'code', 'message', 'request_id']) {
  if (!(k in errBody)) { console.error(`    error envelope is missing "${k}"`); bad++; }
}
if (errBody.code === err.status) {
  console.error(`    error "code" equals the HTTP status — the docs say it is a separate application code`);
  bad++;
}

if (bad) process.exit(1);
const n = Object.keys(paths).filter((p) => /^\/\{locale\}\/(shop|sms)\b/.test(p)).length;
console.log(`    ok — ${n} public paths, no ghosts, credentials required together, envelope as documented`);
NODE
fi

# -------------------------------------------------- 5. deploy the frontends

bold "Deploying the frontends"

for entry in "${FRONTENDS[@]}"; do
  IFS='|' read -r local_dir remote_dir pm2_name _url <<< "$entry"
  src="$DOCS_LOCAL/../$local_dir"
  dest="$REMOTE_ROOT/$remote_dir"

  [[ -d "$src" ]] || die "$local_dir not found next to docs.loyalty.lt"

  if (( DRY_RUN )); then
    warn "would rsync $local_dir -> $dest, npm ci, build and reload pm2 '$pm2_name'"
    continue
  fi

  echo "    $local_dir -> $remote_dir"
  rsync_app "$src" "$dest"

  # npm ci pagal atsiųstą package-lock.json, tada build. Jei build'as lūžta,
  # senas .next lieka veikti, kol procesas neperkrautas — todėl reload tik po jo.
  remote_node "set -e
    cd $dest
    npm ci --silent
    npm run build" 2>&1 | grep -iE 'compiled|error|failed|warn' | tail -4

  remote_node "cd $dest && pm2 reload ecosystem.config.cjs --update-env" >/dev/null
  echo "    pm2 reloaded $pm2_name"
done

if (( RESTART_ALL )) && ! (( DRY_RUN )); then
  warn "--restart-all: restarting EVERY pm2 process on the box, including unrelated projects"
  remote_node "pm2 restart all" >/dev/null
fi

if ! (( DRY_RUN )); then
  remote_node "pm2 save" >/dev/null
fi

# ------------------------------------------------------- 6. deploy docs

bold "Deploying docs.loyalty.lt"

if (( DRY_RUN )); then
  warn "would pull, drop the cached spec, npm ci, build and reload pm2"
else
  remote_node "set -e
    cd $REMOTE_ROOT/docs.loyalty.lt
    # openapi/loyalty.json is tracked but the build regenerates it in place, so the
    # working tree is always dirty here and --ff-only refuses. Discard the local copy;
    # the build writes it again two lines down.
    git checkout -- openapi/loyalty.json 2>/dev/null || true
    git pull --ff-only origin main
    npm ci --silent
    rm -f openapi/full.json
    npm run build" 2>&1 | grep -E 'fetching|scoped|Compiled|Generating static|error' | tail -6

  remote_node "cd $REMOTE_ROOT/docs.loyalty.lt && pm2 reload ecosystem.config.cjs --update-env && pm2 save" >/dev/null
  echo "    pm2 reloaded"
fi

# ------------------------------------------- 7. verify the docs and frontends

bold "Verifying the published docs"

if (( DRY_RUN )); then
  warn "would check that the key pages render"
else
  sleep 3
  node - <<'NODE' || die "the docs are not serving correctly"
const MUST_EXIST = [
  '/docs',
  '/docs/api-reference/overview',
  '/docs/api-reference/authentication',
  '/docs/api-reference/realtime',
  '/docs/transactions/postShopTransactionsCreate',
  '/docs/realtime/shopRealtimeConfig',
  '/docs/external-sms-api/sendSmsExternal',
  '/docs/mcp-server',
];

let bad = 0;
for (const p of MUST_EXIST) {
  const r = await fetch('https://docs.loyalty.lt' + p, { redirect: 'manual' });
  if (r.status !== 200) { console.error(`    ${r.status} ${p}`); bad++; }
}

const llms = await (await fetch('https://docs.loyalty.lt/llms.txt')).text();
if (/logout|game-sessions|points\/summary/.test(llms)) {
  console.error('    llms.txt still lists removed endpoints — the build used a stale spec');
  bad++;
}

// Staging must not fall behind production, or the docs' "test here first" is a lie.
// It may be a patch ahead: the auto-version workflow bumps VERSION after a deploy.
const weight = (v) => (v ?? '0').split('.').map(Number).reduce((a, n) => a * 1000 + n, 0);
const [prodHealth, stagingHealth] = await Promise.all([
  fetch('https://api.loyalty.lt/lt/shop/system/health').then((r) => r.json()),
  fetch('https://staging-api.loyalty.lt/lt/shop/system/health').then((r) => r.json()),
]);
if (weight(stagingHealth.version) < weight(prodHealth.version)) {
  console.error(`    staging is behind: ${stagingHealth.version} vs production ${prodHealth.version}`);
  bad++;
}

if (bad) process.exit(1);
console.log(`    ok — ${MUST_EXIST.length} pages serving, llms.txt clean`);
NODE

  # Frontendai: užtenka, kad atsakytų 2xx/3xx — 502 reikštų, kad build'as
  # nulūžo arba pm2 procesas nepakilo po reload'o.
  for entry in "${FRONTENDS[@]}"; do
    IFS='|' read -r _local _remote pm2_name url <<< "$entry"
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url" || echo 000)

    if [[ "$code" =~ ^(2|3) ]]; then
      echo "    ok — $url ($code)"
    else
      die "$url returned $code — check 'pm2 logs $pm2_name'"
    fi
  done
fi

bold "Done"
echo "    https://docs.loyalty.lt/docs"
