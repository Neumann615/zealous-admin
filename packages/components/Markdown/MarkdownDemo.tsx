import { Card, Input } from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { Markdown } from './Markdown'

const useStyles = createStyles(({ token, css }) => ({
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: token.colorBgLayout,
  },
  header: {
    'backgroundColor': token.colorBgContainer,
    'padding': `${token.paddingLG}px`,
    '& h2': {
      margin: 0,
      fontSize: token.fontSizeXL,
      fontWeight: token.fontWeightStrong,
      color: token.colorText,
    },
    '& p': {
      margin: '8px 0 0',
      fontSize: token.fontSizeSM,
      color: token.colorTextSecondary,
    },
  },
  content: {
    flex: 1,
    padding: `${token.paddingLG}px`,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: `${token.paddingLG}px`,
  },
  editorSection: css`
    display: flex;
    gap: 16px;
    min-height: 480px;
  `,
  editorPanel: css`
    flex: 1;
    display: flex;
    flex-direction: column;
  `,
  panelHeader: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  previewPanel: css`
    flex: 1;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    overflow: auto;
    background-color: ${token.colorBgContainer};
  `,
  specialDemo: css`
    width: 100%;
    max-height: 600px;
    overflow-y: auto;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background-color: ${token.colorBgContainer};
    padding: ${token.paddingSM}px;
  `,
}))

const sampleMarkdown = `# 欢迎使用 Markdown 编辑器

## 文本样式

这是一段普通文本，其中包含 **加粗**、*斜体*、~~删除线~~、\`行内代码\` 和 [超链接](https://github.com)。

## 代码块

\`\`\`typescript
interface User {
  id: number
  name: string
  email: string
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`
}
\`\`\`

## 表格

| 特性 | 支持情况 | 备注 |
|------|---------|------|
| GFM | ✅ | 完整支持 |
| 代码高亮 | ✅ | Prism |
| 任务列表 | ✅ | GFM 扩展 |

## 引用

> 这是引用块
> 可以跨多行

## 列表

1. 有序列表项一
2. 有序列表项二
   - 嵌套无序列表
   - 嵌套无序列表

- [x] 完成任务
- [ ] 未完成任务
`

export function MarkdownDemo() {
  const { styles } = useStyles()
  const [markdownText, setMarkdownText] = useState(sampleMarkdown)
  const [viewMode] = useState<'edit' | 'preview' | 'both'>('both')

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>Markdown</h2>
        <p>ZaMarkdown</p>
      </div>
      <div className={styles.content}>
        <Card>
          <div className={styles.editorSection}>
            <div
              className={styles.editorPanel}
              style={{ display: viewMode === 'preview' ? 'none' : '' }}
            >
              <div className={styles.panelHeader}>
                <span>
                  {markdownText.length}
                  {' '}
                  字符
                </span>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Input.TextArea
                  value={markdownText}
                  onChange={e => setMarkdownText(e.target.value)}
                  placeholder="在此输入 Markdown 内容..."
                  style={{ height: '100%', fontFamily: 'Inconsolata, Monaco, Consolas, "Courier New", monospace', fontSize: 14, resize: 'none' }}
                />
              </div>
            </div>
            <div
              className={styles.editorPanel}
              style={{ display: viewMode === 'edit' ? 'none' : '' }}
            >
              <div className={styles.panelHeader}>
                <span>预览</span>
              </div>
              <div className={styles.previewPanel}>
                <Markdown text={markdownText} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
