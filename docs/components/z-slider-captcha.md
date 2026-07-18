# ZaSliderCaptcha 滑块验证码

基于 `rc-slider-captcha` 实现的滑块拼图验证码组件，支持三种交互模式。

## 代码演示

### 滑块模式（slider）

最经典的滑块验证方式，拖动滑块到缺口位置完成验证。

```tsx
import { ZaSliderCaptcha } from '@zealous-admin/components'

<ZaSliderCaptcha
  type="slider"
  onVerify={(success) => {
    if (success) {
      console.log('验证通过')
    }
  }}
/>
```

### 嵌入模式（embed）

将拼图直接嵌入到页面中显示。

```tsx
<ZaSliderCaptcha type="embed" onVerify={success => console.log(success)} />
```

### 浮动模式（float）

拼图块浮动显示，不占据固定位置。

```tsx
<ZaSliderCaptcha type="float" onVerify={success => console.log(success)} />
```

### 自定义文案

```tsx
<ZaSliderCaptcha
  type="slider"
  tipText={{
    default: '向右滑动完成验证',
    moving: '请继续拖动...',
    error: '验证失败，请重试',
    success: '验证通过！',
  }}
  onVerify={success => console.log(success)}
/>
```

### 自定义背景图

```tsx
<ZaSliderCaptcha
  bgImages={['/captcha-bg-1.jpg', '/captcha-bg-2.jpg']}
  bgSize={{ width: 384, height: 216 }}
  onVerify={success => console.log(success)}
/>
```

## API

### ZaSliderCaptcha Props

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| type | 验证码展示模式 | `'slider' \| 'embed' \| 'float'` | `'slider'` |
| onVerify | 验证结果回调 | `(success: boolean) => void` | - |
| bgSize | 背景图片尺寸 | `{ width: number, height: number }` | `{ width: 384, height: 216 }` |
| tipText | 自定义提示文案 | `{ default?, moving?, error?, success? }` | - |
| className | 自定义 CSS 类名 | `string` | - |
| bgImages | 自定义背景图片（URL 或数组） | `string \| string[]` | 内置默认图片 |

## 演示组件

`ZaSliderCaptchaDemo` 提供了三种模式的切换演示，可直接体验不同模式的效果。

```tsx
import { ZaSliderCaptchaDemo } from '@zealous-admin/components'

<ZaSliderCaptchaDemo />
```
