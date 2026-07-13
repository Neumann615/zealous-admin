# useGlassTheme

毛玻璃（Glassmorphism）风格的 Ant Design 主题，使用 `backdrop-filter` 和半透明背景实现现代玻璃质感。

## 设计特点

- **毛玻璃模糊**：`backdrop-filter: blur(12px)` 背景模糊
- **圆角设计**：所有组件 border-radius 统一 `12px`
- **半透明背景**：使用 `color-mix` 混合透明度
- **玻璃边框**：半透明白色边框 + 内阴影
- **快速动效**：动画时长 0.05s-0.2s，响应迅速

## 示例

```tsx
import { useGlassTheme } from '@zealous-admin/theme'
import { Button, Card, ConfigProvider, Modal } from 'antd'

function App() {
  const glassTheme = useGlassTheme()

  return (
    <ConfigProvider {...glassTheme}>
      <div>
        <Card title="Glass Card">
          <p>这张卡片具有毛玻璃效果。</p>
          <Button type="primary">Glass Button</Button>
        </Card>
        <Modal title="Glass Modal" open>
          <p>This modal has glassmorphism styling.</p>
        </Modal>
      </div>
    </ConfigProvider>
  )
}
```

## 样式覆盖范围

| 组件 | 覆盖内容 |
|------|----------|
| Card | 毛玻璃背景、模糊、玻璃边框 |
| Modal | 毛玻璃遮罩、圆角弹窗 |
| Button | 半透明背景、玻璃质感边框 |
| Alert | 半透明背景配色 |
| Dropdown | 毛玻璃下拉菜单 |
| Select / DatePicker | 毛玻璃下拉面板 |
| Input / InputNumber | 半透明背景输入框 |
| Popover | 毛玻璃弹出层 |
| Switch / Radio / Segmented | 圆角优化 |
| Progress | 毛玻璃进度条 |
| ColorPicker | 面板样式 |

## 技术细节

- 使用 `color-mix(in srgb, ...)` CSS 函数生成透明背景色
- 禁止嵌套容器中的 `backdrop-filter`（避免性能问题）
- `inset` 内阴影模拟玻璃反光效果
