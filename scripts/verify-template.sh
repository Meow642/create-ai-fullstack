#!/usr/bin/env bash
set -euo pipefail
export CI=true

SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

rm -rf /tmp/cf-smoke
mkdir -p /tmp/cf-smoke
node "$(pwd)/dist/index.mjs" /tmp/cf-smoke/app --no-install --no-git
cd /tmp/cf-smoke/app
pnpm install
pnpm typecheck
pnpm -r run lint
pnpm test:coverage
pnpm gen:openapi
pnpm validate:openapi
pnpm -F web build
pnpm -F api build
API_PORT="$(node -e "const net=require('node:net'); const server=net.createServer(); server.listen(0, '127.0.0.1', () => { console.log(server.address().port); server.close(); });")"
PORT="$API_PORT" pnpm -F api start &
SERVER_PID=$!
sleep 3
curl -fsS "http://localhost:$API_PORT/health"
curl -fsS "http://localhost:$API_PORT/openapi.yaml" | grep -q 'openapi: 3.1.0'
kill "$SERVER_PID"
SERVER_PID=""

test -f AGENTS.md
test -f prompts/README.md
test -f api-contracts/api/openapi.yaml
test -f api-contracts/api/consumer.json
test -f docker-compose.yml
test -f docker-compose.override.yml
test -f docker-compose.prod.yml
test -f .github/workflows/ci.yml
test -f apps/web/AGENTS.md
test -f apps/api/AGENTS.md
test -f packages/shared/AGENTS.md
test "$(wc -c < AGENTS.md)" -le 8192
grep -q 'AGENTS.md' CLAUDE.md
grep -q 'AGENTS.md' apps/web/CLAUDE.md
grep -q 'AGENTS.md' apps/api/CLAUDE.md
grep -q 'AGENTS.md' packages/shared/CLAUDE.md
test ! -e .dev
test ! -e .claude/skills
test ! -e .claude/agents
test ! -e .agents/skills
test ! -e .opencode/skills
test ! -e .codex/agents
