import { Empty } from 'antd'
import { createStyles } from 'antd-style'

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginXS}px;
  `,
  row: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 88px;
    align-items: center;
    gap: ${token.marginSM}px;
  `,
  label: css`
    overflow: hidden;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  track: css`
    position: relative;
    height: 8px;
    margin-top: 4px;
    border-radius: ${token.borderRadiusSM}px;
    background: ${token.colorFillTertiary};
    overflow: hidden;
  `,
  bar: css`
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: ${token.borderRadiusSM}px;
    transition: width 0.3s ease;
  `,
  value: css`
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorText};
    text-align: right;
  `,
}))

export interface HbarItem {
  label: string
  value: number
  tip?: string
}

export interface HbarListProps {
  items: HbarItem[]
  /** 条形颜色 token 名，默认 colorPrimary */
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  emptyText?: string
}

const TONE_TOKEN = {
  primary: 'colorPrimary',
  success: 'colorSuccess',
  warning: 'colorWarning',
  error: 'colorError',
  info: 'colorInfo',
} as const

/** Top N 横向条形榜：按最大值归一，纯 CSS 实现，不引入图表实例 */
export function HbarList({ items, tone = 'primary', emptyText = '暂无数据' }: HbarListProps) {
  const { styles, theme } = useStyles()
  const max = Math.max(...items.map(item => item.value || 0), 1)
  const color = theme[TONE_TOKEN[tone]]

  if (!items.length)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />

  return (
    <div className={styles.list}>
      {items.map(item => (
        <div key={item.label} className={styles.row} title={item.tip ?? item.label}>
          <div>
            <div className={styles.label}>{item.label}</div>
            <div className={styles.track}>
              <div className={styles.bar} style={{ width: `${((item.value || 0) / max) * 100}%`, background: color }} />
            </div>
          </div>
          <div className={styles.value}>{item.value ?? 0}</div>
        </div>
      ))}
    </div>
  )
}