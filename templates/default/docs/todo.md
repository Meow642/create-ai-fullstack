# TODO

## API breaking change approval flow

### 背景

当前模板已经在 CI 中预留了 `oasdiff break` 检查：

```bash
pnpm dlx oasdiff@latest break api-contracts/base/openapi.yaml api-contracts/api/openapi.yaml
```

如果存在 `api-contracts/base/openapi.yaml`，CI 会把它作为旧版本契约，并与当前 `api-contracts/api/openapi.yaml` 对比。这个设计能拦住未声明的 API breaking change，避免接口被无意改坏。

但当前逻辑仍是严格拦截模式：一旦 `oasdiff` 检测到 breaking change，CI 就会失败。它还没有区分“误改导致的不兼容”和“需求变化导致的、有意的不兼容”。

### 问题

如果产品需求本身发生变化，并且前端、后端、测试都在同一个 PR 中同步完成修改，当前 CI 仍可能因为 `oasdiff break` 失败而拦住这次合法变更。

这会导致两个问题：

- 合法的 intentional breaking change 没有正式放行路径。
- 团队可能倾向于绕过契约检查，削弱 OpenAPI 契约门禁的价值。

### 目标方案

后续需要把 CI 从“发现 breaking change 就失败”升级为“发现未声明的 breaking change 才失败”。

建议规则：

- 默认情况下，`oasdiff break` 失败即 CI 失败。
- 如果 PR 明确声明 intentional breaking change，则允许进入豁免分支。
- 豁免分支至少要求：
  - PR 带有 `breaking-api` label。
  - OpenAPI `info.version` 发生 major bump。
  - `api-contracts/api/consumer.json` 已更新，确认受影响消费者。
  - 前后端测试、覆盖率、E2E 或消费者测试全部通过。
  - `docs/contracts.md` 或迁移说明中记录变更原因和迁移方式。

### 后续实现建议

在 `.github/workflows/ci.yml` 中把 `oasdiff break` 包装成脚本，例如：

```bash
if pnpm dlx oasdiff@latest break api-contracts/base/openapi.yaml api-contracts/api/openapi.yaml; then
  echo "No breaking API changes."
else
  node scripts/allow-breaking-api-change.mjs
fi
```

`scripts/allow-breaking-api-change.mjs` 负责检查 label、版本号、消费者登记和迁移说明。如果任一条件不满足，则明确输出失败原因并退出非零状态。

### 当前状态

尚未实现。当前模板仍然是严格拦截模式。
