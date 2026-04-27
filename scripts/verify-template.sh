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

test -f AGENTS.md
test -f apps/web/AGENTS.md
test -f apps/api/AGENTS.md
test -f packages/shared/AGENTS.md
test "$(wc -c < AGENTS.md)" -le 8192
grep -q 'AGENTS.md' CLAUDE.md
grep -q 'AGENTS.md' apps/web/CLAUDE.md
grep -q 'AGENTS.md' apps/api/CLAUDE.md
grep -q 'AGENTS.md' packages/shared/CLAUDE.md
test -f .dev/.gitkeep
test -f .claude/skills/full-dev-flow/SKILL.md
test -f .claude/skills/full-dev-flow/templates/task-template.md
test -f .claude/skills/full-dev-flow/templates/plan-template.md
test -f .claude/skills/full-dev-flow/templates/contracts-template.md
test -f .claude/skills/full-dev-flow/templates/merge-plan-template.md
test -f .claude/skills/full-dev-flow/scripts/check-state.mjs
grep -q 'name: full-dev-flow' .claude/skills/full-dev-flow/SKILL.md
grep -q 'description:' .claude/skills/full-dev-flow/SKILL.md
for a in contract-author feature-developer test-runner; do
  test -f ".claude/agents/$a.md"
  grep -q 'name:' ".claude/agents/$a.md"
  grep -q 'description:' ".claude/agents/$a.md"
done
test ! -e .agents/skills
test ! -e .opencode/skills
test ! -e .codex/agents
node .claude/skills/full-dev-flow/scripts/check-state.mjs | grep -q '阶段 1'
