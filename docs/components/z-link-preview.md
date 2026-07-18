# ZaLinkPreview 链接预览

当鼠标悬停在链接上时，弹出悬浮预览卡片，显示目标网页的截图和元数据。

## 代码演示

### 基础用法

```tsx
import { ZaLinkPreview } from '@zealous-admin/components'

<ZaLinkPreview url="https://github.com">
  <a href="https://github.com">访问 GitHub</a>
</ZaLinkPreview>
```

### 自定义尺寸

```tsx
<ZaLinkPreview url="https://ant.design" width={320} height={200}>
  <a href="https://ant.design">Ant Design 官网</a>
</ZaLinkPreview>
```

## API

### ZaLinkPreview Props

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| url | 要预览的目标链接地址 | `string` | - |
| children | 触发预览的子元素 | `React.ReactNode` | - |
| width | 预览弹窗宽度（px） | `number` | `200` |
| height | 预览弹窗高度（px） | `number` | `160` |
| className | 自定义 CSS 类名 | `string` | - |

## 演示组件

`ZaLinkPreviewDemo` 提供了一个交互式演示，内置示例 URL 和可调的宽高参数。

```tsx
import { ZaLinkPreviewDemo } from '@zealous-admin/components'

<ZaLinkPreviewDemo />
```
