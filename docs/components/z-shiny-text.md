# ZShinyText 流光文字

为文字添加流动光泽效果的组件，类似 Apple 产品页面的"shimmer"效果。

## 代码演示

### 基础用法

```tsx
import { ZShinyText } from '@zealous-admin/components'

<ZShinyText text="Hello zealous-admin" />
```

### 调节速度

```tsx
<ZShinyText text="极速流光" speed="fast" />
<ZShinyText text="中速流光" speed="medium" />
<ZShinyText text="慢速流光" speed="slow" />
```

### 自定义颜色

```tsx
<ZShinyText
  text="自定义色彩"
  shinyColor="#ff4d4f"
  textColor="#ffffff"
  fontSize={24}
/>
```

## API

### ZShinyText Props

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| text | 要显示的文字内容 | `string` | - |
| fontSize | 字体大小（px） | `number` | `18` |
| speed | 流光动画速度 | `'slow' \| 'medium' \| 'fast'` | `'medium'` |
| shinyColor | 高光颜色 | `string` | - |
| textColor | 文字颜色 | `string` | - |

## 演示组件

`ZShinyTextDemo` 提供了一个交互式演示，可实时调节文字内容、速度、颜色等参数。

```tsx
import { ZShinyTextDemo } from '@zealous-admin/components'

<ZShinyTextDemo />
```
