# 里程碑 C — `full-dev-flow` Skill 渐进式落地（v0.3.0）

> 对应源计划章节：[dev-plan-full.md §C 节](../dev-plan-full.md)
> 前置：仅依赖 A（v0.1.0）。**不依赖 B**。
>
> 本里程碑不再一次性实现“7 子 Agent + Worktree 编排 + 跨工具兼容”的完整形态，而是拆成 **C1 / C2 / C3** 三个可验收小阶段：先让流程跑起来，再逐步增强并发、恢复、跨工具兼容。

## 当前调整（2026-05-02）

C1 曾经落地过一版 `.claude/skills/full-dev-flow`、`.claude/agents/*` 与 `.dev/.gitkeep`，但为了给后续基于 superpowers 的任务调度方案让路，当前模板已先撤回这些项目级 skill / agent 入口。

本文件下面的 C1/C2/C3 仍作为历史设计与后续重构参考；实际 scaffold 现阶段只保留 `AGENTS.md` 通用项目指引，不再生成 `.claude/skills`、`.claude/agents`、`.dev`、`.agents/skills`、`.opencode/skills` 或 `.codex/agents`。

## 0. 外部规范核查结论（Claude Code / Codex / OpenCode）

本节记录实施前需要遵守的目录结构与兼容性判断。若后续官方文档变化，以实施当日官方文档为准，并在本文件末尾追加复核记录。

### 0.1 Claude Code

Claude Code 对本计划最友好，作为 C 阶段第一优先级。

- 项目级 skill 路径：`.claude/skills/<skill-name>/SKILL.md`。
- `SKILL.md` 需要 YAML frontmatter，至少包含 `name` 与 `description`。
- 项目级 subagent 路径：`.claude/agents/<name>.md`。
- subagent `.md` 需要 YAML frontmatter，`name` 与 `description` 必填。
- `.claude/agents/` 适合提交进 git；Claude Code 会从当前工作目录向上发现项目 subagents。
- 手动新增 subagent 后，可能需要重启 session 或用 `/agents` 重新加载。

因此：

- `.claude/skills/full-dev-flow/SKILL.md` 是 C1 必做。
- `.claude/agents/*.md` 是 C1/C2/C3 的主要 agent 定义来源。
- 若使用 Claude Code 的 subagent worktree 隔离能力，优先使用官方 frontmatter（如 `isolation: worktree`）或在 skill 指令中明确手动创建 git worktree；不要同时混用两套隔离逻辑。

### 0.2 Codex

Codex 对 **AGENTS.md** 与 **skills** 支持明确，但对“项目级多 agent TOML 文件”的目录与字段不能按旧计划直接假定。

- Codex 会读取项目内分层 `AGENTS.md`，适合放仓库规则、运行命令、验收标准、禁止事项。
- Codex skills 使用开放 Agent Skills 结构：`<skill>/SKILL.md`，支持 `scripts/`、`references/`、`assets/` 等可选目录。
- Codex 仓库级 skills 的官方路径是 `.agents/skills`，不是 `.codex/agents`。
- Codex 文档中提到 `.codex/config.toml` 可配置 repo-specific 行为、multi-agent setup、feature flags 等；但本计划中的 `.codex/agents/<name>.toml` 与 `instructions_file = "../../.claude/agents/<name>.md"` **需要实施时再次验证**，不能作为 C1/C2 的硬交付。

因此：

- C1/C2 不强承诺 Codex 多 agent 文件可用。
- 若要让 Codex 发现 `full-dev-flow` skill，C3 应创建 `.agents/skills/full-dev-flow/`，可以复制或 symlink 到 `.claude/skills/full-dev-flow/`。
- `.codex/agents/*.toml` 仅作为 C3 实验性兼容层，实施前必须查官方 schema；若字段名、路径或机制不一致，宁可删除这部分，不要生成无效配置。

### 0.3 OpenCode

OpenCode 对 skills 的兼容性较好，但对 agents 的目录结构与 Claude Code 不同。

- OpenCode project skills 会扫描 `.opencode/skills/<name>/SKILL.md`、`.claude/skills/<name>/SKILL.md`、`.agents/skills/<name>/SKILL.md` 等路径。
- 因此，`full-dev-flow` 放在 `.claude/skills/full-dev-flow/` 时，OpenCode 理论上也可以发现该 skill。
- OpenCode project agents 的官方路径是 `.opencode/agents/`，不是 `.claude/agents/`。
- OpenCode agent markdown frontmatter 与 Claude Code subagent frontmatter 不完全相同，例如 OpenCode 使用 `mode: subagent`、`permission:` 等配置形式；不能直接假设 `.claude/agents/*.md` 原样可被 OpenCode 当作 agent 使用。

因此：

- C1/C2 只保证 Claude Code 原生可用。
- C3 再增加 `.opencode/agents/*.md` 兼容包装，或明确由 B 阶段负责 OpenCode agent mirror。
- 不要把 `.claude/agents/*.md` 写成“Claude/OpenCode 共用”而不加验证说明。

### 0.4 对原计划的修正

原计划中以下说法需要降级：

- “一次性落 7 个子 agent” → 改为 C1 先 3 个，C2 再扩 5 个，C3 最后补齐 7 个。
- “C 不依赖 B 但同时生成 Codex/OpenCode 兼容结构” → 改为 C1/C2 不依赖 B；C3 作为兼容增强，可选择复制/symlink 到 `.agents/skills` 与 `.opencode/agents`。
- “`.codex/agents/*.toml` 直接引用 `.claude/agents/*.md`” → 标记为实验性，必须先验证官方 schema。
- “OpenCode 直接共用 `.claude/agents/*.md`” → 改为：OpenCode skills 可复用 `.claude/skills`；OpenCode agents 需要 `.opencode/agents/` 或单独配置。

---

## 1. 总目标

让生成的项目逐步具备“从需求 + UI 图自动开发整个项目”的 AI 工作流能力：

- 一个 `full-dev-flow` skill，最终支持 4 个 Phase + 3 个人类 checkpoint。
- 从 3 个最小 agent 起步，逐步扩展到 7 个职责互不重叠的子 agent。
- `.dev/` 状态目录支持计划、任务、状态、合并记录与中断恢复。
- Worktree 并发与跨工具兼容放到后续小阶段，避免首轮复杂度过高。

核心原则：

```text
C1 先跑通流程，C2 再引入 worktree 并发，C3 最后补齐 7 agent 与跨工具兼容。
```

---

## 2. 分阶段实施

## C1 — 最小可运行 full-dev-flow（v0.3.0-alpha.1）

### C1.1 目标

先做一个 Claude Code 原生可用的最小工作流：**一个 skill + 3 个 agent + `.dev/` 状态文件约定**。

