# 合并计划

## 模式

C1 简单模式。所有工作都在主工作区串行完成。

## 执行顺序

1. `contract-author`
2. `feature-developer`
3. `test-runner`

## 文件归属

- `packages/shared/**`: `contract-author`
- `docs/api/**`: `contract-author`
- `docs/openapi.json`: `contract-author`
- `apps/api/**`: `feature-developer`
- `apps/web/**`: `feature-developer`
- 测试与验证记录：`test-runner`

## 冲突处理策略

C1 不创建 worktree，也不自动合并分支。如果工作区存在无关的用户改动或冲突，停止执行并询问用户如何处理。

## 确认点 2

开始实现前必须获得用户确认。
