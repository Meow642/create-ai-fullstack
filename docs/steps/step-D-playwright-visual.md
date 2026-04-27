# 里程碑 D — `@playwright/cli` 集成 + 视觉验收回路（v0.4.0）

> 对应源计划章节：[dev-plan-full.md §D 节](../dev-plan-full.md)
> 前置：仅依赖 A（v0.1.0）。**不依赖 B / C**。即便没有 C 的 `full-dev-flow`，D 阶段产出的 `playwright-cli` skill 与 `visual-qa` agent 也能被 AI 工具单独调用。

## 1. 目标

为生成的项目内置：
- Microsoft 官方 `playwright-cli` skill（vendored 快照，含 commit-sha + license 注明）。
- `visual-qa` 子 agent，做"截图 vs 设计图"对比 + 仅样式层的自动修复（≤ 3 轮）。
- `apps/web` 增加 `@playwright/cli` 一项 devDependency。

## 2. 实施范围（必做）

### 2.1 依赖新增

`templates/default/apps/web/package.json` 的 `devDependencies` 加：

```json
"@playwright/cli": "^0.1.9"
```

> 这是**唯一**对依赖版本表的扩展；版本来源为 [dev-plan-full.md §8](../dev-plan-full.md) 已锁定的值，无需新跑 `npm view`。若实施时 latest 已漂移到更新版本，按 caret 自动包含；若有 major 跳变，先附 `npm view @playwright/cli versions --json` 输出再调整。

### 2.2 SKILL vendoring

按 [§D.2](../dev-plan-full.md) 落地：

- 路径：`templates/default/.claude/skills/playwright-cli/SKILL.md`
- 来源：`https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md`
- 文件末尾追加 vendoring 注释块（commit-sha + 原始 URL + license attribution）。
- 同目录添加 `LICENSE.upstream`（拷贝 upstream 原 license）。

### 2.3 visual-qa Agent

写 `templates/default/.claude/agents/visual-qa.md`（C 阶段已建占位文件；D 阶段填实质内容）+ `templates/default/.codex/agents/visual-qa.toml`（指向同一份 `.md`）。

实现 [§D.3](../dev-plan-full.md) 流程：
- 输入：`.dev/requirements/<page>-design.png` + 当前页面 URL。
- 步骤：`playwright-cli open` → `screenshot` → AI 视觉模型对比 → 输出 diff.md → 仅样式层修复（className / CSS）→ ≤ 3 轮终止。
- 严重度判定：minor（色差 / ≤1px）/ major（布局错位 / 元素缺失）。
- 修复约束：禁改业务逻辑 / props 形状 / 路由。

### 2.4 e2e 目录占位

`templates/default/apps/web/tests/e2e/.gitkeep`。模板**不**装 `@playwright/test`，留给用户后续按需安装（在 README 里写明）。

### 2.5 Dev Server 协作

visual-qa 启动前读 `.dev/state.json`：dev server 未起则 `pnpm dev` 后台拉起 + `wait-on http://localhost:5173`；验收完不杀 server。

### 2.6 与 C 阶段的关系

- 若 C 已做：visual-qa 的占位文件被替换为本阶段实现；`full-dev-flow` Phase 4 自然调用。
- 若 C 未做：visual-qa 仍可被 AI 工具独立 invoke，作为单点能力存在。

## 3. 不做什么

- ❌ 不安装 `@playwright/test`（仅 `@playwright/cli`）。
- ❌ 不做像素级 diff（用 AI 视觉模型描述差异）。
- ❌ 不让 visual-qa 改业务逻辑 / props / 路由。
- ❌ 不做 ≥ 4 轮自动修复——超出阈值交人类。
- ❌ 不在 vendoring 时改写 upstream SKILL 内容（仅在文件末尾追加注释块）。
- ❌ 不修改 A/B/C 已交付的任何文件（除把 `visual-qa.md` 占位替换为实现）。

