#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="${CAF_DEV_TMP:-/tmp/create-ai-fullstack-dev}"
APP_DIR="$TMP_ROOT/app"

echo "Building local CLI..."
cd "$ROOT_DIR"
pnpm build

echo "Cleaning previous temporary project: $TMP_ROOT"
rm -rf "$TMP_ROOT"
mkdir -p "$TMP_ROOT"

echo "Scaffolding template project..."
node "$ROOT_DIR/dist/index.mjs" "$APP_DIR" --no-install --no-git

echo "Installing generated project dependencies..."
cd "$APP_DIR"
pnpm install

echo ""
echo "Temporary project: $APP_DIR"
echo "Web:  http://localhost:5173/items"
echo "Docs: http://localhost:3000/docs"
echo "API:  http://localhost:3000/health"
echo ""
echo "Starting generated frontend and backend. Press Ctrl+C to stop."
pnpm dev
