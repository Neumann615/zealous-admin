# 主题系统

`@zealous-admin/theme` 提供了 4 套独立主题 Hook，每套主题返回 Ant Design `ConfigProvider` 的配置对象（`ConfigProviderProps`），直接展开即可应用。

## 使用方式

所有主题 Hook 的使用方式相同：

```tsx
import { useGlassTheme } from '@zealous-admin/theme'
import { ConfigProvider } from 'antd'

function App() {
  const themeConfig = useGlassTheme()
  return (
    <ConfigProvider {...themeConfig}>
      {/* 你的应用 */}
    </ConfigProvider>
  )
}
```

## 主题一览

| 主题 Hook | 设计风格 | 主色 | 特点 |
|-----------|----------|------|------|
| `useBootstrapTheme` | Bootstrap 经典风格 | `#3a87ad` | 渐变按钮、内阴影、经典表单 |
| `useGlassTheme` | 毛玻璃 (Glassmorphism) | - | 透明/半透明背景、backdrop-filter 模糊 |
| `useIllustrationTheme` | 插画风格 | `#52C41A` | 粗边框、阴影偏移、手绘感 |
| `useMuiTheme` | Material Design 3 | `#1976d2` | 波纹动效、Material 阴影系统 |

## 安装

```bash
pnpm add @zealous-admin/theme
```

## 与 LayoutProvider 共用

主题 Hook 可以与 `@zealous-admin/layout` 的 `LayoutProvider` 配合使用：

```tsx
import { Layout, LayoutProvider } from '@zealous-admin/layout'
import { useMuiTheme } from '@zealous-admin/theme'
import { ConfigProvider } from 'antd'

function App() {
  const muiTheme = useMuiTheme()

  return (
    <ConfigProvider {...muiTheme}>
      <LayoutProvider menuData={[]} defaultSetting={{}}>
        <Layout />
      </LayoutProvider>
    </ConfigProvider>
  )
}
```

::: tip 主题优先级
`LayoutProvider` 内部的 `ConfigProvider` 会应用 `themeColor` 等配置，外层的主题 Hook 提供基础样式，两者可以叠加使用。
:::
