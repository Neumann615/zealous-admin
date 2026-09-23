import { createStyles } from 'antd-style'
import { useMemo } from 'react'
import { formatNumber } from '../runtime/format'

const useStyles = createStyles(({ token, css }) => ({
  grid: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: ${token.marginSM}px;
  `,
  card: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginXXS}px;
    padding: ${token.paddingSM}px ${token.padding}px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    transition: border-color 0.2s ease;
  `,
  alert: css`
    border-color: ${token.colorErrorBorder};
    background: ${token.colorErrorBg};
  `,
  label: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
  `,
  body: css`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: ${token.marginXS}px;
  `,
  value: css`
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeHeading3}px;
    font-weight: 600;
    line-height: 1.2;
    color: ${token.colorText};
  `,
  sub: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
  `,
  spark: css`
    flex-shrink: 0;
  `,
}))

export type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'error'

export interface StatItem {
  label: string
  value?: number | string | null
  sub?: string
  tone?: StatTone
  /** 有异常时高亮卡片 */
  alert?: boolean
  spark?: Array<number | null>
}

export interface StatCardsProps {
  items: StatItem[]
}

const SPARK_WIDTH = 72
const SPARK_HEIGHT = 26

/** 卡片内迷你走势：手写 SVG，避免为每张卡片各起一个 echarts 实例 */
function Sparkline({ data, color }: { data: Array<number | null>, color: string }) {
  const path = useMemo(() => {
    const points = data.map((value, index) => ({ value, index })).filter(item => typeof item.value === 'number')
    if (points.length < 2)
      return ''
    const max = Math.max(...points.map(item => Number(item.value)), 1)
    const stepX = SPARK_WIDTH / (data.length - 1)
    return points
      .map((item, idx) => {
        const x = item.index * stepX
        const y = SPARK_HEIGHT - (Number(item.value) / max) * (SPARK_HEIGHT - 4) - 2
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [data])

  if (!path)
    return null

  return (
    <svg className="spark" width={SPARK_WIDTH} height={SPARK_HEIGHT} viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** 核心指标卡片组 */
export function StatCards({ items }: StatCardsProps) {
  const { styles, cx, theme } = useStyles()
  const toneColor: Record<StatTone, string> = {
    default: theme.colorText,
    primary: theme.colorPrimary,
    success: theme.colorSuccess,
    warning: theme.colorWarning,
    error: theme.colorError,
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => {
        const tone = item.tone ?? 'default'
        return (
          <div key={item.label} className={cx(styles.card, item.alert && styles.alert)}>
            <div className={styles.label}>{item.label}</div>
            <div className={styles.body}>
              <div>
                <div className={styles.value} style={{ color: tone === 'default' ? undefined : toneColor[tone] }}>
                  {typeof item.value === 'number' ? formatNumber(item.value) : (item.value ?? '-')}
                </div>
                {item.sub ? <div className={styles.sub}>{item.sub}</div> : null}
              </div>
              {item.spark?.length
                ? (
                    <div className={styles.spark}>
                      <Sparkline data={item.spark} color={toneColor[tone]} />
                    </div>
                  )
                : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}