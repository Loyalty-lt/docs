#!/usr/bin/env bash
#
# Deploy docs.loyalty.lt (Fumadocs / Next.js).
#
# Usage on the server:
#   cd /var/www/vhosts/loyalty.lt/docs.loyalty.lt && ./deploy/deploy.sh
#
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# pm2 + node live in nvm on the server; non-interactive shells don't load it.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "==> Pulling latest"
git pull --ff-only origin main

echo "==> Installing dependencies"
npm ci

echo "==> Building (prebuild refreshes openapi/loyalty.json from api.loyalty.lt)"
npm run build

mkdir -p logs

echo "==> Reloading pm2"
if pm2 describe docs.loyalty.lt >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save
