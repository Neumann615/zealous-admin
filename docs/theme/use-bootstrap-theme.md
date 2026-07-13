# useBootstrapTheme

Bootstrap 经典风格的 Ant Design 主题，提供扁平化设计、渐变按钮和经典的 Bootstrap 视觉语言。

## 设计特点

- **扁平化**：border-radius 统一为 `4px`
- **按钮渐变**：linear-gradient 背景 + 内阴影
- **阴影下拉**：带阴影的 Dropdown 菜单
- **经典配色**：信息色 `#3a87ad`

## 示例

```tsx
import { useBootstrapTheme } from '@zealous-admin/theme'
import { Button, ConfigProvider, Input, Modal } from 'antd'

function App() {
  const bootstrapTheme = useBootstrapTheme()

  return (
    <ConfigProvider {...bootstrapTheme}>
      <div>
        <Button type="primary">Primary Button</Button>
        <Button>Default Button</Button>
        <Modal title="Bootstrap Modal" open>
          <p>This modal uses Bootstrap styling.</p>
        </Modal>
      </div>
    </ConfigProvider>
  )
}
```

## 样式覆盖范围

| 组件 | 覆盖内容 |
|------|----------|
| Button | 渐变背景、内阴影、扁平圆角 |
| Checkbox / Radio | 自定义边框和选中色 |
| Modal | 扁平圆角、标题样式 |
| Alert | Bootstrap 经典配色 |
| Dropdown | 阴影效果 |
| Select | 边框和下拉样式 |
| Switch | 自定义轨道和滑块 |
| Progress | 渐变进度条 |
| ColorPicker | 触发器样式 |
| Tooltip | 圆角和内边距 |

## 技术实现

使用 `antd-style` 的 `createStyles` 实现 CSS-in-JS 样式注入，通过 `ConfigProvider` 的 `classNames` 和 `styles` 覆盖 Ant Design 组件样式。
