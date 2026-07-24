# useHackerTheme 黑客主题

黑客终端风格主题，采用经典的绿色矩阵配色 + 暗色背景 + 霓虹发光边框，致敬复古命令行界面。

## 设计令牌

| 令牌 | 值 | 说明 |
|------|-----|------|
| `colorPrimary` | `#39ff14` | 霓虹绿主色 |
| `colorText` | `#39ff14` | 全局文字色 |
| `colorInfo` | `#39ff14` | 信息色与主色统一 |
| `borderRadius` | `0` | 锐利直角，复古终端感 |
| `lineWidth` | `2` | 粗线条 |
| `algorithm` | `darkAlgorithm` | 固定暗色算法 |

## 布局配色

| 区域 | 背景色 | 说明 |
|------|--------|------|
| `bodyBg` / `footerBg` | `#030603` | 极深暗绿底色 |
| `headerBg` | `#051105` | 略浅暗绿色 header |
| `siderBg` | `#030603` | 侧边栏同底色 |
| `headerColor` / `triggerColor` | `#39ff14` | 绿色霓虹文字 |

## 组件定制

### 霓虹发光边框

所有输入类组件（Input、Select、DatePicker、InputNumber）+ 弹窗/通知都包裹在绿色发光边框中：

```css
border: 2px solid #39ff14;
box-shadow: 0 0 3px #39ff14, inset 0 0 10px #39ff14;
```

### 菜单

- 暗色菜单项选中时背景变为 `#39ff14`，文字变黑
- 悬浮时绿色高亮

### 按钮

- 默认按钮：绿色发光边框
- solid 按钮：无边框纯色填充，字体加粗
- danger solid 按钮：红色发光阴影

### 进度条

- 轨道黑色半透明，进度条霓虹绿

### 全局

- 所有文字带绿色光影 text-shadow

## 使用方式

```tsx
// 方式一：在 LayoutProvider 配置中指定
const config = {
  theme: { themeType: 'hacker' },
}

// 方式二：手动在 ConfigProvider 中使用
import { useHackerTheme } from '@zealous-admin/theme'
import { ConfigProvider } from 'antd'

function App() {
  const themeConfig = useHackerTheme()
  return <ConfigProvider {...themeConfig}>{/* 你的应用 */}</ConfigProvider>
}
```

## 注意事项

- 固定算法为 `theme.darkAlgorithm`（暗色），不可切换亮色模式
- 主题色不可自定义
- 所有圆角为 0（直角），符合终端美学
