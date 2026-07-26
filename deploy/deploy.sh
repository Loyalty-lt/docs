#!/usr/bin/env bash
#
# Deploy docs.loyalty.lt.
#
# Builds into a timestamped release directory and flips a `current` symlink, so
# the swap is atomic — visitors never see a half-written site — and rolling back
# is one `ln -sfn` away.
#
# Usage on the server:
#   cd /var/www/docs.loyalty.lt/repo && ./deploy/deploy.sh
#
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/docs.loyalty.lt}"
RELEASES="$DEPLOY_ROOT/releases"
CURRENT="$DEPLOY_ROOT/current"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "==> Pulling latest"
git pull --ff-only origin main

echo "==> Installing dependencies"
# `npm ci` needs the lockfile to match package.json; it is the reproducible path.
npm ci

echo "==> Building (regenerates the API explorer from the OpenAPI spec)"
npm run build

if [ ! -f build/index.html ]; then
  echo "!! build/index.html missing — refusing to deploy a broken build" >&2
  exit 1
fi

RELEASE="$RELEASES/$(date +%Y%m%d%H%M%S)"
echo "==> Publishing to $RELEASE"
mkdir -p "$RELEASE"
cp -R build/. "$RELEASE/"

ln -sfn "$RELEASE" "$CURRENT"
echo "==> current -> $(readlink "$CURRENT")"

echo "==> Pruning old releases (keeping $KEEP_RELEASES)"
# `ls -1d` sorts lexicographically, which for these timestamps is chronological.
ls -1d "$RELEASES"/*/ 2>/dev/null | head -n "-$KEEP_RELEASES" | while read -r old; do
  echo "    removing $old"
  rm -rf "$old"
done

echo "==> Reloading nginx"
if command -v sudo >/dev/null 2>&1; then
  sudo nginx -t && sudo systemctl reload nginx
else
  nginx -t && systemctl reload nginx
fi

echo "==> Done. https://docs.loyalty.lt"
