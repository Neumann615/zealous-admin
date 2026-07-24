# LayoutProvider 布局提供者

`LayoutProvider` 是整个布局系统的上下文提供者。它负责初始化 Zustand 状态管理、配置 Ant Design 主题、处理系统暗色模式监听、主题类型路由等。

## Props

| 属性 | 说明 | 类型 | 必填 |
|------|------|------|------|
| children | 子元素 | `React.ReactNode` | 是 |
| menuData | 菜单数据数组 | `MenuItem[]` | 是 |
| menuIconMap | 菜单图标映射表 | `Record<string, React.ComponentType>` | 否 |
| defaultSetting | 默认布局配置 | `LayoutConfig` | 否 |
| cachedPages | 需要 KeepAlive 缓存的页面路径列表 | `string[]` | 否 |

## 内部职责

### 1. 主题管理

**default 主题**（`themeType: 'default'`）：
- 将 `themeColor` 注入 Ant Design `ConfigProvider`
- 根据 `darkMode` 自动切换暗色/亮色算法（`theme.darkAlgorithm` / `theme.defaultAlgorithm`）
- `darkMode: 'auto'` 时监听系统 `prefers-color-scheme` 媒体查询

**定制主题**（`themeType` 不为 `'default'`）：
- 通过 `useThemeByType(themeType)` 获取完整主题配置
- 直接透传给 `ConfigProvider`，暗色模式和主题色不可切换
- 各主题固定自己的算法和色彩体系

### 2. 状态初始化

从 `defaultSetting` 中解析配置，初始化 7 个 Zustand Store：

| Store | 说明 |
|-------|------|
| `useAppStore` | 应用设置（名称、Logo、版权、水印等） |
| `useThemeStore` | 主题设置（颜色、暗色、主题类型等） |
| `useMenuStore` | 菜单数据与交互状态 |
| `usePageStore` | 页面状态（过渡动画、进度条、最大化等） |
| `useTopBarStore` | 顶栏状态（标签栏、工具栏、面包屑） |
| `useUserStore` | 用户状态（userInfo、login、logout、getUserInfo） |
| `useReLoginStore` | 401 重新登录弹窗控制 |

### 3. 特殊模式

- **哀悼模式** (`isEnableMourningMode`): 整个页面 `filter: grayscale(1)`
- **色弱模式** (`colorWeak`): 整个页面 `filter: invert(80%) hue-rotate(180deg)`

### 4. Provider 层级

```
StyleProvider (antd-style)
  └─ ConfigProvider (antd) — 根据 themeType 路由到 default/custom 主题配置
       └─ App (antd) — 提供 message/modal 全局上下文
            └─ AppMessageProvider — useAppMessage Hook
                 └─ ReLoginModal — 401 过期重新登录弹窗
                      └─ children (你的应用)
```

## 基础示例

```tsx
import type { LayoutConfig } from '@zealous-admin/layout'
import { Layout, LayoutProvider } from '@zealous-admin/layout'

const config: LayoutConfig = {
  app: {
    name: '我的后台',
    logo: '/logo.svg',
    account: {
      expireMode: 'prompt', // 'logout' 直接退出 | 'prompt' 弹窗重登
    },
  },
  theme: {
    themeType: 'default',  // 主题类型
    themeColor: '#1677ff', // 仅 default 生效
    darkMode: 'auto',      // 仅 default 生效
    compactMode: false,
    colorWeak: false,
  },
  menu: {
    menuType: 'side',
    isEnableSubMenuCollapse: true,
  },
}

const menuData = [
  { id: '1', key: '/dashboard', label: '仪表盘', icon: 'ai:DashboardOutlined' },
  { id: '2', key: '/users', label: '用户管理', icon: 'ai:UserOutlined' },
]

function App() {
  return (
    <LayoutProvider
      menuData={menuData}
      defaultSetting={config}
      cachedPages={['/dashboard']}  // KeepAlive 缓存页面
    >
      <Layout />
    </LayoutProvider>
  )
}
```

## 401 过期处理

layout 包的 HTTP 实例内置了 401 过期分流逻辑，根据 `app.account.expireMode` 决定：

- **`'logout'`**：直接调用 `logoutAction()`，清除 token 和持久化数据，跳转登录页
- **`'prompt'`**：弹出 `ReLoginModal` 重新输入用户名密码，确认后刷新页面，取消则退出

HTTP 响应拦截器中会在显示错误消息后延迟 2 秒再执行操作，确保用户能看到提示信息。
