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
#   5. deploy docs.loyalty.lt against that now-correct spec
#   6. verify the published pages
#
# Every step is idempotent — re-running it when nothing changed is a no-op.

set -euo pipefail

SSH_HOST="root@185.170.198.15"
SSH_PORT=29485
SSH_KEY="$HOME/.ssh/id_ed25519"
REMOTE_ROOT="/var/www/vhosts/loyalty.lt"

DOCS_LOCAL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_LOCAL="$(cd "$DOCS_LOCAL/../api.loyalty.lt" && pwd)"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

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

# ------------------------------------------------------- 5. deploy docs

bold "Deploying docs.loyalty.lt"

if (( DRY_RUN )); then
  warn "would pull, drop the cached spec, npm ci, build and reload pm2"
else
  remote_node "set -e
    cd $REMOTE_ROOT/docs.loyalty.lt
    git pull --ff-only origin main
    npm ci --silent
    rm -f openapi/full.json
    npm run build" 2>&1 | grep -E 'fetching|scoped|Compiled|Generating static|error' | tail -6

  remote_node "cd $REMOTE_ROOT/docs.loyalty.lt && pm2 reload ecosystem.config.cjs --update-env && pm2 save" >/dev/null
  echo "    pm2 reloaded"
fi

# ----------------------------------------------------- 6. verify the docs

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
  '/docs/transactions/postShopTransactionsCreate',
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

if (bad) process.exit(1);
console.log(`    ok — ${MUST_EXIST.length} pages serving, llms.txt clean`);
NODE
fi

bold "Done"
echo "    https://docs.loyalty.lt/docs"
