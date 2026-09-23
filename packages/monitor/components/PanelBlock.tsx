import type { ReactNode } from 'react'
import { createStyles } from 'antd-style'

const useStyles = createStyles(({ token, css }) => ({
  block: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
    padding: ${token.padding}px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  head: css`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${token.marginSM}px;
    flex-wrap: wrap;
  `,
  title: css`
    margin: 0;
    font-size: ${token.fontSize}px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  sub: css`
    margin-left: ${token.marginXS}px;
    font-size: ${token.fontSizeSM}px;
    font-weight: 400;
    color: ${token.colorTextTertiary};
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
  `,
}))

export interface PanelBlockProps {
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

/** 统计页通用区块容器：标题 + 口径副标题 + 右上角操作 */
export function PanelBlock({ title, sub, actions, children, className }: PanelBlockProps) {
  const { styles, cx } = useStyles()
  return (
    <section className={cx(styles.block, className)}>
      <header className={styles.head}>
        <h3 className={styles.title}>
          {title}
          {sub ? <span className={styles.sub}>{sub}</span> : null}
        </h3>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}