C1 不追求并发、不追求 7 agent、不追求 Codex/OpenCode 完整兼容。目标是能让 AI 按同一个流程完成一个很小的需求改动。

### C1.2 必做文件

```
templates/default/
├─ .dev/.gitkeep
└─ .claude/
   ├─ skills/full-dev-flow/
   │  ├─ SKILL.md
   │  ├─ templates/
   │  │  ├─ task-template.md
   │  │  ├─ plan-template.md
   │  │  ├─ contracts-template.md
   │  │  └─ merge-plan-template.md
   │  └─ scripts/check-state.mjs
   └─ agents/
      ├─ contract-author.md
      ├─ feature-developer.md
      └─ test-runner.md
```

说明：

- `feature-developer.md` 是 C1 的临时综合 agent，负责后端 + 前端 + 少量 glue code。
- C1 不创建 `backend-developer`、`frontend-page-developer`、`frontend-component-developer` 等细粒度 agent。
- C1 不创建 `.codex/agents/`。
- C1 不创建 `.opencode/agents/`。
- C1 不创建 `.agents/skills/` mirror。

### C1.3 Skill 流程

`SKILL.md` 只实现简版 3 Phase：

```text
Phase 1: 需求理解
  - 读取用户需求
  - 必要时 AskUserQuestion 澄清
  - 产出 .dev/plan.md
  - checkpoint 1：等待人类确认

Phase 2: 任务拆分
  - 产出 .dev/tasks/contracts.md
  - 产出 1~3 个 task 文件
  - 产出 .dev/merge-plan.md
  - checkpoint 2：等待人类确认

Phase 3: 串行实现与验证
  - contract-author 先改 shared schema / OpenAPI
  - feature-developer 串行改后端与前端
  - test-runner 执行 typecheck / lint / test / build
  - 写 .dev/state.json
  - checkpoint 3：输出最终验收结果
```

C1 禁止自动创建 git worktree，所有修改都在主工作区进行。若需要隔离，交给人类手动开新分支。

### C1.4 `.dev/` 目录约定

C1 运行后可以生成：

```
.dev/
├─ state.json
├─ plan.md
├─ flow.mmd
├─ tasks/
│  ├─ contracts.md
│  └─ task-p0-01-*.md
└─ merge-plan.md
```

C1 的 `state.json` 格式：

```json
{
  "phase": 1,
  "wave": "P0",
  "last_activity": "2026-04-26T10:30:00Z",
  "running_tasks": [],
  "completed_tasks": [],
  "checkpoints": { "1": "pending", "2": "pending", "3": "pending" }
}
```

C1 的 `check-state.mjs` 只做轻量检查：

- 如果 `.dev/state.json` 不存在：提示从 Phase 1 开始。
- 如果存在且 checkpoint 未完成：提示当前 phase/wave，并要求 AI 询问人类是继续、重开还是放弃。
- 不处理 worktree。
- 不处理冲突报告。

### C1.5 不做什么

- ❌ 不做 7 agent。
- ❌ 不做 worktree 并发。
- ❌ 不做 merge-orchestrator。
- ❌ 不做 visual-qa。
- ❌ 不做 Codex/OpenCode agent 兼容。
- ❌ 不修改 A 阶段业务代码和依赖版本表。

### C1.6 验收标准

静态：

- [ ] `full-dev-flow/SKILL.md` 存在，frontmatter 含 `name: full-dev-flow` 与 `description`。
- [ ] 3 个 agent 文件存在：`contract-author.md`、`feature-developer.md`、`test-runner.md`。
- [ ] 4 个模板文件存在：`task-template.md`、`plan-template.md`、`contracts-template.md`、`merge-plan-template.md`。
- [ ] `check-state.mjs` 存在且可被 `node` 执行。
- [ ] `.dev/.gitkeep` 存在。

动态：

用最小需求走通：

```text
给 items 增加一个 tag 字段，并在前端列表显示。
```

- [ ] Phase 1 产出 `.dev/plan.md` 并暂停确认。
- [ ] Phase 2 产出 `.dev/tasks/*` 与 `.dev/merge-plan.md` 并暂停确认。
- [ ] Phase 3 串行修改 shared / api / web。
- [ ] 修改后能跑通 A 阶段回归：`pnpm install / typecheck / lint / test / build`。

---

## C2 — Worktree 编排 + 5 Agent 拆分（v0.3.0-alpha.2）

### C2.1 目标

在 C1 已能串行跑通后，引入更真实的协作模式：**worktree 隔离 + 5 个 agent + merge-orchestrator**。

C2 仍然只优先保证 Claude Code 原生可用，不强行做 Codex/OpenCode agent 兼容。

### C2.2 新增 / 调整文件

在 C1 基础上调整 `.claude/agents/`：

```
templates/default/.claude/agents/
├─ contract-author.md
├─ backend-developer.md
├─ frontend-developer.md
├─ test-runner.md
└─ merge-orchestrator.md
```

处理方式：

- `feature-developer.md` 在 C2 可删除，或保留但标记为 legacy / simple mode。
- `backend-developer.md` 专注 `apps/api/**`。
- `frontend-developer.md` 专注 `apps/web/**`。
- `merge-orchestrator.md` 负责读取 `.dev/worktrees.log` 与 `.dev/merge-plan.md`，串行合并。

C2 需要扩展：

```
.dev/
├─ worktrees.log
└─ conflicts/
```

### C2.3 Worktree 编排规则

Worktree 命名：

```text
../<project>.wt/<wave>-<short-task-name>
```

`worktrees.log` YAML schema：

```yaml
- task_id: task-p0-02-items-backend
  branch: feat/p0/items-backend
  worktree_path: ../<project>.wt/p0-items-backend
  agent: backend-developer
  started_at: 2026-04-26T10:00:00Z
  status: running
  commits: []
  notes: ""
```

C2 合并顺序：

```text
contract-author → backend-developer → frontend-developer → test-runner → merge-orchestrator
```

冲突协议：

- 不自动强解冲突。
- 冲突写入 `.dev/conflicts/<task>.md`。
- `merge-orchestrator` 停止后续合并，等待人类处理。

### C2.4 状态恢复

C2 的 `check-state.mjs` 需要升级：

- 读取 `.dev/state.json`。
- 读取 `.dev/worktrees.log`。
- 检查 `running` / `failed` / `blocked` 任务。
- 输出当前状态摘要。
- 让 AI 对人类发起选择：继续、放弃某个 worktree、重启某个 task。

### C2.5 不做什么

- ❌ 不做 7 agent 完整拆分。
- ❌ 不做 visual-qa 具体实现。
- ❌ 不做 Playwright CLI。
- ❌ 不强行生成 `.codex/agents/*.toml`。
- ❌ 不强行生成 `.opencode/agents/*.md`。

