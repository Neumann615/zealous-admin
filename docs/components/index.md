# 组件总览

`@zealous-admin/components` 提供了 9 个开箱即用的业务组件，涵盖图标选择、文字动效、交互验证等场景。

## 组件列表

| 组件 | 说明 | Demo 组件 |
|------|------|-----------|
| [ZaIcon](/components/z-icon) | 动态图标渲染器，支持 32 个图标库 | - |
| [ZaIconPicker](/components/z-icon) | 图标选择器，带侧边栏、搜索、网格浏览 | ZaIconPickerDemo |
| [ZaLinkPreview](/components/z-link-preview) | 链接预览悬浮卡片 | ZaLinkPreviewDemo |
| [ZaMarkdown](/components/z-markdown) | Markdown 渲染组件 | ZaMarkdownDemo |
| [ZaMarquee](/components/z-marquee) | 跑马灯/无限滚动 | ZaMarqueeDemo |
| [ZaPatternBg](/components/z-pattern-bg) | 图案背景（grid/dot 两种图案） | ZaPatternBgDemo |
| [ZaShinyText](/components/z-shiny-text) | 流光/光泽文字动效 | ZaShinyTextDemo |
| [ZaSliderCaptcha](/components/z-slider-captcha) | 滑块验证码（3 种模式） | ZaSliderCaptchaDemo |
| [ZaSparklesText](/components/z-sparkles-text) | 闪烁粒子文字动效 | ZaSparklesTextDemo |

每个组件都附带一个 `*Demo` 变体，它是对应组件的交互式演示版本，内置了可调参数面板，方便你在开发时快速体验组件效果。

## 安装使用

```bash
pnpm add @zealous-admin/components
```

```tsx
import { ZaMarquee, ZaShinyText } from '@zealous-admin/components'
```

所有组件都依赖 `react`、`react-dom`、`antd`、`antd-style` 作为 peer dependencies。
