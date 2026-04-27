# 里程碑 B — AGENTS.md 化 + 多 AI 工具兼容（v0.2.0）

> 对应源计划章节：[dev-plan-full.md §B 节](../dev-plan-full.md)
> 前置：仅依赖 A（v0.1.0 已发布且回归绿）。**不依赖 C / D**。

## 1. 目标

把 A 阶段产出的 4 份 `CLAUDE.md` 转换为 `AGENTS.md`（开放标准）+ 一行 pointer `CLAUDE.md`，并为 OpenCode / Codex / Cursor / Windsurf 等其他 AI 工具提供原生发现路径（symlink + Codex TOML agent 配置壳）。

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

### 2.4 CLI scaffold 扩展（symlink / 复制）

在 A 的 `src/scaffold.ts` 末尾追加：

1. 检测 `process.platform`：win32 → `fs.cp` 复制；其他 → `fs.symlink` 相对路径。
2. 创建 `.opencode/skills/` 与 `.agents/skills/` 两个目录，但**模板 tarball 里不存这两个目录**——scaffold 阶段动态创建，目标都指向 `.claude/skills/`（A 阶段没有 skills，所以 B 阶段实际只创建空目录骨架；当 C 阶段加入 `full-dev-flow` skill 后会自动被两个 mirror 引用）。
3. 写 `.gitattributes`（`* text=auto`），便于跨平台。

**注意**：B 阶段独立可发版，因此即使 `.claude/skills/` 当下为空（C 未做），symlink/复制逻辑仍要正确处理"空目录"情形——不要 crash。

### 2.5 Codex TOML agent 配置壳

A 阶段没有 `.claude/agents/` 也没有 `.codex/agents/`。**B 阶段同样不创建子 agent 内容**（那是 C 阶段）。本阶段**只**新增：

- `.codex/agents/.gitkeep`（为目录占位）
- 为根 `AGENTS.md` 兼容性头里写明的"Codex TOML 引用 `.claude/agents/*.md`"做好约定，但实际 7 份 TOML/MD 不写——避免与 C 阶段重复。

> **如果用户先做 C 后做 B**：本阶段的"agents 目录占位"就不必创建（C 已经创建过）。scaffold 实现要做幂等。

### 2.6 模板根 README / 文档

- 根 README 补一段"AI 工具兼容性"说明，列出本模板原生支持的工具。

## 3. 不做什么

- ❌ 不实现 `full-dev-flow` skill（→ C）。
- ❌ 不写 `.claude/agents/*.md` 或 `.codex/agents/*.toml` 实质内容（→ C）。
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
- [ ] `ls -la .agents/skills/` 与 `.opencode/skills/` 存在（macOS/Linux 上为 symlink 指向 `.claude/skills/`，Windows 上为复制目录）。
- [ ] `cat packages/shared/AGENTS.md` 存在并简短描述契约规则。
- [ ] **A 阶段所有验收命令仍然全绿**（`pnpm install / typecheck / lint / test / build` 不退化）。
- [ ] `pnpm dev` 后浏览器流程仍可用。
- [ ] `pnpm publish --dry-run` 包含新增 AGENTS.md 文件，**不**包含 `.opencode/skills/` 与 `.agents/skills/` 这两个动态目录。

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
test -e .agents/skills
test -e .opencode/skills
```

A 阶段的所有断言保持原样。

## 6. 交付物

- 模板内 4 份 `AGENTS.md` + 4 份 pointer `CLAUDE.md` + `packages/shared/AGENTS.md`。
- `src/scaffold.ts` 新增 symlink/复制逻辑（跨平台）。
- 模板内 `.gitattributes`。
- README "AI 工具兼容性"段落。
- 升级 CLI 版本到 `0.2.0`，发布到 npm。
- `scripts/verify-template.sh` 扩展断言。

## 7. 风险与确认点

- macOS/Linux symlink 在 git 中以 mode 120000 记录；模板 tarball **不含** symlink（动态创建），所以 npm publish 安全。
- Windows 上 fallback 到 fs.cp，提示用户该目录会占额外磁盘。
- AGENTS.md 体积要持续盯紧——后续若用户社区反馈太薄，再权衡是否提升上限（要先在源文档里写明）。
- Codex 的 `instructions_file` 字段拼写在源计划 §10 已标记 ⚠️ 待核——B 阶段尚不写 TOML，把这个核实留到 C 阶段。


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
scaffold 阶段动态创建：
.claude/skills/
.agents/skills -> ../.claude/skills
.opencode/skills -> ../.claude/skills
.codex/agents/.gitkeep
模板新增 .gitattributes
README 增加 AI 工具兼容说明
scripts/verify-template.sh 增加 B 阶段断言
验证已跑：

pnpm typecheck 通过
pnpm lint 通过
pnpm build 通过
本地 scaffold 到 /tmp/cf-b-smoke/app 通过
已验证 AGENTS.md、四处 CLAUDE.md pointer、shared 指引、.agents/.opencode 软链、.codex/agents/.gitkeep、docs/openapi.json 都生成正确
根 AGENTS.md 体积约 5689 bytes，低于 8KB