## 4. 验收标准

### 4.1 静态结构

- [ ] `apps/web/package.json` 含 `@playwright/cli ^0.1.9`。
- [ ] `apps/web/tests/e2e/.gitkeep` 存在。
- [ ] `.claude/skills/playwright-cli/SKILL.md` 存在；末尾含 commit-sha 注释。
- [ ] `.claude/skills/playwright-cli/LICENSE.upstream` 存在。
- [ ] `.claude/agents/visual-qa.md` 含完整流程（非占位）。
- [ ] `.codex/agents/visual-qa.toml` 的 `instructions_file` 指向 `../../.claude/agents/visual-qa.md`。

### 4.2 安装与运行

```bash
rm -rf /tmp/cf-smoke && mkdir -p /tmp/cf-smoke
node "$(pwd)/dist/index.mjs" /tmp/cf-smoke/app --no-install --no-git
cd /tmp/cf-smoke/app
pnpm install                                  # 含 @playwright/cli 安装
pnpm typecheck && pnpm -r run lint
pnpm -F api test && pnpm -F web test
pnpm -F web build && pnpm -F api build
pnpm -F web exec playwright-cli --version     # 必须输出版本号
```

### 4.3 视觉验收闭环（手动 release-gate）

用一个最小场景验证（例：items 列表页 + 一张随手设计图）：
- [ ] visual-qa 能调 `playwright-cli` 截图，写到 `.dev/visual-diff/items-iter-1/actual.png`。
- [ ] 输出 `diff.md` 含差异列表 + 严重度。
- [ ] 若引入故意的 className 错误，能在 ≤ 3 轮内修复或返回 `needs-human`。

### 4.4 不退化

- [ ] A/B/C 全部回归断言仍然全绿。
- [ ] `pnpm dev` 双 tab WS 流程仍可用。

## 5. 回归测试

在 `scripts/verify-template.sh` 末尾追加：

```bash
test -f apps/web/tests/e2e/.gitkeep
test -f .claude/skills/playwright-cli/SKILL.md
test -f .claude/skills/playwright-cli/LICENSE.upstream
grep -q "Vendored from microsoft/playwright-cli" .claude/skills/playwright-cli/SKILL.md
grep -q '"@playwright/cli"' apps/web/package.json
test -f .claude/agents/visual-qa.md
grep -q "playwright-cli" .claude/agents/visual-qa.md
pnpm -F web exec playwright-cli --version >/dev/null
```

动态视觉对比走人工 release-gate（不进 CI）。

## 6. 交付物

- `templates/default/.claude/skills/playwright-cli/{SKILL.md,LICENSE.upstream}`。
- `templates/default/.claude/agents/visual-qa.md`（实质内容）。
- `templates/default/.codex/agents/visual-qa.toml`。
- `templates/default/apps/web/package.json` 增加 `@playwright/cli`。
- `templates/default/apps/web/tests/e2e/.gitkeep`。
- README 增加"视觉验收（visual-qa）使用方法"段落。
- 升级 CLI 版本到 `0.4.0`，发布到 npm。
- 维护者文档：`docs/vendoring-playwright-cli.md`（每次 minor 升级时如何刷新 vendored SKILL，记录 commit-sha 历史）。

## 7. 风险与确认点

- `@playwright/cli` 是 2026 Q1 GA 新包，API 仍在迭代——CLI minor 升级时同步 vendor 最新 SKILL 并跑回归。
- 视觉差异判定走 AI 模型，对设计图分辨率敏感——`visual-qa.md` 里建议 design.png 不低于 1280×720。
- vendoring 内容不改写，避免 license 风险；若 upstream license 变更，vendor 时同步更新 `LICENSE.upstream` 并审视兼容性。
- visual-qa 修复 patch 仅限样式——在 agent 文档里硬性限制并在 `patches/` 下保留每轮 diff 备查。
