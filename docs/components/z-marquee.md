# ZaMarquee 跑马灯

基于 CSS 关键帧动画实现的无限滚动跑马灯组件，支持水平和垂直方向。

## 代码演示

### 基础用法

```tsx
import { ZaMarquee } from '@zealous-admin/components'

<ZaMarquee>
  <span>重要通知：系统将于今晚 22:00 进行维护升级，届时服务将暂停约 30 分钟。</span>
</ZaMarquee>
```

### 垂直滚动

```tsx
<ZaMarquee direction="vertical" duration={15}>
  <div>公告 1：系统升级通知</div>
  <div>公告 2：新功能上线</div>
  <div>公告 3：假期值班安排</div>
</ZaMarquee>
```

### 自定义配置

```tsx
<ZaMarquee
  pauseOnHover
  reverse
  duration={20}
  gap={32}
  gradient={false}
>
  <span>悬停时暂停 · 反向滚动 · 无渐变遮罩</span>
</ZaMarquee>
```

## API

### ZaMarquee Props

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| children | 滚动内容 | `React.ReactNode` | - |
| pauseOnHover | 鼠标悬停时是否暂停动画 | `boolean` | `false` |
| reverse | 是否反向滚动 | `boolean` | `false` |
| repeat | 内容重复次数（用于无缝衔接） | `number` | `2` |
| duration | 动画持续时间（秒） | `number` | `30` |
| gradient | 是否显示边缘渐变遮罩 | `boolean` | `true` |
| gap | 内容之间的间距（px） | `number` | `16` |
| direction | 滚动方向 | `'horizontal' \| 'vertical'` | `'horizontal'` |
| className | 自定义 CSS 类名 | `string` | - |
| style | 自定义内联样式 | `React.CSSProperties` | - |

## 演示组件

`ZaMarqueeDemo` 提供了一个交互式演示，包含所有可调参数的控制面板。

```tsx
import { ZaMarqueeDemo } from '@zealous-admin/components'

<ZaMarqueeDemo />
```
