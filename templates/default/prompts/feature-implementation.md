# 功能实现 Prompt

## 用途

在这个 monorepo 中实现新产品功能时使用这个 prompt。

## 变量

- `{{feature_name}}`：功能名称。
- `{{user_requirement}}`：用户需求与业务背景。
- `{{acceptance_criteria}}`：必须满足的行为和测试要求。

## Prompt

请根据以下用户需求实现 `{{feature_name}}`：

`{{user_requirement}}`

验收标准：

`{{acceptance_criteria}}`

请按以下顺序执行：

1. 在 `packages/shared` 定义或更新 Zod schema。
2. 在同一个 shared contract source 中注册 OpenAPI paths。
3. 在 `apps/api` 实现 Express route。
4. 在 `apps/web` 实现 React UI 和 API hooks。
5. 重新生成 `api-contracts/api/openapi.yaml`。
6. 运行 `pnpm typecheck`、`pnpm lint` 和 `pnpm test:coverage`。

不要手写或手动修改 `api-contracts/api/openapi.yaml`。
