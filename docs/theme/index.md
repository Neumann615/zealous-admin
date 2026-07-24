# 主题系统

`@zealous-admin/theme` 提供 8 套主题，其中 default 支持主题色和暗色模式自定义，其余 7 套为固定定制主题。所有主题通过 `useThemeByType` Hook 自动映射，在配置面板中一键切换。

## 使用方式

### 在 LayoutProvider 中自动使用（推荐）

layout 包内置了主题类型系统，只需在 `theme.themeType` 配置中指定即可：

```tsx
import { Layout, LayoutProvider } from '@zealous-admin/layout'

const config = {
  theme: {
    themeType: 'cartoon', // 切换到卡通主题
    // themeType: 'default' 时，themeColor 和 darkMode 生效
  },
}

function App() {
  return (
    <LayoutProvider menuData={menuData} defaultSetting={config}>
      <Layout />
    </LayoutProvider>
  )
}
```

### 手动使用主题 Hook

```tsx
import { useCartoonTheme } from '@zealous-admin/theme'
import { ConfigProvider } from 'antd'

function App() {
  const themeConfig = useCartoonTheme()
  return (
    <ConfigProvider {...themeConfig}>
      {/* 你的应用 */}
    </ConfigProvider>
  )
}
```

### 通过 themeMap 映射

```tsx
import { useThemeByType } from '@zealous-admin/layout'

// 传入 ThemeType 字符串，自动返回对应 ConfigProviderProps
const customThemeProps = useThemeByType('mui')
```

## 主题一览

| 主题 | ThemeType | Hook | 设计风格 | 暗色/主题色可切换 |
|------|-----------|------|----------|:---:|
| Default | `'default'` | — | 默认主题 | ✅ |
| MUI | `'mui'` | `useMuiTheme` | Material Design 3，波纹动效、Material 阴影 | ❌ |
| Bootstrap | `'bootstrap'` | `useBootstrapTheme` | Bootstrap 经典，渐变按钮、内阴影 | ❌ |
| Glass | `'glass'` | `useGlassTheme` | 毛玻璃拟态，半透明模糊、backdrop-filter | ❌ |
| Illustration | `'illustration'` | `useIllustrationTheme` | 手绘插画风，粗边框、阴影偏移 | ❌ |
| Cartoon | `'cartoon'` | `useCartoonTheme` | 卡通漫画风，珊瑚红 + 粗描边 + 偏移投影 | ❌ |
| Shadcn | `'shadcn'` | `useShadcnTheme` | shadcn/ui 极简风格，灰白衬线 | ❌ |
| Hacker | `'hacker'` | `useHackerTheme` | 黑客终端，绿色矩阵、暗色背景 | ❌ |

## 主题类型 (ThemeType)

```ts
type ThemeType = 'default' | 'mui' | 'bootstrap' | 'glass' | 'illustration' | 'cartoon' | 'shadcn' | 'hacker'
```

## 定制主题行为

当 `themeType` 不为 `'default'` 时：

- **主题色选择器**：灰色禁用，不可修改
- **暗色模式切换**：灰色禁用，不可切换
- 每个主题有自己固定的颜色体系（主色、背景、边框、圆角等）

只有 `themeType: 'default'` 时才支持主题色自由选择和亮色/暗色/跟随系统切换。

## 安装

```bash
pnpm add @zealous-admin/theme
```

## 扩展自定义主题

1. 在 `packages/theme/` 下创建 `xxxTheme.ts`，导出 `useXxxTheme()` Hook
2. 在 `theme/index.ts` 中导出
3. 在 `layout/themeMap.ts` 的 `useThemeByType` 中添加映射
4. 在 `layout/types/config.d.ts` 的 `ThemeType` 类型中添加新值
5. 在 `layout/utils/data.ts` 的 `themeTypeList` 中添加条目

```ts
// 1. myTheme.ts
import type { ConfigProviderProps } from 'antd'
import { theme } from 'antd'

export function useMyTheme() {
  return useMemo<ConfigProviderProps>(() => ({
    theme: {
      algorithm: theme.defaultAlgorithm,
      token: { colorPrimary: '#123456' },
    },
  }), [])
}

// 2. themeMap.ts
import { useMyTheme } from '@zealous-admin/theme'
const myConfig = useMyTheme()
// ...
return { my: myConfig, ... }

// 3. config.d.ts
export type ThemeType = 'default' | ... | 'my'
```
