import type { ECharts } from 'echarts'
import { Spin } from 'antd'
import { createStyles } from 'antd-style'
import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'

const useStyles = createStyles(({ token, css }) => ({
  wrap: css`
    position: relative;
    width: 100%;
  `,
  chart: css`
    width: 100%;
  `,
  spin: css`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${token.colorBgContainer};
    opacity: 0.6;
  `,
}))

export type TrendTone = 'primary' | 'success' | 'warning' | 'error' | 'info'

export interface TrendSeries {
  name: string
  data: Array<number | null>
  tone?: TrendTone
  /** 柱状（次数类）或折线（耗时类） */
  type?: 'line' | 'bar'
}

export interface TrendChartProps {
  labels: string[]
  series: TrendSeries[]
  height?: number
  loading?: boolean
  /** 数据点多时开启刷选缩放 */
  dataZoom?: boolean
}

const TONE_TOKEN: Record<TrendTone, 'colorPrimary' | 'colorSuccess' | 'colorWarning' | 'colorError' | 'colorInfo'> = {
  primary: 'colorPrimary',
  success: 'colorSuccess',
  warning: 'colorWarning',
  error: 'colorError',
  info: 'colorInfo',
}

/** 趋势图：统一走 echarts，支持 dataZoom 与 tooltip 联动 */
export function TrendChart({ labels, series, height = 260, loading = false, dataZoom = false }: TrendChartProps) {
  const { styles, theme } = useStyles()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current)
      return
    const chart = echarts.getInstanceByDom(containerRef.current) ?? echarts.init(containerRef.current)
    chartRef.current = chart

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(containerRef.current)
    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart)
      return

    const axisColor = theme.colorBorderSecondary
    const textColor = theme.colorTextTertiary

    chart.setOption({
      color: series.map(item => theme[TONE_TOKEN[item.tone ?? 'primary']]),
      grid: { left: 8, right: 16, top: 32, bottom: dataZoom ? 56 : 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.colorBgElevated,
        borderColor: theme.colorBorderSecondary,
        textStyle: { color: theme.colorText, fontSize: theme.fontSizeSM },
        axisPointer: { type: 'line', lineStyle: { color: theme.colorBorder } },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 10,
        itemHeight: 10,
        icon: 'roundRect',
        textStyle: { color: textColor, fontSize: theme.fontSizeSM },
      },
      xAxis: {
        type: 'category',
        boundaryGap: series.some(item => item.type === 'bar'),
        data: labels,
        axisLine: { lineStyle: { color: axisColor } },
        axisTick: { show: false },
        axisLabel: { color: textColor, fontSize: theme.fontSizeSM, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: axisColor, type: 'dashed' } },
        axisLabel: { color: textColor, fontSize: theme.fontSizeSM },
      },
      dataZoom: dataZoom
        ? [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8, borderColor: axisColor }]
        : undefined,
      series: series.map(item => ({
        name: item.name,
        type: item.type ?? 'line',
        smooth: true,
        showSymbol: false,
        connectNulls: false,
        emphasis: { focus: 'series' },
        lineStyle: { width: 2 },
        areaStyle: series.length === 1 ? { opacity: 0.12 } : undefined,
        barMaxWidth: 24,
        data: item.data,
      })),
    }, true)
  }, [labels, series, theme, dataZoom])

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.chart} style={{ height }} />
      {loading ? <div className={styles.spin}><Spin /></div> : null}
    </div>
  )
}