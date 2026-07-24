# Zustand 状态管理

`@zealous-admin/layout` 使用 [Zustand](https://github.com/pmndrs/zustand) 进行状态管理，共 7 个 Store，均支持 `persist` 中间件持久化。

## Store 概览

| Store | 文件 | 持久化 | 职责 |
|-------|------|--------|------|
| `useAppStore` | `store/app.ts` | ✅ | 应用级设置（名称、Logo、版权等） |
| `useThemeStore` | `store/theme.ts` | ✅ | 主题设置（颜色、暗色、主题类型等） |
| `useMenuStore` | `store/menu.ts` | 部分 | 菜单数据和交互状态 |
| `usePageStore` | `store/page.ts` | ✅ | 页面状态（过渡动画、进度条等） |
| `useTopBarStore` | `store/topBar.ts` | ✅ | 顶栏状态（标签、面包屑、工具项等） |
| `useUserStore` | `store/user.ts` | ✅ | 用户信息与认证（login/logout/getInfo） |
| `useReLoginStore` | `store/reLogin.ts` | ❌ | 401 重新登录弹窗控制 |

## useAppStore

管理应用级别的全局配置。

```tsx
import { useAppStore } from '@zealous-admin/layout'

const appConfig = useAppStore()

// 主要字段
appConfig.name // 应用名称
appConfig.logo // Logo 路径
appConfig.storagePrefix // 存储键名前缀
appConfig.isEnableWatermark // 是否启用水印
appConfig.isEnableMourningMode // 是否启用哀悼模式
appConfig.isEnableDynamicTitle // 是否启用动态标题
appConfig.account.expireMode // 登录过期处理: 'logout' | 'prompt'

// 布局居中配置
appConfig.layout.isCenter // 是否启用居中显示
appConfig.layout.layoutScope // 居中作用范围: 'outside' | 'inside'
appConfig.layout.width // 居中最大宽度 (1200–1600)

// KeepAlive 缓存
appConfig.cachedPages // 需要缓存的页面路径列表
appConfig.setCachedPages(paths) // 更新缓存列表
```

## useThemeStore

管理主题和视觉设置。

```tsx
import { useThemeStore } from '@zealous-admin/layout'

const theme = useThemeStore()

theme.themeType // 主题类型: 'default' | 'mui' | 'bootstrap' | 'glass' | 'illustration' | 'cartoon' | 'shadcn' | 'hacker'
theme.themeColor // 主题色 HEX 值（仅 default 主题生效）
theme.darkMode // 暗色模式：'1' | '0' | 'auto'（仅 default 主题生效）
theme.compactMode // 紧凑模式
theme.colorWeak // 色弱模式
```

## useUserStore

管理用户认证和用户信息。

```tsx
import { useUserStore } from '@zealous-admin/layout'

const userStore = useUserStore()
// 或选择器方式
const token = useUserStore(state => state.userInfo.token)
const username = useUserStore(state => state.userInfo.username)

// 用户信息字段
userStore.userInfo.token      // JWT token
userStore.userInfo.username   // 用户名
userStore.userInfo.nickName   // 昵称
userStore.userInfo.avatar     // 头像
userStore.userInfo.roles      // 角色列表
userStore.userInfo.menus      // 菜单列表
userStore.userInfo.email      // 邮箱
userStore.userInfo.status     // 状态

// 方法（已内置 API 调用）
await userStore.userLogin({ username, password }) // 登录
await userStore.getUserInfo()                     // 获取用户信息
await userStore.userLogout()                      // 登出
userStore.fedLogout()                             // 前端登出（清 token，不调接口）
```

## useReLoginStore

控制 401 过期时的重新登录弹窗。

```tsx
import { useReLoginStore } from '@zealous-admin/layout'

const reLogin = useReLoginStore()

reLogin.visible  // 弹窗是否可见
reLogin.show()   // 显示弹窗
reLogin.hide()   // 隐藏弹窗
```

## usePageStore

管理页面级别的过渡和加载状态。

```tsx
import { usePageStore } from '@zealous-admin/layout'

const page = usePageStore()

page.isEnableTransition // 是否启用页面过渡
page.transitionType // 过渡动画类型
page.isEnablePageLoadProgress // 是否显示加载进度条
page.isMaximize // 是否最大化内容区
page.enterMaximize() // 进入最大化
page.exitMaximize() // 退出最大化
page.toggleMaximize() // 切换最大化状态
```

## useMenuStore

管理菜单数据和交互状态。

```tsx
import { useMenuStore } from '@zealous-admin/layout'

const menu = useMenuStore()

menu.menuData // 次级菜单数据
menu.mainNavData // 主导航数据（由外部传入的 menuData 驱动）
menu.menuType // 当前布局模式（side / only-side / head / only-head / simple）
menu.subMenuCollapse // 侧边栏是否折叠
menu.menuCurrentKeys // 当前选中的菜单项 key 路径（包含完整父节点链路，用于激活图标级联）
menu.mainNavCurrentKeys // 当前选中的主导航 key 路径（同上，父节点链路）
menu.openKeys // 当前展开的子菜单 key
menu.mobileDrawerOpen // 移动端抽屉是否打开（运行时状态，不持久化）
```

### 菜单激活图标链路

`menuCurrentKeys` 和 `mainNavCurrentKeys` 存储的是从根到叶的**完整 key 数组**（如 `['/demo', '/demo/menu-active', '/demo/menu-active/children']`），而非仅最后一级。这使得：

- **`includes(key)`** 用于判断激活图标（`selectIcon`）是否替换 — 链路中所有节点均响应
- **最后一项匹配** 用于判断白色文字高亮（`color`） — 仅精确选中项变色


## useTopBarStore

管理顶栏（标签栏 + 工具栏）的状态。

```tsx
import { useTopBarStore } from '@zealous-admin/layout'

const topBar = useTopBarStore()

topBar.tabBar // 标签栏设置（样式、宽度等）
topBar.toolbar // 工具栏设置（工具项、排序等）
topBar.breadcrumb // 面包屑设置
topBar.tabs // 当前打开的标签列表
topBar.nowTab // 当前活动标签
topBar.settingModel // 设置面板是否打开
```

## 持久化机制

所有 Store 使用 Zustand 的 `persist` 中间件，默认存储到 `localStorage`。可通过 `app.storageType` 切换为 `sessionStorage`。存储键名前缀由 `app.storagePrefix` 控制。

```tsx
// 持久化配置示例
const config: LayoutConfig = {
  app: {
    storagePrefix: 'zealous-admin__', // localStorage 键名前缀
    storageType: 'local', // 或 'session'
    isEnableMemory: true, // 是否启用持久化
  },
}
```
