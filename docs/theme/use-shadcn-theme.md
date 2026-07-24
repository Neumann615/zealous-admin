# useShadcnTheme Shadcn 主题

shadcn/ui 极简风格主题，采用 zinc 灰白配色体系，干净克制，强调内容而非装饰。

## 设计令牌

| 令牌 | 值 | 说明 |
|------|-----|------|
| `colorPrimary` | `#262626` | 深灰色主色 |
| `colorSuccess` | `#22c55e` | 绿色（Tailwind green-500） |
| `colorWarning` | `#f97316` | 橙色（Tailwind orange-500） |
| `colorError` | `#ef4444` | 红色（Tailwind red-500） |
| `colorInfo` | `#262626` | 同主色 |
| `colorBgLayout` | `#fafafa` | 浅灰背景 |
| `colorBgContainer` | `#ffffff` | 纯白容器 |
| `colorBorder` | `#e5e5e5` | 浅灰边框 |
| `borderRadius` | `10` | 圆角（大号 14，小号 2） |
| `boxShadow` | `0 1px 3px 0 rgba(0,0,0,0.1)` | 极轻投影 |
| `boxShadowSecondary` | `0 4px 6px -1px rgba(0,0,0,0.1)` | 悬浮投影 |

## 组件定制

### 按钮

- Primary：深色背景 `#18181b` + 白色文字，无投影
- Default：白色背景 + 浅灰边框，hover 变 `#f4f4f5`
- Danger：红色背景 `#dc2626`
- 圆角统一 6px

### 输入框

- 边框 `#e4e4e7`，hover 变 `#a1a1aa`，focus 变 `#18181b`
- 无激活阴影（`activeShadow: 'none'`）
- 圆角 6px

### Select / Dropdown

- 弹出层圆角 8px，浅投影
- 选中项背景 `#f4f4f5`，加粗

### 通知 / 弹窗

- 通知带浅灰边框 + 轻投影
- 弹窗圆角 12px

### 布局

- body / footer 背景 `#fafafa`
- header 纯白背景 + 深灰文字
- sider 纯白背景

## 使用方式

```tsx
// 方式一：在 LayoutProvider 配置中指定
const config = {
  theme: { themeType: 'shadcn' },
}

// 方式二：手动在 ConfigProvider 中使用
import { useShadcnTheme } from '@zealous-admin/theme'
import { ConfigProvider } from 'antd'

function App() {
  const themeConfig = useShadcnTheme()
  return <ConfigProvider {...themeConfig}>{/* 你的应用 */}</ConfigProvider>
}
```

## 注意事项

- 固定算法为 `theme.defaultAlgorithm`（亮色），不可切换暗色模式
- 主题色不可自定义
- 整体视觉非常克制，适合内容密集型后台
