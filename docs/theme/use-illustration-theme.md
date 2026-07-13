# useIllustrationTheme

插画风格（Illustration Style）的 Ant Design 主题，采用粗边框、阴影偏移和温暖配色，营造手绘插画的趣味感。

## 设计特点

- **粗边框**：`lineWidth: 3`，组件边框宽度加粗
- **阴影偏移**：`boxShadow: "4px 4px 0"` 描边偏移效果
- **大圆角**：LG 组件 `16px`，SM 组件 `8px`
- **温暖色调**：背景色 `#FFF9F0`，主色 `#52C41A`
- **大写按钮**：按钮文字 uppercase，字体 15px/weight 600

## 示例

```tsx
import { useIllustrationTheme } from '@zealous-admin/theme'
import { Alert, Button, ConfigProvider, Input } from 'antd'

function App() {
  const illustrationTheme = useIllustrationTheme()

  return (
    <ConfigProvider {...illustrationTheme}>
      <div style={{ background: '#FFF9F0', padding: 24 }}>
        <Button type="primary" size="large">GET STARTED</Button>
        <Button size="large">LEARN MORE</Button>
        <Alert
          type="success"
          message="Success!"
          description="Your action was completed successfully."
        />
        <Input placeholder="Type something..." />
      </div>
    </ConfigProvider>
  )
}
```

## 样式覆盖范围

| 组件 | 覆盖内容 |
|------|----------|
| Button | 粗边框、阴影偏移、大写文字、加粗字体 |
| Modal | 粗边框弹窗、大圆角 |
| Alert | 粗边框 + 阴影偏移 |
| Dropdown | 粗边框下拉菜单 |
| Select | 加高组件（40/34/48） |
| Input / InputNumber | 粗边框、大圆角 |
| Progress | 粗边框进度条 |
| ColorPicker / Popover | 面板圆角 |
| Tooltip | 描边偏移 |

## 设计灵感

这套主题的设计灵感来源于现代插画风格 UI，常见于儿童应用、创意工具和品牌营销页面。粗线条和偏移阴影模拟了手绘线条的质感。
