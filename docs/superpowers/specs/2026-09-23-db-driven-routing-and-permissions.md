# 数据库驱动路由与权限模型：设计与落地记录（2026-09-23）

承接 `2026-09-23-auth-metadata-hardening.md` 里两条「待排期」：服务端授权缺失、`convertMenus` 丢弃隐藏子树。
本轮同时把系统管理页收进 `packages/auth`，并把路由表从「文件约定」改成「菜单配置驱动」。

## 1. 路由：菜单表就是路由表

### 1.1 动机
- 原方案是 `vite-plugin-pages` 文件路由 + `meta.auth` 包装：页面能不能访问由**构建期的文件是否存在**决定，菜单只是导航装饰。
  结果就是「菜单删了页面还能直接敲 URL 访问」「菜单配了但文件改名就白屏」，两者永远对不齐。
- 现方案：**路由表完全由 `za_menu` 生成**，菜单行决定路由存在性，`component` 列决定用哪个页面组件。

### 1.2 结构
- `src/registry/pages.tsx`：`component` key → 懒加载器注册表（`auth/admin`、`monitor/log`、`metadata/manager` …）。
  子包页面在这里登记一次即可被菜单绑定；`knownPageKeys()` 反向暴露给菜单管理页做下拉选项。
- `src/registry/routes.tsx`：`buildRoutes(menus)` 产出 `[/login, { / → AuthGuard + Layout, children: 菜单路由 }, *]`。
- 回落约定：`component` 为空时按 `path` 找 `src/pages/index{path}.tsx`（再退 `{path}/index.tsx`），
  老页面不用一次性全部登记。
- `App.tsx` 增加会话门禁：有令牌且不在 `/login` 时先 `refreshSession()` 再 `useRoutes`，否则刷新瞬间菜单为空 → 路由表为空 → 闪 404。

### 1.3 不进导航但必须可路由的页面
- 详情页（`/form/design`、`/form/render`、`/form/data`、面包屑与路由参数详情）不是菜单项，但被 `openTab` 打开。
  处理方式：**补隐藏菜单行**（`hidden = 1`），路由照旧生成，`convertMenus` 不进导航；授权继承父菜单，避免非超管角色升级后打不开。
- 这也是「纯数据库驱动」的代价：任何可导航路径都必须有菜单行。收益是权限、导航、路由三者同源，不会再各说各话。

## 2. 权限模型：菜单即权限

### 2.1 数据结构
- `za_menu` 增两列：
  - `type`：`0` 目录（只分组）/ `1` 菜单（对应页面）/ `2` 按钮（只承载权限标识，无 path、不参与导航与路由）。
  - `permission`：权限标识，形如 `system:user:add`。菜单行一般挂「查询」标识，按钮行挂「操作」标识。
- `za_role` 增 `is_super`：超管角色直接返回 `['*']`，**不依赖菜单是否配全**，避免漏配把自己锁在系统外。
- 迁移幂等：`type` 首次添加时按「有无子节点」推导目录；`permission` 只在为空时回填；按钮行按 `(父菜单, permission)` 判重。
- 新增按钮节点默认继承父菜单已有的角色授权，老库升级后非超管角色不会突然失去操作入口。

### 2.2 服务端强制（真正的边界）
- `service/src/modules/auth/permission.service.ts`：`getActiveRoles()` / `getPermissions()`。
  停用角色（`status = 0`）既不贡献权限也不下发菜单 —— 此前 `getUserInfo` 完全忽略角色状态。
- `service/src/middleware/permission.ts`：一张「接口 → 权限标识」表 + `permissionMiddleware`，挂在各路由的 `authMiddleware` 之后。
  - 多标识表示「任一命中即放行」，用于跨页面复用的只读接口（如 `/role/all` 同时服务角色页与用户页的分配角色弹窗）。
  - **白名单优先匹配**：`/admin/info`、`/admin/refreshToken` 若被 `/admin/:id` 的通配规则命中，非超管登录后会立刻被踢出。
    这条是单测跑出来的真实缺陷，不是假想。
  - `UNPROTECTED_ROUTES` 逐条写理由；`permission.test.ts` 会扫描全部 `*routes.ts`，
    **任何接口要么在权限表里、要么在白名单里**，新增接口忘了配权限会直接红。
- 权限每次请求实时解析，改授权立即生效，不用等令牌过期。

### 2.3 前端（体验优化，不是安全边界）
- `getUserInfo` 下发 `permissions`（超管 `['*']`）；按钮行不下发到 `menus`，避免导航与路由被污染。
- `useHasPermission()` / `PermissionGuard` 落地：用户、角色、菜单三个管理页的增删改与状态开关按标识显隐，
  无权时开关降级为 `disabled` 而不是消失，保留「这一列是什么」的语义。
- `convertMenus` 修两处：跳过 `type = 2`；隐藏节点不再连带吞掉子树（可见后代上提一层）。

### 2.4 配置界面
- 菜单管理页新增「节点类型 / 权限标识 / 页面组件」：
  - 页面组件是下拉，选项由主应用启动时通过 `registerPageKeys(knownPageKeys())` 注入 —— auth 包不能反向依赖主应用。
    手写 key 打错会静默 404，下拉从源头堵住。
  - 选「按钮」后自动收起前端名称 / 图标 / 页面组件 / 显示开关，提交时强制 `name = ''`、`hidden = 1`，保证不会误生成路由。
- 分配菜单树把按钮叶子渲染成「名称 + 权限标识」的橙色标签，和页面菜单区分开。
- 删除菜单时按钮子节点随父级级联删除（事务内），目录 / 菜单子节点仍要求先处理，避免误删整棵子树。

## 3. 验证

- 单测：`service/src/middleware/permission.test.ts`（路由权限表全覆盖 + 匹配优先级）、
  `service/src/modules/auth/permission.test.ts`（超管通配、无角色、按菜单聚合、停用角色、白名单放行、403 分支）。
  vitest 40 文件 / 513 例。
- E2E：`e2e/permission.spec.ts` 用种子账号 `test`（演示测试员）临时收敛为「只读用户管理」，
  校验 `permissions` 下发、写接口与越权模块 403、会话接口不被误伤、操作按钮不渲染、状态开关禁用、
  手敲未授权路由落 404；用例结束还原角色授权。
- `e2e/system-pages.spec.ts` 覆盖菜单驱动路由（三个系统管理页 + 隐藏详情路由）与菜单配置 UI（类型标签、权限标识、组件下拉、按钮节点切换）。
- 类型与静态检查：service `tsc` 0 错；前端 `tsc` 仅剩 20 条历史遗留（`packages/components|layout`）；
  本轮新增 / 改动文件 eslint 0 error。

## 4. 已知未做

- 监控、元数据、表单页面只做了**接口级**强制，页面内按钮尚未逐个包 `useHasPermission`；越权点击会得到 403 提示而不是按钮消失。
- 菜单管理不支持拖拽排序，`sort` 仍是手填数字。
- 目录 `type` 由「有无子节点」一次性推导，之后由管理员自行维护；把目录改回菜单不会自动重算。
- 权限标识是自由文本，重命名后需要同步 `permission.ts` 的路由表；后续可考虑给标识建字典表并在两端做一致性校验。
- token 仍存 localStorage、登录接口无限流，与上一轮记录一致，属公网部署前的待办。
