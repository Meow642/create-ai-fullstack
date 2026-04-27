# 里程碑 B — AGENTS.md 化 + 多 AI 工具兼容（v0.2.0）

> 对应源计划章节：[dev-plan-full.md §B 节](../dev-plan-full.md)
> 前置：仅依赖 A（v0.1.0 已发布且回归绿）。**不依赖 C / D**。

## 1. 目标

把 A 阶段产出的 4 份 `CLAUDE.md` 转换为 `AGENTS.md`（开放标准）+ 一行 pointer `CLAUDE.md`，为 OpenCode / Codex / Cursor / Windsurf 等其他 AI 工具提供通用项目指引。C1 复核后，skills mirror 与 Codex/OpenCode 专用 agent 兼容层后移到 C3。

## 2. 实施范围（必做）

### 2.1 文件迁移（模板内）

| 原（A 产出） | 改为 |
|---|---|
| `templates/default/CLAUDE.md` | `templates/default/AGENTS.md`（事实源，**精简到 ≤ 8 KB**）+ `CLAUDE.md`（pointer，写死） |
| `templates/default/apps/web/CLAUDE.md` | `apps/web/AGENTS.md` + `apps/web/CLAUDE.md`（pointer） |
| `templates/default/apps/api/CLAUDE.md` | `apps/api/AGENTS.md` + `apps/api/CLAUDE.md`（pointer） |
| —（新增） | `packages/shared/AGENTS.md` |

`pointer` 内容（4 份完全一致，写死）：

```markdown
# CLAUDE.md

This project uses **[AGENTS.md](./AGENTS.md)** as the single source of project guidance for AI coding agents (Claude Code / OpenCode / Codex / Cursor / Windsurf 等). 请直接阅读 AGENTS.md。
```

### 2.2 AGENTS.md 标准头

每份 `AGENTS.md` 顶部插入 [dev-plan-full.md §B.3](../dev-plan-full.md) 给出的兼容性说明 blockquote。

### 2.3 根 AGENTS.md 8 KB 瘦身

把"内置 demo 详细说明"、"shadcn 全套清单"等具体内容下沉到 `apps/web/AGENTS.md` / `apps/api/AGENTS.md`。根级只保留：导航表 + 硬性约束清单。

### 2.4 CLI scaffold 扩展

在 A 的 `src/scaffold.ts` 末尾只保留 `.gitattributes`（`* text=auto`）写入，便于跨平台。

> C1 复核后修正：B 阶段不再创建 `.agents/skills`、`.opencode/skills`、`.codex/agents`。这些路径属于 C3 的 Codex/OpenCode 兼容增强，不能在 C1 前置生成，避免造成无效或过时的跨工具承诺。

### 2.5 Codex / OpenCode 兼容层

B 阶段只提供 `AGENTS.md` 通用项目指引，不创建 Codex/OpenCode 专用 agent 文件或 skill mirror。

- Codex 自定义 agent 后续应使用 `.codex/agents/*.toml`，且 TOML 必须包含 `developer_instructions`。
- OpenCode project agents 后续应使用 `.opencode/agents/*.md`，且 frontmatter 与 Claude Code 不同。
- `.agents/skills` / `.opencode/skills` mirror 留到 C3 按官方规范实现。

### 2.6 模板根 README / 文档

- 根 README 补一段"AI 工具兼容性"说明，列出本模板原生支持的工具。

## 3. 不做什么

- ❌ 不实现 `full-dev-flow` skill（→ C）。
- ❌ 不写 `.claude/agents/*.md`、`.codex/agents/*.toml` 或 `.opencode/agents/*.md` 实质内容（→ C）。
- ❌ 不创建 `.agents/skills` / `.opencode/skills` mirror（→ C3）。
- ❌ 不集成 playwright（→ D）。
- ❌ 不修改 A 阶段的依赖版本表，不动 `package.json` 依赖列表。
- ❌ 不重命名 / 删除 A 阶段已生成的业务代码或 demo。

## 4. 验收标准

在干净目录跑：

