# auth 与元数据模块加固：分析结论与落地记录（2026-09-23）

承接监控模块交付后的模块体检。范围：`packages/auth` + `service/src/modules/auth`、`packages/metadata` + `service/src/modules/metadata`。
结论先行：两个模块骨架完整，但 auth 的安全模型只有「认证」没有「授权」且会话不会失效；元数据存在若干确定性功能缺陷。本文记录已落地项与待排期项。

## 1. 已落地（本轮提交）

### 1.1 布局 http 拦截器（`packages/layout/utils/http.ts`）
- 原实现在错误分支直接 `const { data } = response`：网络错误 / 5s 超时时 `response` 为 `undefined`，拦截器自身抛 TypeError，掩盖真实错误且无任何提示。
- 现改为可选链取值，消息回退到 `error.message`，401 判定同时看 HTTP 状态与 body code。

### 1.2 auth 会话生命周期（`service/src/lib/jwt.ts`、`service/src/modules/auth/session.ts`、`service/src/middleware/auth.ts`）
- 登录校验 `za_admin.status`：被禁用账号此前可以正常登录。
- 令牌 `sub` 由 username 改为 admin id：改名不再让存量令牌指向错误身份；鉴权以 id 回查账号。
- `authMiddleware` 每次请求回查账号状态 + 吊销水位线 + 单令牌黑名单：禁用 / 删除 / 改密 / 登出立即生效，不再等令牌自然过期。
- 登出写入 `za_token_revocation`（jti 黑名单，按 exp 清理）；改密、禁用写 `za_admin.token_revoked_before` 水位线整体吊销。
- TTL 由 7d 收紧为 2h（`JWT_EXPIRES_IN` 可覆盖）；前端 `refreshSession` 启动即续期 + 每 25 分钟静默续期（`packages/auth/store/user.ts`、`src/App.tsx`），顺带修掉启动时 `fetchUserInfo()` 未处理 rejection 的控制台噪声。
- `JWT_SECRET`：生产环境缺失即拒绝启动（`assertJwtSecretConfigured`），开发环境回退到显式标注的 dev secret；本地密钥放 `service/.env`（已 gitignore，模板见 `service/.env.example`）。
- SQLite 连接统一 `PRAGMA journal_mode=WAL / busy_timeout=5000 / foreign_keys=ON`（`service/src/db/index.ts`）：此前 schema 里声明的外键并不生效，监控队列与业务写并发也缺少 busy 兜底。

### 1.3 元数据功能缺陷（`service/src/modules/metadata/*`、`packages/metadata/management.tsx`）
- 编码项可移回根级：`parentId` 校验改 `nullable()`，service 采用「显式 null = 清空、undefined = 不动」语义；此前 TreeSelect 清空父级要么 400 要么静默保持旧父级。
- 更新语义统一为「出现即覆盖」的动态 SET，替换 COALESCE 模式（COALESCE 无法把字段置空）。
- `deleteMetadataSet` 包进事务；删除前扫描 `za_form.schema` 契约中的 `setCode` 引用，命中则 409 提示表单名，避免表单渲染期才报错。
- 校验补齐：编码集 / 编码项 code 增加格式与长度约束（前后端一致），name / description / shortName 增加 max；管理页表单同步 pattern 提示。
- `toTreeData` 补返回类型注解，消除前端 tsc 的两个 TS7023/7024 错误。
- 路由参数改走 `validate(schema, 'params')`（中间件补 params 回写），删除手写的 `getPositiveId`；校验失败的 body code 由 500 修正为 400。
- 管理页补齐按钮级权限：编码集 / 编码项的新增、编辑、删除入口按权限渲染，状态开关无权限时禁用。
- 编码项状态支持行内启停（`changeOptionSetItemStatusAPI`），批量导入弹窗接入 `createOptionSetItemsAPI`，支持「编码,名称,简称」逐行导入与行级校验提示。
- 修复编码集分页筛选 SQL：keyword / status 统计查询补表别名，列表查询补 `WHERE` 拼接；此前带筛选条件会 500。

### 1.4 测试与基建
- 新增 `service/src/modules/auth/session.test.ts`（4 例）：禁用账号登录、sub=id、登出吊销、整体吊销。
- `service/src/modules/metadata/service.test.ts` 增 4 例：null 移回根级、null 清空描述、被表单引用的编码集拒绝删除、keyword 分页筛选。
- 新增 `e2e/metadata.spec.ts`（2 例）：编码集 / 编码项闭环（新增、挂子项、清空父级、批量导入、行内启停、编辑、删除）与表单引用删除保护。
- `vite.config.ts` 增加 vitest `test.exclude: ['e2e/**']`：此前 `pnpm test` 会把 Playwright 用例当 vitest suite 收集并报错，CI 的单元测试步骤必然红。
- 验证矩阵：service tsc 0 错；前端 tsc 剩余错误全部位于历史遗留文件（layout/components）；vitest 38 文件 497 例全过；Playwright 全量 22/22；API 冒烟覆盖新校验、清空、引用保护、登出后令牌 401。

## 2. 已知未做（待排期）

- ~~**服务端授权仍然缺失**~~ → 已于同日落地，见 `2026-09-23-db-driven-routing-and-permissions.md`：权限标识挂菜单（`za_menu.type` / `permission`）、`getUserInfo` 下发 `permissions`、服务端 `permissionMiddleware` 做路由级强制、前端按标识隐藏入口。
- ~~`convertMenus` 隐藏节点连带丢弃子树~~ → 已修：隐藏节点自身不进导航、可见后代上提一层，同时跳过按钮节点（`type = 2`）。
- ~~元数据管理页缺 E2E 覆盖；批量导入（`createOptionSetItemsAPI`）与行内启停（`changeOptionSetItemStatusAPI`）前端尚未接上~~ → 已于 2026-09-24 落地，见上文字档与 `e2e/metadata.spec.ts`。
- token 仍存 localStorage（XSS 可取），内网后台为已知取舍；升级 httpOnly cookie + CSRF 属会话方案重构。
- ~~登录接口无限流 / 验证码，公网部署前建议补~~ → 已于 2026-09-24 落地：持久化用户名/IP 双维度限流 + 服务端滑块验证码，见 `2026-09-24-login-hardening-and-audit.md`。