### C2.6 验收标准

- [ ] 5 个 agent 文件存在并包含 frontmatter。
- [ ] `backend-developer` 与 `frontend-developer` 的文件归属互不重叠。
- [ ] skill 能为 backend/frontend task 创建独立 worktree。
- [ ] `worktrees.log` 能记录 task、branch、path、agent、status。
- [ ] `merge-orchestrator` 能按 `merge-plan.md` 串行合并。
- [ ] 合并后能清理 worktree。
- [ ] 冲突时能生成 `.dev/conflicts/<task>.md`，并停止后续合并。
- [ ] 强行中断后，重启 skill 能识别未完成任务。
- [ ] 跑完后仍能通过 A 阶段回归命令。

---

## C3 — 7 Agent 完整形态 + 跨工具兼容层（v0.3.0）

### C3.1 目标

在 C2 已稳定后，再补齐原计划中的完整形态：

- 7 个职责更细的 agent。
- `visual-qa` 先占位，具体 Playwright 实现留给 D。
- Codex / OpenCode 兼容文件按官方规范补充，但不得影响 Claude Code 主路径。

### C3.2 7 个 agent

最终 `.claude/agents/`：

```
templates/default/.claude/agents/
├─ contract-author.md
├─ backend-developer.md
├─ frontend-component-developer.md
├─ frontend-page-developer.md
├─ test-runner.md
├─ visual-qa.md
└─ merge-orchestrator.md
```

职责：

| Agent | 模式 | 并发上限 | 职责 |
|---|---:|---:|---|
| `contract-author` | 串行 | 1 | 写 `packages/shared/**` 与 OpenAPI 注册 |
| `backend-developer` | 并发 | 2 | 每个后端模块一个实例，写 `apps/api/src/routes/<module>.ts` 等 |
| `frontend-component-developer` | 串行 | 1 | 写 `apps/web/src/components/shared/**` |
| `frontend-page-developer` | 并发 | 3 | 每个页面一个实例，写 `apps/web/src/features/<page>/**` |
| `test-runner` | 按需 | 不限 | 跑 typecheck / lint / test / build，回写 task 状态 |
| `visual-qa` | 串行 | 1 | C3 只占位；D 阶段接入 Playwright CLI |
| `merge-orchestrator` | 串行 | 1 | 按 `.dev/merge-plan.md` 合并 worktrees |

### C3.3 文件归属表

`merge-plan.md` 必须包含防撞文件归属表：

```text
packages/shared/**                        → contract-author（独占）
apps/api/src/routes/<name>.ts             → backend-developer:<name>（独占）
apps/api/src/app.ts                       → contract-author 一次性写好路由注册占位
apps/web/src/routes.tsx                   → frontend-page-developer:routes-skeleton（独占首波）
apps/web/src/components/shared/**         → frontend-component-developer
apps/web/src/features/<name>/**           → frontend-page-developer:<name>（独占）
apps/web/src/lib/api/**                   → contract-author + 第一个 frontend agent，后续只读
```

若某个需求太小，不需要拆 7 agent，skill 应允许降级为 C1 simple mode 或 C2 5-agent mode。

### C3.4 Codex 兼容层

Codex 兼容以 **skills + AGENTS.md** 为主，不以未经验证的 `.codex/agents/*.toml` 为主。

C3 可选新增：

```
templates/default/.agents/skills/full-dev-flow/
└─ SKILL.md  -> 复制或 symlink 到 ../../.claude/skills/full-dev-flow/SKILL.md
```

注意：

- 若使用 symlink，scaffold 要考虑 Windows fallback 为复制。
- Codex skills 的 `SKILL.md` frontmatter 必须含 `name` 与 `description`。
- Codex 初始 skills 列表有上下文预算限制，`description` 必须短、清晰、触发词前置。
- `.codex/agents/*.toml` 若继续保留，必须先查官方 schema；否则不生成。

### C3.5 OpenCode 兼容层

OpenCode skill 兼容可复用 `.claude/skills/full-dev-flow/`，因为 OpenCode 会扫描项目 `.claude/skills`。

若要让 OpenCode 也有项目级 agents，需要新增：

```
templates/default/.opencode/agents/
├─ contract-author.md
├─ backend-developer.md
├─ frontend-component-developer.md
├─ frontend-page-developer.md
├─ test-runner.md
├─ visual-qa.md
└─ merge-orchestrator.md
```

注意：

- OpenCode agent markdown 的 frontmatter 要使用 OpenCode 格式，例如 `description`、`mode: subagent`、`permission:`。
- 不要直接 symlink `.claude/agents/*.md`，除非确认 frontmatter 兼容。
- 可以让 OpenCode agent 文件只做轻量 wrapper，正文引用 `.claude/agents/<name>.md` 的职责说明，但 frontmatter 必须符合 OpenCode。

### C3.6 不做什么

- ❌ 不在 C3 实现 Playwright 视觉验收细节（留给 D）。
- ❌ 不在未验证 schema 的情况下生成 `.codex/agents/*.toml`。
- ❌ 不要求所有工具能力完全等价；Claude Code 是主路径，Codex/OpenCode 是兼容增强。
- ❌ 不做自动 git push / open PR。

### C3.7 验收标准

- [ ] 7 个 Claude Code agent 文件存在，frontmatter 合法。
- [ ] `full-dev-flow` skill 能根据任务规模选择 simple / 5-agent / 7-agent 模式。
- [ ] C2 的 worktree / merge / recovery 能在 7-agent 模式下继续工作。
- [ ] `.agents/skills/full-dev-flow` 存在或由 scaffold 创建 mirror，Codex 可发现 skill。
- [ ] 如生成 `.opencode/agents/*.md`，其 frontmatter 使用 OpenCode 格式。
- [ ] 如生成 `.codex/agents/*.toml`，必须在文档中写明官方 schema 来源与验证日期。
- [ ] 跑完后仍能通过 A 阶段全部回归。

---

## 3. 不做什么（整个 C 阶段）

- ❌ 不集成 `@playwright/cli`（→ D）。
- ❌ 不实现 `visual-qa.md` 的具体视觉验收逻辑（C3 只占位，→ D）。
- ❌ 不修改 A 阶段业务代码 / demo。
- ❌ 不修改依赖版本表。
- ❌ 不在 skill 里嵌入对外网 API（如 LLM 服务）的硬编码 endpoint。
- ❌ 不实现全自动 git push / open PR；合并到本地 main 即终止，远程操作交人类。

---

## 4. 回归测试

在 A/B 的 `scripts/verify-template.sh` 末尾分阶段追加静态结构断言。

### C1 静态断言