```bash
rm -rf /tmp/cf-smoke && mkdir -p /tmp/cf-smoke
node "$(pwd)/dist/index.mjs" /tmp/cf-smoke/app --no-install --no-git
cd /tmp/cf-smoke/app
```

- [ ] `cat CLAUDE.md` 输出正好那行 pointer（4 处都一样）。
- [ ] `cat AGENTS.md` 输出真实内容，**首段含**兼容性 blockquote。
- [ ] `wc -c AGENTS.md` ≤ 8192。
- [ ] 不生成 `.agents/skills/`、`.opencode/skills/`、`.codex/agents/`；这些目录留到 C3。
- [ ] `cat packages/shared/AGENTS.md` 存在并简短描述契约规则。
- [ ] **A 阶段所有验收命令仍然全绿**（`pnpm install / typecheck / lint / test / build` 不退化）。
- [ ] `pnpm dev` 后浏览器流程仍可用。
- [ ] `pnpm publish --dry-run` 包含新增 AGENTS.md 文件，**不**包含 `.opencode/skills/`、`.agents/skills/`、`.codex/agents/`。

## 5. 回归测试

在 A 的 `scripts/verify-template.sh` 末尾追加：

```bash
test -f AGENTS.md
test -f apps/web/AGENTS.md
test -f apps/api/AGENTS.md
test -f packages/shared/AGENTS.md
test "$(wc -c < AGENTS.md)" -le 8192
grep -q 'AGENTS.md' CLAUDE.md
grep -q 'AGENTS.md' apps/web/CLAUDE.md
test ! -e .agents/skills
test ! -e .opencode/skills
test ! -e .codex/agents
```

A 阶段的所有断言保持原样。

## 6. 交付物

- 模板内 4 份 `AGENTS.md` + 4 份 pointer `CLAUDE.md` + `packages/shared/AGENTS.md`。
- `src/scaffold.ts` 写入 `.gitattributes`。
- 模板内 `.gitattributes`。
- README "AI 工具兼容性"段落。
- 升级 CLI 版本到 `0.2.0`，发布到 npm。
- `scripts/verify-template.sh` 扩展断言。

## 7. 风险与确认点

- Codex/OpenCode 专用兼容层后移到 C3，避免 B 阶段生成无效配置或过时路径。
- AGENTS.md 体积要持续盯紧——后续若用户社区反馈太薄，再权衡是否提升上限（要先在源文档里写明）。
- Codex 旧计划中的 `instructions_file` 不能直接使用；C3 应按最新 schema 写完整 `developer_instructions`。


## 实施完成记录：
B 阶段已实施完成。

主要改动：

CLI 版本升级到 0.2.0
模板新增 AGENTS.md 事实源：
根：templates/default/AGENTS.md
前端：templates/default/apps/web/AGENTS.md
后端：templates/default/apps/api/AGENTS.md
shared：templates/default/packages/shared/AGENTS.md
CLAUDE.md 改成 pointer，root/web/api/shared 四处一致。
scaffold 阶段只写入 .gitattributes
模板新增 .gitattributes
README 增加 AI 工具兼容说明
scripts/verify-template.sh 增加 B 阶段断言
验证已跑：

pnpm typecheck 通过
pnpm lint 通过
pnpm build 通过
本地 scaffold 到 /tmp/cf-b-smoke/app 通过
已验证 AGENTS.md、四处 CLAUDE.md pointer、shared 指引、docs/openapi.json 都生成正确
根 AGENTS.md 体积约 5689 bytes，低于 8KB

## C1 修正记录：

C1 实施时按最新 Codex/OpenCode/Claude Code 文档修正 B 阶段的兼容边界：

- B 阶段不再创建 `.agents/skills`、`.opencode/skills`、`.codex/agents`。
- `AGENTS.md` 顶部说明改为：C1 只承诺 Claude Code 的 `.claude/skills` 与 `.claude/agents` 主路径。
- Codex/OpenCode skill mirror 和专用 agent wrapper 留到 C3。
