# ZaSparklesText 闪烁文字

在文字周围生成随机分布的闪烁粒子（星星），为标题或重点文字添加灵动视觉效果的组件。

## 代码演示

### 基础用法

```tsx
import { ZaSparklesText } from '@zealous-admin/components'

<ZaSparklesText text="欢迎回来" />
```

### 指定闪烁形状

```tsx
// 仅使用星形
<ZaSparklesText text="Star Only" shapes={['star']} />

// 混合使用
<ZaSparklesText text="Mixed Shapes" shapes={['star', 'four-point-star', 'flower']} />
```

### 调节粒子数量

```tsx
<ZaSparklesText text="密集粒子" shapeCount={30} />
<ZaSparklesText text="稀疏粒子" shapeCount={5} />
```

### 调节动画速度

```tsx
<ZaSparklesText text="快速闪烁" animationSpeed="fast" fontSize={36} />
<ZaSparklesText text="慢速闪烁" animationSpeed="slow" fontSize={24} />
```

## API

### ZaSparklesText Props

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| text | 要显示的文字 | `string` | - |
| fontSize | 字体大小（px） | `number` | `30` |
| shapeCount | 闪烁粒子的数量 | `number` | `text.length * 1.2` |
| shapes | 粒子形状类型列表 | `('star' \| 'four-point-star' \| 'flower')[]` | `['star']` |
| animationSpeed | 动画速度 | `'fast' \| 'medium' \| 'slow'` | `'medium'` |

::: tip 颜色说明
粒子颜色会从 Ant Design 色彩系统中自动随机选取，每次渲染时颜色会有所不同，带来丰富的视觉效果。
:::

## 演示组件

`ZaSparklesTextDemo` 提供了一个交互式演示，可实时调节文字内容、粒子数量、形状类型等参数。

```tsx
import { ZaSparklesTextDemo } from '@zealous-admin/components'

<ZaSparklesTextDemo />
```
