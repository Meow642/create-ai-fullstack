#!/usr/bin/env bash
set -euo pipefail

rm -rf /tmp/cf-smoke
mkdir -p /tmp/cf-smoke
node "$(pwd)/dist/index.mjs" /tmp/cf-smoke/app --no-install --no-git
cd /tmp/cf-smoke/app
pnpm install
pnpm typecheck
pnpm -r run lint
pnpm -F api test
pnpm -F web test
pnpm -F web build
pnpm -F api build
pnpm -F api start &
SERVER_PID=$!
sleep 3
curl -fsS http://localhost:3000/health
kill "$SERVER_PID"