```bash
test -f .claude/skills/full-dev-flow/SKILL.md
test -f .claude/skills/full-dev-flow/templates/task-template.md
test -f .claude/skills/full-dev-flow/templates/plan-template.md
test -f .claude/skills/full-dev-flow/templates/contracts-template.md
test -f .claude/skills/full-dev-flow/templates/merge-plan-template.md
test -f .claude/skills/full-dev-flow/scripts/check-state.mjs
for a in contract-author feature-developer test-runner; do
  test -f .claude/agents/$a.md
  grep -q "name:" .claude/agents/$a.md
  grep -q "description:" .claude/agents/$a.md
done
test -f .dev/.gitkeep
```

### C2 静态断言

```bash
for a in contract-author backend-developer frontend-developer test-runner merge-orchestrator; do
  test -f .claude/agents/$a.md
  grep -q "name:" .claude/agents/$a.md
  grep -q "description:" .claude/agents/$a.md
done
```

### C3 静态断言

```bash
for a in contract-author backend-developer frontend-component-developer \
         frontend-page-developer test-runner visual-qa merge-orchestrator; do
  test -f .claude/agents/$a.md
  grep -q "name:" .claude/agents/$a.md
  grep -q "description:" .claude/agents/$a.md
done

# Codex skill mirror，若 C3 启用
if [ -d .agents/skills/full-dev-flow ]; then
  test -f .agents/skills/full-dev-flow/SKILL.md
fi

# OpenCode agents，若 C3 启用
if [ -d .opencode/agents ]; then
  for a in contract-author backend-developer frontend-component-developer \
           frontend-page-developer test-runner visual-qa merge-orchestrator; do
    test -f .opencode/agents/$a.md
    grep -q "mode: subagent" .opencode/agents/$a.md
  done
fi
```

动态 4-Phase 流程、中断恢复、worktree 合并不进自动 CI，改为发版前由维护者手动跑 mini 需求做 release gate。

---

## 5. Release Gate

### C1 Release Gate

- [ ] 用 `给 items 增加 tag 字段` 走通 simple mode。
- [ ] 生成 `.dev/plan.md`、`.dev/tasks/*`、`.dev/merge-plan.md`、`.dev/state.json`。
- [ ] 跑通 `pnpm install / typecheck / lint / test / build`。

### C2 Release Gate

- [ ] 用同一 mini 需求走 worktree 模式。
- [ ] 至少创建 backend/frontend 两个 worktree。
- [ ] `merge-orchestrator` 能合并并清理 worktree。
- [ ] 中断后重启能识别未完成任务。

### C3 Release Gate

- [ ] 用一个稍复杂需求触发 7-agent 模式，例如：新增 `categories` 模块，包含 schema、CRUD API、列表页、表单组件。
- [ ] 文件归属无交叉修改。
- [ ] Codex 能发现 `.agents/skills/full-dev-flow`（若启用）。
- [ ] OpenCode 能发现 `.claude/skills/full-dev-flow`；若启用 `.opencode/agents`，能列出项目 agents。

---

## 6. 交付物

### C1 交付物

- `full-dev-flow` skill 最小版。
- 3 个 Claude Code agent。
- `.dev/.gitkeep`。
- `check-state.mjs` 简版。
- `scripts/verify-template.sh` C1 静态断言。
- `docs/release-gate-c.md` 初版。

### C2 交付物

- 5 个 Claude Code agent。
- worktree 编排说明。
- `worktrees.log` schema。
- `merge-orchestrator` 行为规范。
- `check-state.mjs` 恢复逻辑升级。
- `scripts/verify-template.sh` C2 静态断言。

### C3 交付物

- 7 个 Claude Code agent 完整版。
- Codex skill mirror（`.agents/skills/full-dev-flow`，复制或 symlink）。
- 可选 OpenCode agent wrappers（`.opencode/agents/*.md`）。
- 如保留 `.codex/agents/*.toml`，必须附官方 schema 验证记录；否则不生成。
- `scripts/verify-template.sh` C3 静态断言。
- 升级 CLI 版本到 `0.3.0`，发布到 npm。

---

## 7. 风险与确认点

- **Codex agent TOML 风险**：原计划的 `.codex/agents/<name>.toml` 与 `instructions_file` 字段不得直接落地；实施时先查官方 schema。无法确认时删除该设计，仅保留 `.agents/skills` + `AGENTS.md`。
- **OpenCode agent 路径风险**：OpenCode skills 可读 `.claude/skills`，但 project agents 应放 `.opencode/agents/`，且 frontmatter 不同；不要直接宣称 `.claude/agents` 可被 OpenCode 当作 agent 使用。
- **Claude Code subagent 加载时机**：手动新增 `.claude/agents/*.md` 后可能需要重启 session 或 `/agents` 重新加载。
- **Worktree 双重隔离风险**：如果使用 Claude Code subagent frontmatter 的 `isolation: worktree`，就不要再让 skill 手动创建一套 git worktree；二选一，避免路径和分支混乱。
- **并发过度风险**：小需求默认使用 C1 simple mode；只有模块数足够多时才启用 C2/C3 并发。
- **visual-qa 风险**：C3 只占位，真正视觉验收留给 D，避免 C 阶段被 Playwright CLI 复杂度拖住。
- **跨平台 symlink 风险**：C3 若创建 `.agents/skills` mirror，Mac/Linux 可 symlink，Windows fallback 为复制。
# 里程碑 C — `full-dev-flow` Skill 渐进式落地（v0.3.0）

> 对应源计划章节：[dev-plan-full.md §C 节](../dev-plan-full.md)
> 前置：仅依赖 A（v0.1.0）。**不依赖 B**。
>
> 本里程碑不再一次性实现“7 子 Agent + Worktree 编排 + 跨工具兼容”的完整形态，而是拆成 **C1 / C2 / C3** 三个可验收小阶段：先让流程跑起来，再逐步增强并发、恢复、跨工具兼容。

## 0. 外部规范核查结论（Claude Code / Codex / OpenCode）

本节记录实施前需要遵守的目录结构与兼容性判断。若后续官方文档变化，以实施当日官方文档为准，并在本文件末尾追加复核记录。

### 0.1 Claude Code

Claude Code 作为 C 阶段的第一主路径。

- 项目级 skill 路径：`.claude/skills/<skill-name>/SKILL.md`。
- `SKILL.md` 需要 YAML frontmatter，至少包含 `name` 与 `description`。
- 项目级 subagent 路径：`.claude/agents/<name>.md`。
- subagent `.md` 需要 YAML frontmatter，通常至少包含 `name` 与 `description`。
- `.claude/agents/` 适合提交进 git；Claude Code 会从当前工作目录向上发现项目 subagents。
- 手动新增 subagent 后，可能需要重启 session 或用 `/agents` 重新加载。

