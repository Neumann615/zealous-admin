import { createStyles } from 'antd-style'
import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import remarkGfm from 'remark-gfm'

const useStyles = createStyles(({ token, css }) => ({
  markdownBody: css`
    color-scheme: dark;
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    margin: 0;
    color: ${token.colorTextBase};
    background-color: ${token.colorBgContainer};
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica,
      Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
    font-size: 16px;
    line-height: 1.5;
    word-wrap: break-word;
    box-sizing: border-box;
    padding: ${token.paddingSM}px;
    
    /* 表格样式 */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid ${token.colorBorderSecondary};
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: ${token.colorBgContainerDisabled};
      font-weight: 600;
    }
    tr:nth-child(even) {
      background-color: ${token.colorBgElevated};
    }
    
    /* 链接样式 */
    a {
      color: ${token.colorPrimary};
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    
    /* 引用块样式 */
    blockquote {
      border-left: 4px solid ${token.colorPrimary};
      padding-left: 16px;
      margin: 16px 0;
      color: ${token.colorTextDescription};
    }
    
    /* 列表样式 */
    ul, ol {
      padding-left: 24px;
    }
    li {
      margin: 4px 0;
    }
  `,
  markdownContainer: css`
    width: 100%;
    height: 100%;
    overflow-y: auto;
  `,
}))

interface MarkdownProps {
  text: string
}

export function Markdown(props: MarkdownProps) {
  const { styles, theme } = useStyles()
  const { text, ...rest } = props
  const highlighterTheme = useMemo<any>(() => {
    return {
      'code[class*="language-"]': {
        color: theme.colorText,
        textShadow: '0 1px rgba(0, 0, 0, 0.3)',
        fontFamily:
          'Inconsolata, Monaco, Consolas, \'Courier New\', Courier, monospace',
        direction: 'ltr',
        textAlign: 'left',
        whiteSpace: 'pre',
        wordSpacing: 'normal',
        wordBreak: 'normal',
        lineHeight: '1.5',
        MozTabSize: '4',
        OTabSize: '4',
        tabSize: '4',
        WebkitHyphens: 'none',
        MozHyphens: 'none',
        msHyphens: 'none',
        hyphens: 'none',
      },
      'pre[class*="language-"]': {
        color: theme.colorText,
        textShadow: '0 1px rgba(0, 0, 0, 0.3)',
        fontFamily:
          'Inconsolata, Monaco, Consolas, \'Courier New\', Courier, monospace',
        direction: 'ltr',
        textAlign: 'left',
        whiteSpace: 'pre',
        wordSpacing: 'normal',
        wordBreak: 'normal',
        lineHeight: '1.5',
        MozTabSize: '4',
        OTabSize: '4',
        tabSize: '4',
        WebkitHyphens: 'none',
        MozHyphens: 'none',
        msHyphens: 'none',
        hyphens: 'none',
        padding: '1em',
        margin: '.5em 0',
        overflow: 'auto',
        borderRadius: '0.3em',
        background: theme.colorBgContainerDisabled,
      },
      ':not(pre) > code[class*="language-"]': {
        background: theme.colorBgContainerDisabled,
        padding: '.1em',
        borderRadius: '.3em',
      },
      'comment': {
        color: '#6a9955',
      },
      'prolog': {
        color: '#6a9955',
      },
      'doctype': {
        color: '#6a9955',
      },
      'cdata': {
        color: '#6a9955',
      },
      'punctuation': {
        color: '#569cd6',
      },
      '.namespace': {
        Opacity: '.7',
      },
      'property': {
        color: theme.colorTextDescription,
      },
      'keyword': {
        color: theme['magenta-6'],
      },
      'tag': {
        color: '#569cd6',
      },
      'class-name': {
        color: theme.colorInfo,
      },
      'boolean': {
        color: theme.colorSuccess,
      },
      'constant': {
        color: theme.colorSuccess,
      },
      'symbol': {
        color: '#f92672',
      },
      'deleted': {
        color: theme.colorTextDescription,
      },
      'number': {
        color: '#FF73FD',
      },
      'selector': {
        color: '#A8FF60',
      },
      'attr-name': {
        color: '#A8FF60',
      },
      'string': {
        color: theme.colorTextDescription,
      },
      'char': {
        color: '#A8FF60',
      },
      'builtin': {
        color: '#569cd6',
      },
      'inserted': {
        color: '#A8FF60',
      },
      'variable': {
        color: '#C6C5FE',
      },
      'operator': {
        color: '#ce9178',
      },
      'entity': {
        color: theme.colorInfo,
        cursor: 'help',
      },
      'url': {
        color: '#96CBFE',
      },
      '.language-css .token.string': {
        color: theme.colorSuccess,
      },
      '.style .token.string': {
        color: theme.colorSuccess,
      },
      'atrule': {
        color: '#F9EE98',
      },
      'attr-value': {
        color: '#F9EE98',
      },
      'function': {
        color: theme.blue6,
      },
      'regex': {
        color: '#E9C062',
      },
      'important': {
        color: '#fd971f',
        fontWeight: 'bold',
      },
      'bold': {
        fontWeight: 'bold',
      },
      'italic': {
        fontStyle: 'italic',
      },
    }
  }, [theme])
  return (
    <div className={styles.markdownContainer} {...rest}>
      <ReactMarkdown
        children={text}
        className={styles.markdownBody}
        remarkPlugins={[remarkGfm]}
        components={{
          code(props1) {
            const { children, className } = props1
            const match = /language-(\w+)/.exec(className || '')
            return match
              ? (
                  <SyntaxHighlighter
                    PreTag="div"
                    children={String(children).replace(/\n$/, '')}
                    language={match[1]}
                    style={highlighterTheme}
                  />
                )
              : (
                  <code className={className}>{children}</code>
                )
          },
        }}
      />
    </div>
  )
}
