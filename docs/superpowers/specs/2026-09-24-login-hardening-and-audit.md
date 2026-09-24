# 登录加固与权限审计落地记录（2026-09-24）

## 目标

补齐公网部署前的登录防爆破能力，并把服务端 403 决策写入监控模块，形成可查询的权限审计轨迹。

## 已落地

### 登录限流

- 新增 `za_login_throttle` 持久化失败计数，按「用户名 + 来源 IP」双维度统计；重启不丢锁定状态。
- 用户名连续失败 2 次后要求验证码，5 次锁定 15 分钟；IP 分别为 5 次验证码阈值、20 次锁定阈值。
- 登录成功后清除当前用户名与 IP 的失败计数；验证码缺失时返回 HTTP/body 均为 428。
- 反向代理部署可通过 `TRUST_PROXY=loopback|1|CIDR` 让 Express 解析真实客户端 IP。

### 服务端滑块验证码

- `GET /admin/captcha` 下发随机拼图挑战，答案只保存在服务端内存，挑战 3 分钟有效。
- `POST /admin/captcha/verify` 校验拖拽位置、时长与轨迹，成功后发放 5 分钟一次性 `captchaToken`。
- 验证码凭据绑定用户名与 IP，不能复用到其它账号或来源；成功消费后立即失效。
- 登录页采用渐进式交互：首次登录不打扰，达到失败阈值后展示服务端拼图。

### 权限审计

- `permissionMiddleware` 拒绝请求时写入 `za_monitor_log`（appId=`zealous-admin`，rangeType=`API`，status=403，title=`权限拒绝`）。
- 记录用户、路由、方法、所需权限、IP 与 UA；监控实时日志 / API 分析可直接筛选。

### 响应一致性

- `errorHandler` 的 body `code` 与业务错误 HTTP 状态保持一致，修复此前 HTTP 401/403/409/428 但 body 固定 500 的契约不一致。

## 验证

- 单测：滑块一次性 token 与上下文绑定、失败阈值/锁定/清零、403 审计落库、公开验证码路由白名单。
- E2E：连续失败触发 428；登录页服务端拼图校验后携带 `captchaToken` 提交。
- 前端 / 后端 `tsc --noEmit` 与 ESLint 通过。

## 未落地：httpOnly Cookie 会话

当前 token 仍在 localStorage。为避免做“仍返回 Bearer token 的双轨方案”造成伪安全，完整迁移需一次性完成：

1. 登录 / 续期不再返回 token，改为 `httpOnly + Secure + SameSite=Strict` Cookie。
2. 前端删除 token 持久化，`axios` 开启 `withCredentials`，启动时用 refresh 会话恢复登录态。
3. Cookie 会话下的写请求增加 CSRF 防护（如 `X-Requested-With` / 双提交 token），Bearer 机器调用保留独立通道。
4. 全量更新 API 测试与 E2E 登录 helpers，补跨站 CSRF 回归。

在上述迁移完成前，localStorage 取舍继续保留在安全待办中。