因此：

- `.claude/skills/full-dev-flow/SKILL.md` 是 C1 必做。
- `.claude/agents/*.md` 是 C1/C2/C3 的 Claude Code agent 定义来源。
- 若使用 Claude Code 的 subagent worktree 隔离能力，优先使用官方 frontmatter 或在 skill 指令中明确手动创建 git worktree；不要同时混用两套隔离逻辑。

### 0.2 Codex

Codex 对项目级 subagents 的支持是明确的，原计划中“`.codex/agents/*.toml` 需要再验证是否存在”这一点应修正。

- 当前 Codex releases 默认启用 subagent workflows。
- Codex 只会在用户明确要求时 spawn subagents；子 agent 会消耗额外 token。
- Codex app 和 CLI 当前能展示 subagent activity；IDE Extension 的可见性仍在推进中。
- 自定义 Codex agents 路径：
  - 全局：`~/.codex/agents/*.toml`
  - 项目级：`.codex/agents/*.toml`
- 每个 TOML 文件定义一个 custom agent。
- Codex custom agent 必填字段：
  - `name`
  - `description`
  - `developer_instructions`
- 可选字段包括：`nickname_candidates`、`model`、`model_reasoning_effort`、`sandbox_mode`、`mcp_servers`、`skills.config` 等。
- Codex 以 TOML 内的 `name` 字段识别 agent；文件名与 `name` 保持一致只是推荐约定。
- Global subagent settings 仍放在 `[agents]` 下，例如 `agents.max_threads`、`agents.max_depth`、`agents.job_max_runtime_seconds`。
- `agents.max_threads` 默认 6；`agents.max_depth` 默认 1，允许直接 child agent，但避免更深层递归 fan-out。

因此：

- C1/C2 仍可以只优先保证 Claude Code，避免第一轮复杂度过高。
- C3 可以正式生成 `.codex/agents/*.toml`，但不能使用旧计划里的 `instructions_file` 字段。
- `.codex/agents/*.toml` 必须写入完整 `developer_instructions`，或由生成脚本从 `.claude/agents/*.md` 同步内容后展开为 TOML 多行字符串。
- 若要减少重复维护，可以把 `.claude/agents/*.md` 作为“人类可读事实源”，在 scaffold 或维护脚本中生成 `.codex/agents/*.toml`；但最终落到项目里的 TOML 必须是 Codex 可直接读取的完整配置。
- Codex skills 仍走 `.agents/skills/<skill-name>/SKILL.md`；这和 Codex subagents 是两个不同机制，不要混淆。

### 0.3 OpenCode

OpenCode agent 配置理解基本正确，但需要明确它和 Claude Code / Codex 的 agent 文件不可直接共用。

- OpenCode 有两类 agent：`primary` 和 `subagent`。
- 子代理可以由主代理根据描述自动调用，也可以由用户通过 `@` 手动调用。
- OpenCode 可在 `opencode.json` 中配置 agents。
- OpenCode 也支持 Markdown agent 文件：
  - 全局：`~/.config/opencode/agents/`
  - 项目级：`.opencode/agents/`
- Markdown 文件名就是 agent 名称，例如 `.opencode/agents/review.md` 创建 `review` agent。
- OpenCode agent markdown frontmatter 至少需要 `description`；如果希望作为子代理，应设置 `mode: subagent`。
- OpenCode 支持 `tools`、`permission`、`steps`、`model`、`temperature`、`prompt` 等配置。
- `prompt: "{file:./prompts/code-review.txt}"` 这类文件引用路径相对于配置文件所在位置。

因此：

- OpenCode project agents 应放 `.opencode/agents/*.md`，不是 `.claude/agents/*.md`。
- 不要直接 symlink `.claude/agents/*.md` 到 `.opencode/agents/*.md`，除非确认 frontmatter 兼容。
- 更稳的方案是：C3 生成 OpenCode 专用 wrapper 文件，frontmatter 使用 OpenCode 格式，正文复用或同步 `.claude/agents/<name>.md` 的职责说明。
- OpenCode skills 的兼容路径和 agents 是两回事；即使 OpenCode 能发现 `.claude/skills`，也不代表它会把 `.claude/agents` 当作 project agents。

### 0.4 对原计划的修正

原计划中以下说法需要调整：

- “一次性落 7 个子 agent” → 改为 C1 先 3 个，C2 再扩 5 个，C3 最后补齐 7 个。
- “C 不依赖 B 但同时生成所有跨工具兼容结构” → 改为 C1/C2 不依赖 B；C3 再补齐 Codex/OpenCode 兼容层。
- “`.codex/agents/*.toml` 用 `instructions_file = "../../.claude/agents/<name>.md"` 引用同一份提示词” → 改为：Codex TOML 必须写 `developer_instructions`；若要单一事实源，用脚本把 `.claude/agents/*.md` 展开进 TOML。
- “OpenCode 直接共用 `.claude/agents/*.md`” → 改为：OpenCode skills 可复用 `.claude/skills`；OpenCode agents 需要 `.opencode/agents/*.md` 或 `opencode.json` 配置。

---

## 1. 总目标

让生成的项目逐步具备“从需求 + UI 图自动开发整个项目”的 AI 工作流能力：

- 一个 `full-dev-flow` skill，最终支持 4 个 Phase + 3 个人类 checkpoint。
- 从 3 个最小 agent 起步，逐步扩展到 7 个职责互不重叠的子 agent。
- `.dev/` 状态目录支持计划、任务、状态、合并记录与中断恢复。
- Worktree 并发与跨工具兼容放到后续小阶段，避免首轮复杂度过高。

核心原则：

```text
C1 先跑通流程，C2 再引入 worktree 并发，C3 最后补齐 7 agent 与跨工具兼容。
```

---

## 2. 分阶段实施

## C1 — 最小可运行 full-dev-flow（v0.3.0-alpha.1）

### C1.1 目标

先做一个 Claude Code 原生可用的最小工作流：**一个 skill + 3 个 agent + `.dev/` 状态文件约定**。

C1 不追求并发、不追求 7 agent、不追求 Codex/OpenCode 完整兼容。目标是能让 AI 按同一个流程完成一个很小的需求改动。

### C1.2 必做文件

```
templates/default/
├─ .dev/.gitkeep
└─ .claude/
   ├─ skills/full-dev-flow/
   │  ├─ SKILL.md
   │  ├─ templates/
   │  │  ├─ task-template.md
   │  │  ├─ plan-template.md
   │  │  ├─ contracts-template.md
   │  │  └─ merge-plan-template.md
   │  └─ scripts/check-state.mjs
   └─ agents/
      ├─ contract-author.md
      ├─ feature-developer.md
      └─ test-runner.md
```

