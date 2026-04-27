# 里程碑 C — `full-dev-flow` Skill + 7 子 Agent + Worktree 编排（v0.3.0）

> 对应源计划章节：[dev-plan-full.md §C 节](../dev-plan-full.md)
> 前置：仅依赖 A（v0.1.0）。**不依赖 B**（C 即使在 B 之前做也成立——C 自己创建 `.claude/skills/` 与 `.claude/agents/` 与 `.codex/agents/`）。

## 1. 目标

让生成的项目自带"从需求 + UI 图自动开发整个项目"的工作流：

- 一个 `full-dev-flow` skill，分 4 个 Phase + 3 个人类 checkpoint。
- 7 个职责互不重叠的子 agent，配 git worktree 并发与 `merge-orchestrator` 串行合并。
- `.dev/` 状态目录支持中断恢复。

## 2. 实施范围（必做）

### 2.1 Skill 与 Agent 文件

按 [dev-plan-full.md §C.7](../dev-plan-full.md) 落 16 个文件：

```
templates/default/
├─ .claude/
│  ├─ skills/full-dev-flow/
│  │  ├─ SKILL.md                         # 含 §C.8 frontmatter + 完整 4-Phase 流程
│  │  ├─ templates/
│  │  │  ├─ task-template.md              # 9-section（§C.4）
│  │  │  ├─ plan-template.md              # P0/P1/P2 勾选区
│  │  │  ├─ contracts-template.md
│  │  │  └─ merge-plan-template.md
│  │  └─ scripts/check-state.mjs          # 启动时读 .dev/state.json + worktrees.log
│  └─ agents/
│     ├─ contract-author.md
│     ├─ backend-developer.md
│     ├─ frontend-component-developer.md
│     ├─ frontend-page-developer.md
│     ├─ test-runner.md
│     ├─ visual-qa.md                     # 占位文件（D 阶段填充实现）
│     └─ merge-orchestrator.md
└─ .codex/agents/
   ├─ contract-author.toml
   ├─ backend-developer.toml
   ├─ frontend-component-developer.toml
   ├─ frontend-page-developer.toml
   ├─ test-runner.toml
   ├─ visual-qa.toml
   └─ merge-orchestrator.toml             # 全部用 instructions_file 引用 ../../.claude/agents/<name>.md
```

每份 agent `.md` 必须明确：
- 独占文件归属（防撞核心，见 [§C.6 文件归属表](../dev-plan-full.md)）
- 禁止改清单
- 输入 / 输出 / 终止条件

### 2.2 `.dev/` 目录约定

- 模板**只放** `templates/default/.dev/.gitkeep`，其他内容由 skill 运行时按需创建。
- 模板根 `_gitignore` 追加 `.dev/visual-diff/**/*.png` 与 `.jpg`（D 阶段才会真正用到，但规则可以先加）。

### 2.3 状态机与恢复

实现 [§C.5 state.json 格式](../dev-plan-full.md) 与 [§C.6 中断恢复逻辑](../dev-plan-full.md)。`check-state.mjs` 在 skill 入口被调用，读 `.dev/state.json` 与 `worktrees.log`，未完成则 `AskUserQuestion` 续跑。

### 2.4 Worktree 编排

- `worktrees.log` YAML schema 见 [§C.6](../dev-plan-full.md)。
- worktree 命名 `../<project>.wt/<wave>-<short-task-name>`（主仓库**外**）。
- `merge-orchestrator` 串行合并、冲突写入 `.dev/conflicts/<task>.md` 等人类。

### 2.5 与 B 阶段的协同（如果 B 已落地）

- 若 `.opencode/skills/` 与 `.agents/skills/` 已存在（B 已做），C 阶段写入的 `.claude/skills/full-dev-flow/` 自动通过 symlink 被 OpenCode / Codex 发现。
- 若 B 未做，C 阶段不主动创建 mirror 目录——保持职责单一。

### 2.6 与 A 阶段 scaffold 的关系

scaffold 不需要新增逻辑（文件复制就够）；仅在 B 已落地时由 B 的 symlink 逻辑顺带覆盖。

## 3. 不做什么

