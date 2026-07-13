# useMuiTheme

Material Design 3 启发的 Ant Design 主题，完整复刻 Material UI 的视觉语言，包括色彩系统、阴影层级和波纹动效。

## 设计特点

- **Material Blue**：主色 `#1976d2`
- **完整色彩令牌**：覆盖所有 Ant Design 颜色令牌（`colorPrimary`、`colorSuccess`、`colorError` 等）
- **波纹动效**：按钮点击自定义波纹效果 `showInsetEffect`
- **Material 阴影**：多层级阴影系统
- **Roboto 字体**：优先使用 Roboto
- **大写按钮**：letter-spacing 0.5px

## 示例

```tsx
import { useMuiTheme } from '@zealous-admin/theme'
import { Button, ConfigProvider, Input, Select } from 'antd'

function App() {
  const muiTheme = useMuiTheme()

  return (
    <ConfigProvider {...muiTheme}>
      <div>
        <Button type="primary">CONTAINED</Button>
        <Button>OUTLINED</Button>
        <Input placeholder="Standard input" />
        <Select
          placeholder="Select option"
          options={[{ value: '1', label: 'Option 1' }]}
        />
      </div>
    </ConfigProvider>
  )
}
```

## 样式覆盖范围

| 组件 | 覆盖内容 |
|------|----------|
| 全局色彩 | 所有 Ant Design token 颜色值统一为 Material Design 3 配色 |
| Button | 大写、letter-spacing、Material 阴影层级、波纹动效 |
| Input | 底部边框样式（标准 Material TextField） |
| Select | MUI 风格下拉 |
| Progress | MUI 圆形/线性进度条 |

## 色彩令牌

主题完全覆盖了 Ant Design 的 `color*` 令牌体系：

```typescript
colorPrimary: '#1976d2',
colorSuccess: '#2e7d32',
colorWarning: '#ed6c02',
colorError: '#d32f2f',
colorInfo: '#0288d1',
// ... 以及对应的 hover、active、bg、border、text 变体
```

## 波纹动效

MUI 主题通过 `@rc-component/util` 实现自定义波纹效果：

- **Inset Wave**: 按钮内部扩散的波纹（`showInsetEffect`）
- 波纹从点击位置开始扩散
- 使用 `requestAnimationFrame` 驱动动画

## Shadow 系统

复制了 Material Design 的多层级阴影：

- Button: 多层级 box-shadow
- Card/Modal: Material 浮层阴影
- 悬停状态: 阴影加深（模拟 Material 的 elevation 变化）
