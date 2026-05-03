# Prompts

本目录保存项目级 AI prompt，与代码同仓库版本管理。修改 prompt 时必须像修改代码一样走 review、CI 和回归测试。

## 规则

- Prompt 文件使用 Markdown，放在 `prompts/` 下。
- 每个 prompt 必须说明用途、输入变量、输出要求和验证命令。
- 修改 prompt 后至少运行 `pnpm typecheck`、`pnpm lint`、`pnpm test:coverage`。
- 发布时按团队规范打 `v<version>-prompt` 标签，确保代码和 prompt 可一起回滚。

## 当前 Prompt

- `feature-implementation.md`：用于新增或修改业务功能，强调先改共享契约，再实现 Express API 和 React UI。