说明：

- `feature-developer.md` 是 C1 的临时综合 agent，负责后端 + 前端 + 少量 glue code。
- C1 不创建 `backend-developer`、`frontend-page-developer`、`frontend-component-developer` 等细粒度 agent。
- C1 不创建 `.codex/agents/`。
- C1 不创建 `.opencode/agents/`。
- C1 不创建 `.agents/skills/` mirror。

### C1.3 Skill 流程

`SKILL.md` 只实现简版 3 Phase：

```text
Phase 1: 需求理解
  - 读取用户需求
  - 必要时 AskUserQuestion 澄清
  - 产出 .dev/plan.md
  - checkpoint 1：等待人类确认

Phase 2: 任务拆分
  - 产出 .dev/tasks/contracts.md
  - 产出 1~3 个 task 文件
  - 产出 .dev/merge-plan.md
  - checkpoint 2：等待人类确认

Phase 3: 串行实现与验证
  - contract-author 先改 shared schema / OpenAPI
  - feature-developer 串行改后端与前端
  - test-runner 执行 typecheck / lint / test / build
  - 写 .dev/state.json
  - checkpoint 3：输出最终验收结果
```

C1 禁止自动创建 git worktree，所有修改都在主工作区进行。若需要隔离，交给人类手动开新分支。

### C1.4 `.dev/` 目录约定

C1 运行后可以生成：

```
.dev/
├─ state.json
├─ plan.md
├─ flow.mmd
├─ tasks/
│  ├─ contracts.md
│  └─ task-p0-01-*.md
└─ merge-plan.md
```

C1 的 `state.json` 格式：

```json
{
  "phase": 1,
  "wave": "P0",
  "last_activity": "2026-04-26T10:30:00Z",
  "running_tasks": [],
  "completed_tasks": [],
  "checkpoints": { "1": "pending", "2": "pending", "3": "pending" }
}
```

C1 的 `check-state.mjs` 只做轻量检查：

- 如果 `.dev/state.json` 不存在：提示从 Phase 1 开始。
- 如果存在且 checkpoint 未完成：提示当前 phase/wave，并要求 AI 询问人类是继续、重开还是放弃。
- 不处理 worktree。
- 不处理冲突报告。

### C1.5 不做什么

- ❌ 不做 7 agent。
- ❌ 不做 worktree 并发。
- ❌ 不做 merge-orchestrator。
- ❌ 不做 visual-qa。
- ❌ 不做 Codex/OpenCode agent 兼容。
- ❌ 不修改 A 阶段业务代码和依赖版本表。

### C1.6 验收标准

静态：

- [ ] `full-dev-flow/SKILL.md` 存在，frontmatter 含 `name: full-dev-flow` 与 `description`。
- [ ] 3 个 agent 文件存在：`contract-author.md`、`feature-developer.md`、`test-runner.md`。
- [ ] 4 个模板文件存在：`task-template.md`、`plan-template.md`、`contracts-template.md`、`merge-plan-template.md`。
- [ ] `check-state.mjs` 存在且可被 `node` 执行。
- [ ] `.dev/.gitkeep` 存在。

动态：

用最小需求走通：

```text
给 items 增加一个 tag 字段，并在前端列表显示。
```

- [ ] Phase 1 产出 `.dev/plan.md` 并暂停确认。
- [ ] Phase 2 产出 `.dev/tasks/*` 与 `.dev/merge-plan.md` 并暂停确认。
- [ ] Phase 3 串行修改 shared / api / web。
- [ ] 修改后能跑通 A 阶段回归：`pnpm install / typecheck / lint / test / build`。

---

## C2 — Worktree 编排 + 5 Agent 拆分（v0.3.0-alpha.2）

### C2.1 目标

在 C1 已能串行跑通后，引入更真实的协作模式：**worktree 隔离 + 5 个 agent + merge-orchestrator**。

C2 仍然只优先保证 Claude Code 原生可用，不强行做 Codex/OpenCode agent 兼容。

### C2.2 新增 / 调整文件

在 C1 基础上调整 `.claude/agents/`：

```
templates/default/.claude/agents/
├─ contract-author.md
├─ backend-developer.md
├─ frontend-developer.md
├─ test-runner.md
└─ merge-orchestrator.md
```

处理方式：

- `feature-developer.md` 在 C2 可删除，或保留但标记为 legacy / simple mode。
- `backend-developer.md` 专注 `apps/api/**`。
- `frontend-developer.md` 专注 `apps/web/**`。
- `merge-orchestrator.md` 负责读取 `.dev/worktrees.log` 与 `.dev/merge-plan.md`，串行合并。

C2 需要扩展：

```
.dev/
├─ worktrees.log
└─ conflicts/
```

### C2.3 Worktree 编排规则

Worktree 命名：

```text
../<project>.wt/<wave>-<short-task-name>
```

`worktrees.log` YAML schema：

```yaml
- task_id: task-p0-02-items-backend
  branch: feat/p0/items-backend
  worktree_path: ../<project>.wt/p0-items-backend
  agent: backend-developer
  started_at: 2026-04-26T10:00:00Z
  status: running
  commits: []
  notes: ""
```

C2 合并顺序：

```text
contract-author → backend-developer → frontend-developer → test-runner → merge-orchestrator
```

冲突协议：

- 不自动强解冲突。
- 冲突写入 `.dev/conflicts/<task>.md`。
- `merge-orchestrator` 停止后续合并，等待人类处理。

### C2.4 状态恢复

C2 的 `check-state.mjs` 需要升级：

- 读取 `.dev/state.json`。
- 读取 `.dev/worktrees.log`。
- 检查 `running` / `failed` / `blocked` 任务。
- 输出当前状态摘要。
- 让 AI 对人类发起选择：继续、放弃某个 worktree、重启某个 task。

### C2.5 不做什么

- ❌ 不做 7 agent 完整拆分。
- ❌ 不做 visual-qa 具体实现。
- ❌ 不做 Playwright CLI。
- ❌ 不生成 `.codex/agents/*.toml`。
- ❌ 不生成 `.opencode/agents/*.md`。

### C2.6 验收标准

- [ ] 5 个 Claude Code agent 文件存在并包含 frontmatter。
- [ ] `backend-developer` 与 `frontend-developer` 的文件归属互不重叠。
- [ ] skill 能为 backend/frontend task 创建独立 worktree。
- [ ] `worktrees.log` 能记录 task、branch、path、agent、status。
- [ ] `merge-orchestrator` 能按 `merge-plan.md` 串行合并。
- [ ] 合并后能清理 worktree。
- [ ] 冲突时能生成 `.dev/conflicts/<task>.md`，并停止后续合并。
- [ ] 强行中断后，重启 skill 能识别未完成任务。
- [ ] 跑完后仍能通过 A 阶段回归命令。

