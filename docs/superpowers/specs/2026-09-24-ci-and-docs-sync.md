# CI 与文档同步机制（2026-09-24）

## 背景

监控专项 CI 只卡监控范围，前端类型检查允许失败，文档站构建与 superpowers 规格索引未纳入流水线；`CHANGELOG.md` 停留在 2026-09-16，改造记录与发布说明脱节。

## CI 矩阵

- Lint：生产改造面强制 0 error；`lint:all` 保留全仓入口，用于追踪文档示例与历史演示页存量。
- Typecheck：根应用与 `service` 双 TypeScript 项目强卡。
- Unit：Vitest 全量单元测试强卡。
- Build：前端生产构建、后端 `tsc` 构建、VitePress 文档站构建强卡。
- E2E：Playwright 全量用例强卡，并上传报告、截图与 trace。

## 文档同步

- 新增 `docs/superpowers/index.md` 作为规格与计划总索引。
- `scripts/verify-docs-sync.mjs` 校验：
  - `docs/superpowers/**/*.md` 必须全部列入索引；
  - 索引链接必须存在；
  - 文档站必须挂载 `/superpowers/` 侧边栏；
  - 最新规格日期必须有同名日期的 `CHANGELOG.md` 记录；
  - `CHANGELOG.md` 日期必须倒序。
- 本地入口：`pnpm docs:verify`；CI 在文档构建前执行。

## 验证

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm --dir service build`
- `pnpm docs:verify`
- `pnpm docs:build`
- `pnpm test`
- `pnpm test:e2e`

## 已知边界

全仓 `pnpm lint:all` 当前仍有历史文档示例与演示页错误；为避免无关大规模格式化混入安全改造，CI 先强卡当前生产改造面，后续可在独立清理阶段把清单逐步扩大到全仓。
