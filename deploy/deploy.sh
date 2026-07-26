#!/usr/bin/env bash
#
# Deploy docs.loyalty.lt.
#
# Same shape as the other loyalty.lt front-ends: pull, install, build, reload
# the pm2 app. The build is written to `build/` and served by `docusaurus serve`
# under pm2 (see ecosystem.config.cjs), with nginx reverse-proxying to it.
#
# Usage on the server:
#   cd /var/www/vhosts/loyalty.lt/docs.loyalty.lt && ./deploy/deploy.sh
#
set -euo pipefail

APP_NAME="docs.loyalty.lt"
CHAT_APP_NAME="docs.loyalty.lt-chat"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "==> Pulling latest"
git pull --ff-only origin main

echo "==> Installing dependencies"
# `npm ci` needs the lockfile to match package.json; it is the reproducible path.
npm ci

echo "==> Building (regenerates the API explorer from the OpenAPI spec)"
# Build into a scratch dir first so a failure cannot leave `build/` half-written
# while pm2 is serving out of it.
rm -rf build.new
npm run build -- --out-dir build.new

if [ ! -f build.new/index.html ]; then
  echo "!! build.new/index.html missing — refusing to deploy a broken build" >&2
  rm -rf build.new
  exit 1
fi

echo "==> Swapping in the new build"
rm -rf build.old
[ -d build ] && mv build build.old
mv build.new build
rm -rf build.old

mkdir -p logs

echo "==> Reloading pm2 app '$APP_NAME'"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  echo "    not registered yet, starting it"
  pm2 start ecosystem.config.cjs
  pm2 save
fi

# The chat proxy needs LITELLM_API_KEY in the environment (server/.env.example
# documents it) before it will start — it refuses to boot without it, on
# purpose, so a missing secret fails loudly instead of serving a broken chat.
echo "==> Reloading pm2 app '$CHAT_APP_NAME'"
if pm2 describe "$CHAT_APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$CHAT_APP_NAME" --update-env
elif [ -n "${LITELLM_API_KEY:-}" ]; then
  echo "    not registered yet, starting it"
  pm2 start ecosystem.config.cjs --only "$CHAT_APP_NAME"
  pm2 save
else
  echo "    skipped: LITELLM_API_KEY not set in this shell. Set it and re-run," \
       "or 'pm2 start ecosystem.config.cjs --only $CHAT_APP_NAME' once it is."
fi

pm2 describe "$APP_NAME" | grep -E "status|uptime" || true

echo "==> Done. https://docs.loyalty.lt"
