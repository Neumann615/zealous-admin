# useCartoonTheme 卡通主题

卡通漫画风格主题，采用珊瑚红主色调 + 粗描边 + 偏移投影的核心技法，营造活泼、亲和的手绘漫画质感。

## 设计令牌

| 令牌 | 值 | 说明 |
|------|-----|------|
| `colorPrimary` | `#FF6B6B` | 珊瑚红主色 |
| `colorSuccess` | `#51CF66` | 鲜绿 |
| `colorWarning` | `#FFD43B` | 明黄 |
| `colorInfo` | `#74C0FC` | 天蓝 |
| `colorBorder` | `#2D3436` | 深炭色描边线 |
| `colorBgBase` | `#FFF9F0` | 暖奶油底色 |
| `colorBgContainer` | `#FFFFFF` | 纯白容器背景 |
| `borderRadius` | `14` | 圆角（大号 20，小号 8） |
| `lineWidth` | `3` | 描边宽度 |
| `fontWeightStrong` | `700` | 加粗字重 |
| `boxShadow` | `4px 4px 0 #2D3436` | 偏移投影（无模糊） |

## 组件定制

### 按钮

- 粗边框 + `4px 4px` 偏移投影
- hover 时略微上浮（`translate(-1px, -1px)`），投影加深至 `6px 6px`
- active 时下沉（`translate(2px, 2px)`），投影缩小 — 模拟物理按压感

### 卡片 / 弹窗

- 统一的粗描边 + 偏移投影包裹
- 弹窗 header/footer 有独立的下/上边框分割线

### 输入框 / Select

- 粗边框 + `2px 2px` 小偏移投影
- focus 时边框变主色，投影加深

### 进度条 / 开关 / Segmented

- 粗边框 + 偏移投影的轨道
- 开关滑块带立体下沉效果

## 使用方式

```tsx
// 方式一：在 LayoutProvider 配置中指定
const config = {
  theme: { themeType: 'cartoon' },
}

// 方式二：手动在 ConfigProvider 中使用
import { useCartoonTheme } from '@zealous-admin/theme'
import { ConfigProvider } from 'antd'

function App() {
  const themeConfig = useCartoonTheme()
  return <ConfigProvider {...themeConfig}>{/* 你的应用 */}</ConfigProvider>
}
```

## 注意事项

- 固定算法为 `theme.defaultAlgorithm`（亮色），不可切换暗色模式
- 主题色不可自定义