- ❌ 不写 `visual-qa.md` 的具体实现（占位即可，→ D 阶段填）。
- ❌ 不集成 `@playwright/cli`（→ D）。
- ❌ 不修改 A 阶段任何业务代码 / demo。
- ❌ 不修改依赖版本表。
- ❌ 不在 skill 里嵌入对外网 API（如 LLM 服务）的硬编码 endpoint——所有调用走当前 AI 工具的内置工具。
- ❌ 不实现"全自动 git push / open PR"（合并到本地 main 即终止；远程操作交人类）。

## 4. 验收标准

### 4.1 静态结构

- [ ] 16 个文件全部存在，路径与 §2.1 一致。
- [ ] `SKILL.md` frontmatter 含 `name: full-dev-flow` + `description`。
- [ ] 7 份 `.toml` 的 `instructions_file` 指向 `../../.claude/agents/<name>.md`，相对路径在 scaffold 后真实可读。
- [ ] 每份 agent `.md` 明确列出"独占目录"与"禁止改"清单。

### 4.2 动态运行（在生成的项目里）

用一个**最小需求**（例："给 items 加一个 `tag` 字段，前端列表显示 tag"）走通：

- [ ] Phase 1：skill 主动 `AskUserQuestion` 澄清，产出 `.dev/plan.md` + `.dev/flow.mmd` + checkpoint 1 暂停。
- [ ] Phase 2：产出 `tasks/contracts.md` + 各 task 文件 + `merge-plan.md` + checkpoint 2 暂停。
- [ ] Phase 3：contract-author 串行 → backend-developer / frontend-page-developer 并发（各自 worktree）→ test-runner 跑通 → merge-orchestrator 顺序合并到 main。
- [ ] `.dev/state.json` 与 `worktrees.log` 状态一致；合并后 worktree 自动清理。
- [ ] **跑完后**仍能跑通 A 的全部回归（`pnpm install / typecheck / lint / test / build`）。

### 4.3 中断恢复

- [ ] Phase 3 中途强行 `kill` skill，重启后 `check-state.mjs` 检测到未完成 → `AskUserQuestion` 提示续跑 / 放弃 / 重启。

### 4.4 文件归属隔离

- [ ] 任意两个并发 agent 的 worktree 无文件交叉修改（grep merge-plan.md 中文件归属表对比 commit 文件清单）。

## 5. 回归测试

在 A/B 的 `scripts/verify-template.sh` 末尾追加静态结构断言：

```bash
test -f .claude/skills/full-dev-flow/SKILL.md
test -f .claude/skills/full-dev-flow/templates/task-template.md
test -f .claude/skills/full-dev-flow/scripts/check-state.mjs
for a in contract-author backend-developer frontend-component-developer \
         frontend-page-developer test-runner visual-qa merge-orchestrator; do
  test -f .claude/agents/$a.md
  test -f .codex/agents/$a.toml
  grep -q "instructions_file" .codex/agents/$a.toml
done
test -f .dev/.gitkeep
```

动态 4-Phase 流程与中断恢复**不进自动 CI**（需要 LLM 互动），改为发版前由维护者手动跑一次 mini 需求做 release-gate。

## 6. 交付物

- 16 个新增模板文件 + `.dev/.gitkeep`。
- `_gitignore` 中 `.dev/visual-diff` 二进制规则。
- 升级 CLI 版本到 `0.3.0`，发布到 npm。
- `scripts/verify-template.sh` 扩展静态断言。
- 维护者文档：`docs/release-gate-c.md`（mini 需求脚本与人工验收清单）——**仅放仓库内，不进 npm tarball**（`.npmignore` / `package.json#files` 控制）。

## 7. 风险与确认点

- Codex `instructions_file` 字段名（[源 §10 ⚠️](../dev-plan-full.md)）：实施第一步先在 Codex 官方 docs 验证拼写，若实际是 `instructions_path` 等变体，更正所有 7 份 TOML 并在本文件追加确认输出。
- Codex `agents.max_depth` 默认 1：我们的 7 子 agent 都从顶层 skill 直接 spawn，不嵌套——保持 depth=1 即可。
- worktree 路径放主仓库外（`../<project>.wt/...`）避免被 IDE 索引。
- skill 不真去推远程；merge 冲突写到 `.dev/conflicts/` 阻塞，不强 resolve。