---

## C3 — 7 Agent 完整形态 + Codex/OpenCode 兼容层（v0.3.0）

### C3.1 目标

在 C2 已稳定后，再补齐原计划中的完整形态：

- 7 个职责更细的 Claude Code agents。
- 7 个项目级 Codex agents（`.codex/agents/*.toml`）。
- 可选 OpenCode project agent wrappers（`.opencode/agents/*.md`）。
- `visual-qa` 先占位，具体 Playwright 实现留给 D。

### C3.2 Claude Code 7 agents

最终 `.claude/agents/`：

```
templates/default/.claude/agents/
├─ contract-author.md
├─ backend-developer.md
├─ frontend-component-developer.md
├─ frontend-page-developer.md
├─ test-runner.md
├─ visual-qa.md
└─ merge-orchestrator.md
```

职责：

| Agent | 模式 | 并发上限 | 职责 |
|---|---:|---:|---|
| `contract-author` | 串行 | 1 | 写 `packages/shared/**` 与 OpenAPI 注册 |
| `backend-developer` | 并发 | 2 | 每个后端模块一个实例，写 `apps/api/src/routes/<module>.ts` 等 |
| `frontend-component-developer` | 串行 | 1 | 写 `apps/web/src/components/shared/**` |
| `frontend-page-developer` | 并发 | 3 | 每个页面一个实例，写 `apps/web/src/features/<page>/**` |
| `test-runner` | 按需 | 不限 | 跑 typecheck / lint / test / build，回写 task 状态 |
| `visual-qa` | 串行 | 1 | C3 只占位；D 阶段接入 Playwright CLI |
| `merge-orchestrator` | 串行 | 1 | 按 `.dev/merge-plan.md` 合并 worktrees |

### C3.3 Codex 7 agents

C3 正式新增项目级 Codex agents：

```
templates/default/.codex/agents/
├─ contract-author.toml
├─ backend-developer.toml
├─ frontend-component-developer.toml
├─ frontend-page-developer.toml
├─ test-runner.toml
├─ visual-qa.toml
└─ merge-orchestrator.toml
```

每个 TOML 必须至少包含：

```toml
name = "backend-developer"
description = "Implement one backend module following AGENTS.md and the generated task file."
model_reasoning_effort = "high"
developer_instructions = """
...完整 agent 指令...
"""
```

注意：

- 不使用 `instructions_file`。
- `developer_instructions` 必须是 Codex 可直接读取的完整指令。
- 可以保留 `.claude/agents/*.md` 为人类可读事实源，但需要通过维护脚本或 scaffold 逻辑把内容同步展开到 `.codex/agents/*.toml`。
- `sandbox_mode` 只在确有必要时设置；否则继承父会话配置。
- `test-runner`、`visual-qa`、`merge-orchestrator` 若需要读多写少，可以在 TOML 中显式降低权限或使用更保守 sandbox。
- 不要覆盖内置 agent 名称 `default`、`worker`、`explorer`，避免自定义 agent 抢占内置名称。

### C3.4 OpenCode project agents

OpenCode agent 兼容通过专用 Markdown wrappers 实现：

```
templates/default/.opencode/agents/
├─ contract-author.md
├─ backend-developer.md
├─ frontend-component-developer.md
├─ frontend-page-developer.md
├─ test-runner.md
├─ visual-qa.md
└─ merge-orchestrator.md
```

OpenCode wrapper 示例：

```markdown
---
description: Implement one backend module following AGENTS.md and the generated task file.
mode: subagent
tools:
  write: true
  edit: true
  bash: true
---

你是 backend-developer。职责、文件归属和禁止事项以 `.claude/agents/backend-developer.md` 的正文为准；如两边冲突，以本文件 frontmatter 的 OpenCode 权限配置为准。
```

注意：

- OpenCode Markdown 文件名就是 agent 名称。
- `description` 是必需配置。
- 作为子代理时必须设置 `mode: subagent`。
- 不直接 symlink `.claude/agents/*.md`，因为两边 frontmatter 格式不完全一致。
- 如果后续维护成本太高，可以只保留 OpenCode wrappers，不复制完整长提示词；但 wrappers 必须清楚指向 `.claude/agents/*.md` 或 AGENTS.md 中的职责定义。

### C3.5 文件归属表

`merge-plan.md` 必须包含防撞文件归属表：

```text
packages/shared/**                        → contract-author（独占）
apps/api/src/routes/<name>.ts             → backend-developer:<name>（独占）
apps/api/src/app.ts                       → contract-author 一次性写好路由注册占位
apps/web/src/routes.tsx                   → frontend-page-developer:routes-skeleton（独占首波）
apps/web/src/components/shared/**         → frontend-component-developer
apps/web/src/features/<name>/**           → frontend-page-developer:<name>（独占）
apps/web/src/lib/api/**                   → contract-author + 第一个 frontend agent，后续只读
```

若某个需求太小，不需要拆 7 agent，skill 应允许降级为 C1 simple mode 或 C2 5-agent mode。

### C3.6 Codex skill mirror（可选）

Codex subagents 与 Codex skills 是两个机制。若 B 阶段未做 skill mirror，而 C3 希望 Codex 也能发现 `full-dev-flow` skill，可选新增：

```
templates/default/.agents/skills/full-dev-flow/
└─ SKILL.md  -> 复制或 symlink 到 ../../.claude/skills/full-dev-flow/SKILL.md
```

注意：

- 若使用 symlink，scaffold 要考虑 Windows fallback 为复制。
- Codex skills 的 `SKILL.md` frontmatter 必须含 `name` 与 `description`。
- 这只是让 Codex 发现 skill，不等于让 Codex 发现 subagents；subagents 仍来自 `.codex/agents/*.toml`。

### C3.7 不做什么

- ❌ 不在 C3 实现 Playwright 视觉验收细节（留给 D）。
- ❌ 不使用 `instructions_file` 这类非 Codex subagent schema 字段。
- ❌ 不要求所有工具能力完全等价；Claude Code 是主路径，Codex/OpenCode 是兼容增强。
- ❌ 不做自动 git push / open PR。

### C3.8 验收标准

- [ ] 7 个 Claude Code agent 文件存在，frontmatter 合法。
- [ ] 7 个 Codex TOML 文件存在，且每个都包含 `name`、`description`、`developer_instructions`。
- [ ] Codex TOML 不包含 `instructions_file`。
- [ ] 7 个 OpenCode wrapper 文件存在，且每个都包含 `description` 与 `mode: subagent`。
- [ ] `full-dev-flow` skill 能根据任务规模选择 simple / 5-agent / 7-agent 模式。
- [ ] C2 的 worktree / merge / recovery 能在 7-agent 模式下继续工作。
- [ ] 跑完后仍能通过 A 阶段全部回归。

