# ZaMarkdown Markdown 渲染

Markdown 渲染组件，基于 [react-markdown](https://github.com/remarkjs/react-markdown)，支持代码高亮显示。

## 基本用法

```tsx
import { ZaMarkdown } from '@zealous-admin/components'

<ZaMarkdown content="# Hello World\n\n这是一段 **Markdown** 文本。" />
```

## Props

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| content | Markdown 文本内容 | `string` | - |

## Demo 组件

`@zealous-admin/components` 同时导出了 `MarkdownDemo` 组件，提供交互式预览体验：

```tsx
import { MarkdownDemo } from '@zealous-admin/components'

<MarkdownDemo />
```

## 特性

- 支持标准 Markdown 语法（标题、列表、链接、图片、表格等）
- 代码块自动语法高亮（通过 react-syntax-highlighter）
- 与 `react-markdown` 生态完全兼容
