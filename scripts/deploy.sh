#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="${DEPLOY_REPO_PATH:-$(cd "$(dirname "$0")/.." && pwd)}"
BRANCH="${DEPLOY_BRANCH:-main}"
LOG_DIR="${DEPLOY_LOG_DIR:-$REPO_PATH/logs}"
LOG_FILE="$LOG_DIR/deploy.log"

mkdir -p "$LOG_DIR"

exec >>"$LOG_FILE" 2>&1

echo "===== deploy started at $(date -Is) ====="
echo "repo: $REPO_PATH"
echo "branch: $BRANCH"

cd "$REPO_PATH"

git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

corepack enable
pnpm install --frozen-lockfile
pnpm -r build

if command -v pm2 >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  echo "pm2 not found; skipped process reload"
fi

echo "===== deploy finished at $(date -Is) ====="