---

## 3. 不做什么（整个 C 阶段）

- ❌ 不集成 `@playwright/cli`（→ D）。
- ❌ 不实现 `visual-qa.md` 的具体视觉验收逻辑（C3 只占位，→ D）。
- ❌ 不修改 A 阶段业务代码 / demo。
- ❌ 不修改依赖版本表。
- ❌ 不在 skill 里嵌入对外网 API（如 LLM 服务）的硬编码 endpoint。
- ❌ 不实现全自动 git push / open PR；合并到本地 main 即终止，远程操作交人类。

---

## 4. 回归测试

在 A/B 的 `scripts/verify-template.sh` 末尾分阶段追加静态结构断言。

### C1 静态断言

```bash
test -f .claude/skills/full-dev-flow/SKILL.md
test -f .claude/skills/full-dev-flow/templates/task-template.md
test -f .claude/skills/full-dev-flow/templates/plan-template.md
test -f .claude/skills/full-dev-flow/templates/contracts-template.md
test -f .claude/skills/full-dev-flow/templates/merge-plan-template.md
test -f .claude/skills/full-dev-flow/scripts/check-state.mjs
for a in contract-author feature-developer test-runner; do
  test -f .claude/agents/$a.md
  grep -q "name:" .claude/agents/$a.md
  grep -q "description:" .claude/agents/$a.md
done
test -f .dev/.gitkeep
```

### C2 静态断言

```bash
for a in contract-author backend-developer frontend-developer test-runner merge-orchestrator; do
  test -f .claude/agents/$a.md
  grep -q "name:" .claude/agents/$a.md
  grep -q "description:" .claude/agents/$a.md
done
```

### C3 静态断言

```bash
for a in contract-author backend-developer frontend-component-developer \
         frontend-page-developer test-runner visual-qa merge-orchestrator; do
  test -f .claude/agents/$a.md
  grep -q "name:" .claude/agents/$a.md
  grep -q "description:" .claude/agents/$a.md

  test -f .codex/agents/$a.toml
  grep -q "name =" .codex/agents/$a.toml
  grep -q "description =" .codex/agents/$a.toml
  grep -q "developer_instructions" .codex/agents/$a.toml
  ! grep -q "instructions_file" .codex/agents/$a.toml

  test -f .opencode/agents/$a.md
  grep -q "description:" .opencode/agents/$a.md
  grep -q "mode: subagent" .opencode/agents/$a.md
done

# Codex skill mirror，若 C3 启用
if [ -d .agents/skills/full-dev-flow ]; then
  test -f .agents/skills/full-dev-flow/SKILL.md
fi
```

动态 4-Phase 流程、中断恢复、worktree 合并不进自动 CI，改为发版前由维护者手动跑 mini 需求做 release gate。

---

## 5. Release Gate

### C1 Release Gate

- [ ] 用 `给 items 增加 tag 字段` 走通 simple mode。
- [ ] 生成 `.dev/plan.md`、`.dev/tasks/*`、`.dev/merge-plan.md`、`.dev/state.json`。
- [ ] 跑通 `pnpm install / typecheck / lint / test / build`。

### C2 Release Gate

- [ ] 用同一 mini 需求走 worktree 模式。
- [ ] 至少创建 backend/frontend 两个 worktree。
- [ ] `merge-orchestrator` 能合并并清理 worktree。
- [ ] 中断后重启能识别未完成任务。

### C3 Release Gate

- [ ] 用一个稍复杂需求触发 7-agent 模式，例如：新增 `categories` 模块，包含 schema、CRUD API、列表页、表单组件。
- [ ] 文件归属无交叉修改。
- [ ] Codex CLI 中能识别 `.codex/agents/*.toml` 自定义 agents。
- [ ] OpenCode 能识别 `.opencode/agents/*.md` 项目级 agents。
- [ ] 若启用 Codex skill mirror，Codex 能发现 `.agents/skills/full-dev-flow`。

---

## 6. 交付物

### C1 交付物

- `full-dev-flow` skill 最小版。
- 3 个 Claude Code agent。
- `.dev/.gitkeep`。
- `check-state.mjs` 简版。
- `scripts/verify-template.sh` C1 静态断言。
- `docs/release-gate-c.md` 初版。

### C2 交付物

- 5 个 Claude Code agent。
- worktree 编排说明。
- `worktrees.log` schema。
- `merge-orchestrator` 行为规范。
- `check-state.mjs` 恢复逻辑升级。
- `scripts/verify-template.sh` C2 静态断言。

### C3 交付物

- 7 个 Claude Code agent 完整版。
- 7 个 Codex TOML agents（`.codex/agents/*.toml`）。
- 7 个 OpenCode agent wrappers（`.opencode/agents/*.md`）。
- 可选 Codex skill mirror（`.agents/skills/full-dev-flow`，复制或 symlink）。
- `scripts/verify-template.sh` C3 静态断言。
- 升级 CLI 版本到 `0.3.0`，发布到 npm。

---

## 7. 风险与确认点

- **Codex TOML 同步风险**：Codex agent TOML 必须包含完整 `developer_instructions`，不能只写 `instructions_file`。若要保持 `.claude/agents/*.md` 单一事实源，需要维护一个同步/生成脚本。
- **Codex fan-out 风险**：`agents.max_depth` 默认 1，适合本项目；不要为了多层 delegation 提高它，避免递归 fan-out 导致 token 与延迟失控。
- **Codex 可见性风险**：Codex app 和 CLI 当前能显示 subagent activity，IDE Extension 可见性仍可能滞后；验收以 CLI 为主。
- **OpenCode agent 路径风险**：OpenCode project agents 应放 `.opencode/agents/`，且 frontmatter 不同；不要直接宣称 `.claude/agents` 可被 OpenCode 当作 agent 使用。
- **Claude Code subagent 加载时机**：手动新增 `.claude/agents/*.md` 后可能需要重启 session 或 `/agents` 重新加载。
- **Worktree 双重隔离风险**：如果使用 Claude Code subagent frontmatter 的 worktree 隔离能力，就不要再让 skill 手动创建一套 git worktree；二选一，避免路径和分支混乱。
- **并发过度风险**：小需求默认使用 C1 simple mode；只有模块数足够多时才启用 C2/C3 并发。
- **visual-qa 风险**：C3 只占位，真正视觉验收留给 D，避免 C 阶段被 Playwright CLI 复杂度拖住。
- **跨平台 symlink 风险**：C3 若创建 `.agents/skills` mirror，Mac/Linux 可 symlink，Windows fallback 为复制。
