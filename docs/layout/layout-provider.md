# LayoutProvider 布局提供者

`LayoutProvider` 是整个布局系统的上下文提供者。它负责初始化 Zustand 状态管理、配置 Ant Design 主题、处理系统暗色模式监听等。

## Props

| 属性 | 说明 | 类型 | 必填 |
|------|------|------|------|
| children | 子元素 | `React.ReactNode` | 是 |
| menuData | 菜单数据数组 | `MenuItem[]` | 是 |
| menuIconMap | 菜单图标映射表 | `Record<string, React.ComponentType>` | 否 |
| defaultSetting | 默认布局配置 | `LayoutConfig` | 否 |

## 内部职责

### 1. 主题管理
- 将 `themeColor` 注入 Ant Design `ConfigProvider`
- 根据 `darkMode` 自动切换暗色/亮色算法（`theme.darkAlgorithm` / `theme.defaultAlgorithm`）
- `darkMode: 'auto'` 时监听系统 `prefers-color-scheme` 媒体查询

### 2. 状态初始化
- 从 `defaultSetting` 中解析配置，初始化 5 个 Zustand Store：
  - `useAppStore` — 应用设置
  - `useThemeStore` — 主题设置
  - `useMenuStore` — 菜单状态
  - `usePageStore` — 页面状态
  - `useTopBarStore` — 顶栏状态
- 启用持久化（localStorage / sessionStorage）

### 3. 特殊模式
- **哀悼模式** (`isEnableMourningMode`): 整个页面 `filter: grayscale(1)`
- **色弱模式** (`colorWeak`): 整个页面 `filter: invert(80%) hue-rotate(180deg)`
- **快乐效果** (`happyEffect`): 使用 `@ant-design/happy-work-theme` 的 HappyProvider

### 4. Provider 层级

```
StyleProvider (antd-style)
  └─ ConfigProvider (antd)
       └─ HappyProvider (@ant-design/happy-work-theme)
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
  },
  theme: {
    themeColor: '#1677ff',
    darkMode: 'auto', // 跟随系统
    compactMode: false,
    colorWeak: false,
    happyEffect: false,
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
    >
      <Layout />
    </LayoutProvider>
  )
}
```
