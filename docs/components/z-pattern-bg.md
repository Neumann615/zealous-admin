# ZaPatternBg 图案背景

图案背景组件，提供 grid（网格）和 dot（圆点）两种图案，可作为页面或区块的装饰性背景。

## 基本用法

```tsx
import { ZaPatternBg } from '@zealous-admin/components'

// 网格图案
<ZaPatternBg pattern="grid">
  <div>你的内容</div>
</ZaPatternBg>

// 圆点图案
<ZaPatternBg pattern="dot">
  <div>你的内容</div>
</ZaPatternBg>
```

## Props

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| pattern | 图案类型 | `'grid' \| 'dot'` | `'grid'` |
| children | 子元素 | `React.ReactNode` | - |

## Demo 组件

`@zealous-admin/components` 同时导出了 `PatternBgDemo` 组件，提供交互式预览体验：

```tsx
import { PatternBgDemo } from '@zealous-admin/components'

<PatternBgDemo />
```
