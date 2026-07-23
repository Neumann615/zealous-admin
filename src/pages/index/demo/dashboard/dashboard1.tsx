import {
  CaretDownOutlined,
  CaretUpOutlined,
} from '@ant-design/icons'
import { useMaximize } from '@zealous-admin/layout/index'
import {
  Badge,
  Col,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { createStyles } from 'antd-style'
import * as echarts from 'echarts'
import { useEffect, useRef, useState } from 'react'

const { Text } = Typography

// ============================================================
// 工具函数
// ============================================================
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const randomWalk = (prev: number, vol: number, min: number, max: number) => clamp(prev + (Math.random() - 0.5) * vol, min, max)

// ============================================================
// 类型
// ============================================================
interface Stock {
  code: string
  name: string
  price: number
  prevClose: number
  volume: number
  lastTickUp: boolean | null
}

interface IndexItem {
  name: string
  value: number
  prevClose: number
}

// ============================================================
// 初始数据
// ============================================================
const INIT_STOCKS: Stock[] = [
  { code: '600519', name: '贵州茅台', price: 1680.50, prevClose: 1645.30, volume: 125.6, lastTickUp: null },
  { code: '000858', name: '五粮液', price: 158.30, prevClose: 152.62, volume: 98.3, lastTickUp: null },
  { code: '300750', name: '宁德时代', price: 268.45, prevClose: 273.00, volume: 76.8, lastTickUp: null },
  { code: '002594', name: '比亚迪', price: 318.20, prevClose: 309.30, volume: 65.2, lastTickUp: null },
  { code: '601318', name: '中国平安', price: 42.15, prevClose: 41.30, volume: 58.9, lastTickUp: null },
  { code: '600036', name: '招商银行', price: 35.68, prevClose: 36.10, volume: 52.1, lastTickUp: null },
  { code: '000001', name: '平安银行', price: 12.35, prevClose: 12.07, volume: 48.7, lastTickUp: null },
  { code: '002415', name: '海康威视', price: 36.50, prevClose: 37.65, volume: 42.3, lastTickUp: null },
  { code: '688981', name: '中芯国际', price: 56.78, prevClose: 54.44, volume: 38.6, lastTickUp: null },
  { code: '300059', name: '东方财富', price: 17.82, prevClose: 17.26, volume: 35.4, lastTickUp: null },
]

const INIT_INDICES: IndexItem[] = [
  { name: '上证指数', value: 3285.63, prevClose: 3243.45 },
  { name: '深证成指', value: 11863.52, prevClose: 11886.97 },
  { name: '创业板指', value: 2456.78, prevClose: 2437.86 },
  { name: '沪深300', value: 3980.15, prevClose: 3974.48 },
]

const INIT_SECTORS = [
  { name: '新能源', value: 125.8 },
  { name: '半导体', value: 98.3 },
  { name: '医药生物', value: 76.5 },
  { name: '食品饮料', value: 65.2 },
  { name: '银行', value: 58.7 },
  { name: '军工', value: 52.1 },
  { name: '房地产', value: -34.6 },
  { name: '传媒', value: -28.3 },
]

const INIT_INDUSTRIES = [
  { name: '电池', change: 4.32 },
  { name: '光伏', change: 3.85 },
  { name: '半导体', change: 2.91 },
  { name: '白酒', change: 1.76 },
  { name: '医药', change: 0.82 },
  { name: '银行', change: -0.35 },
  { name: '地产', change: -1.12 },
  { name: '传媒', change: -1.88 },
  { name: '煤炭', change: -2.45 },
  { name: '石油', change: -3.02 },
]

const NEWS = [
  '央行今日开展2000亿元MLF操作，利率维持不变',
  '北向资金今日净流入58.3亿元，连续5日加仓A股',
  '证监会：进一步优化并购重组审核机制，提高市场效率',
  '工信部：加快新能源汽车产业发展，推动关键技术攻关',
  '统计局：三季度GDP同比增长5.2%，经济持续恢复向好',
  '财政部：1-9月全国一般公共预算收入同比增长6.8%',
  '发改委：推进新型基础设施建设，扩大有效投资',
  '商务部：前8月服务进出口总额同比增长8.4%',
]

const TREND_TIMES = ['09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00']
const TREND_INIT = [
  [3262, 11880, 2440],
  [3271, 11890, 2445],
  [3268, 11875, 2442],
  [3278, 11870, 2450],
  [3280, 11860, 2452],
  [3275, 11855, 2455],
  [3282, 11862, 2458],
  [3285, 11865, 2456],
  [3285.63, 11863.52, 2456.78],
]

const INDEX_NAMES = ['上证指数', '深证成指', '创业板指']

// ============================================================
// 样式
// ============================================================
const useStyles = createStyles(({ token, css }) => ({
  wrapper: css`
    width: 100%;
    height: 100%;
    background: ${token.colorBgLayout};
    overflow: auto;
    color: ${token.colorText};
    position: relative;
  `,
  container: css`
    padding: 16px 24px;
    max-width: 1920px;
    margin: 0 auto;
    box-sizing: border-box;
  `,
  header: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 56px;
    padding: 0 0 8px;
  `,
  headerTitle: css`
    font-size: 26px;
    font-weight: 700;
    color: ${token.colorTextHeading};
    letter-spacing: 2px;
    margin: 0;
  `,
  headerTime: css`
    font-size: 16px;
    color: ${token.colorTextSecondary};
    letter-spacing: 1px;
    font-variant-numeric: tabular-nums;
  `,
  breadthItem: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.4;
  `,
  breadthLabel: css`
    font-size: 11px;
    color: ${token.colorTextTertiary};
  `,
  breadthValueUp: css`
    font-size: 18px;
    font-weight: 700;
    color: ${token.colorError};
    font-variant-numeric: tabular-nums;
  `,
  breadthValueDown: css`
    font-size: 18px;
    font-weight: 700;
    color: ${token.colorSuccess};
    font-variant-numeric: tabular-nums;
  `,
  breadthValueFlat: css`
    font-size: 18px;
    font-weight: 700;
    color: ${token.colorTextSecondary};
    font-variant-numeric: tabular-nums;
  `,
  statCard: css`
    background: ${token.colorBgElevated};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    padding: 16px 20px;
    transition: all 0.3s;
    &:hover {
      border-color: ${token.colorPrimaryBorder};
      box-shadow: 0 2px 8px ${token.colorPrimaryBg};
    }
  `,
  chartCard: css`
    background: ${token.colorBgElevated};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    padding: 16px;
  `,
  chartTitle: css`
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorTextSecondary};
    margin-bottom: 8px;
    padding-left: 4px;
    border-left: 3px solid ${token.colorPrimary};
  `,
  sectionTitle: css`
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorTextSecondary};
    margin-bottom: 12px;
    padding-left: 4px;
    border-left: 3px solid ${token.colorPrimary};
  `,
  tableWrapper: css`
    .ant-table {
      background: transparent !important;
    }
    .ant-table-thead > tr > th {
      background: ${token.colorFillContent} !important;
      color: ${token.colorTextSecondary} !important;
      border-bottom: 1px solid ${token.colorBorderSecondary} !important;
      font-size: 13px;
    }
    .ant-table-tbody > tr > td {
      background: transparent !important;
      color: ${token.colorText} !important;
      border-bottom: 1px solid ${token.colorBorderSecondary} !important;
      font-size: 13px;
    }
    .ant-table-tbody > tr:hover > td {
      background: ${token.colorFillContent} !important;
    }
  `,
  ticker: css`
    height: 28px;
    line-height: 28px;
    overflow: hidden;
    color: ${token.colorTextTertiary};
    font-size: 13px;
  `,
  newsFade: css`
    display: inline-block;
    animation: fadeIn 0.5s ease;
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
}))

// ============================================================
// ECharts 辅助: 获取或创建实例
// ============================================================
function useChart(el: HTMLDivElement | null): echarts.ECharts | null {
  if (!el)
    return null
  return echarts.getInstanceByDom(el) || echarts.init(el)
}

// ============================================================
// 组件
// ============================================================
export default function Dashboard1() {
  const { styles, theme } = useStyles()
  const { enterMaximize } = useMaximize()

  // ---- 动态状态 ----
  const [stocks, setStocks] = useState<Stock[]>(INIT_STOCKS)
  const [indices, setIndices] = useState<IndexItem[]>(INIT_INDICES)
  const [sentiment, setSentiment] = useState(68)
  const [sectors, setSectors] = useState(INIT_SECTORS)
  const [industries, setIndustries] = useState(INIT_INDUSTRIES)
  const [breadth, setBreadth] = useState({ up: 2380, down: 2150, flat: 168 })
  const [now, setNow] = useState(new Date())
  const [newsIdx, setNewsIdx] = useState(0)

  // 趋势数据滑动窗口 (用 ref 存原始数据, tick 触发图表更新)
  const trendRef = useRef({
    times: [...TREND_TIMES],
    data: TREND_INIT.map(arr => [...arr]),
  })
  const [trendTick, setTrendTick] = useState(0)

  // ---- ECharts DOM refs ----
  const trendEl = useRef<HTMLDivElement>(null)
  const pieEl = useRef<HTMLDivElement>(null)
  const gaugeEl = useRef<HTMLDivElement>(null)
  const barEl = useRef<HTMLDivElement>(null)
  const scatterEl = useRef<HTMLDivElement>(null)

  // ---- 时钟 ----
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ---- 新闻滚动 ----
  useEffect(() => {
    const t = setInterval(() => setNewsIdx(i => (i + 1) % NEWS.length), 4000)
    return () => clearInterval(t)
  }, [])

  // ---- 核心: 动态数据模拟 (每 2 秒一个 tick) ----
  useEffect(() => {
    const t = setInterval(() => {
      // 1. 个股价格随机游走
      setStocks(prev => prev.map((s) => {
        const vol = s.price * 0.006
        const newPrice = randomWalk(s.price, vol, s.price * 0.92, s.price * 1.08)
        const newVolume = clamp(s.volume + (Math.random() - 0.4) * 5, 5, 300)
        return { ...s, price: newPrice, volume: newVolume, lastTickUp: newPrice >= s.price }
      }))

      // 2. 指数随机游走
      setIndices(prev => prev.map((idx) => {
        const vol = idx.value * 0.003
        return { ...idx, value: randomWalk(idx.value, vol, idx.value * 0.97, idx.value * 1.03) }
      }))

      // 3. 恐慌贪婪指数
      setSentiment(prev => clamp(prev + (Math.random() - 0.5) * 6, 5, 95))

      // 4. 板块资金流向
      setSectors(prev => prev.map(sec => ({
        ...sec,
        value: clamp(sec.value + (Math.random() - 0.5) * 15, -80, 180),
      })))

      // 5. 行业涨跌幅
      setIndustries(prev => prev.map(ind => ({
        ...ind,
        change: clamp(ind.change + (Math.random() - 0.5) * 0.8, -6, 6),
      })))

      // 6. 涨跌家数
      setBreadth((prev) => {
        const shift = Math.floor((Math.random() - 0.5) * 80)
        return {
          up: clamp(prev.up + shift, 800, 3800),
          down: clamp(prev.down - shift, 800, 3800),
          flat: clamp(prev.flat + Math.floor((Math.random() - 0.5) * 20), 80, 300),
        }
      })

      // 7. 追加趋势数据 (滑动窗口保留 20 点)
      const tr = trendRef.current
      const last = tr.data[tr.data.length - 1]
      const newPoint = last.map(v => randomWalk(v, v * 0.004, v * 0.98, v * 1.02))
      const [h, m] = tr.times[tr.times.length - 1].split(':').map(Number)
      let nm = m + 1
      let nh = h
      if (nm >= 60) {
        nm -= 60
        nh += 1
      }
      if (nh >= 16) {
        nh = 15
        nm = 0
      }
      tr.times.push(`${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`)
      tr.data.push(newPoint)
      if (tr.times.length > 20) {
        tr.times.shift()
        tr.data.shift()
      }
      setTrendTick(v => v + 1)
    }, 1500)
    return () => clearInterval(t)
  }, [])

  // ---- ECharts: 指数走势 (归一化为涨跌幅 %) ----
  useEffect(() => {
    const chart = useChart(trendEl.current)
    if (!chart)
      return
    const tr = trendRef.current
    const base = tr.data[0]
    chart.setOption({
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v.toFixed(2)}%` },
      legend: {
        data: INDEX_NAMES,
        bottom: 0,
        textStyle: { color: theme.colorTextSecondary, fontSize: 11 },
      },
      xAxis: {
        type: 'category',
        data: tr.times,
        boundaryGap: false,
        axisLine: { lineStyle: { color: theme.colorBorderSecondary } },
        axisLabel: { color: theme.colorTextTertiary, fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%', color: theme.colorTextTertiary, fontSize: 10 },
        splitLine: { lineStyle: { color: theme.colorBorderSecondary } },
      },
      series: INDEX_NAMES.map((name, i) => ({
        name,
        type: 'line',
        data: tr.data.map(d => +((d[i] - base[i]) / base[i] * 100).toFixed(2)),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2 },
        areaStyle: i === 0 ? { opacity: 0.06 } : undefined,
      })),
      color: [theme.colorPrimary, theme.colorWarning, theme.colorSuccess],
    })
  }, [trendTick, theme])

  // ---- ECharts: 板块资金流向 ----
  useEffect(() => {
    const chart = useChart(pieEl.current)
    if (!chart)
      return
    const inflow = sectors.filter(d => d.value > 0)
    const outflow = sectors.filter(d => d.value < 0).map(d => ({ ...d, value: Math.abs(d.value) }))
    chart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c}亿' },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        textStyle: { color: theme.colorTextSecondary, fontSize: 10 },
        itemWidth: 8,
        itemHeight: 8,
      },
      series: [
        {
          name: '净流入',
          type: 'pie',
          radius: ['38%', '58%'],
          center: ['32%', '50%'],
          label: { show: false },
          emphasis: { label: { show: true, color: theme.colorTextHeading, fontSize: 11 } },
          data: inflow,
        },
        {
          name: '净流出',
          type: 'pie',
          radius: ['62%', '78%'],
          center: ['32%', '50%'],
          label: { show: false },
          emphasis: { label: { show: true, color: theme.colorTextHeading, fontSize: 11 } },
          data: outflow,
        },
      ],
      color: [theme.colorPrimary, theme.colorSuccess, theme.colorWarning, theme.purple, theme.cyan, theme.geekblue, theme.colorError, theme.volcano],
    })
  }, [sectors, theme])

  // ---- ECharts: 恐慌贪婪指数 (仪表盘) ----
  useEffect(() => {
    const chart = useChart(gaugeEl.current)
    if (!chart)
      return
    const v = Math.round(sentiment)
    const label = v >= 75 ? '极度贪婪' : v >= 55 ? '贪婪' : v >= 45 ? '中性' : v >= 25 ? '恐慌' : '极度恐慌'
    chart.setOption({
      series: [{
        type: 'gauge',
        min: 0,
        max: 100,
        radius: '92%',
        progress: { show: true, width: 12 },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.25, theme.colorSuccess],
              [0.5, theme.colorWarning],
              [0.75, '#FF9966'],
              [1, theme.colorError],
            ],
          },
        },
        pointer: { width: 4, length: '58%', itemStyle: { color: theme.colorTextHeading } },
        axisTick: { show: false },
        splitLine: { length: 8, lineStyle: { color: theme.colorBorderSecondary } },
        axisLabel: { distance: 14, color: theme.colorTextTertiary, fontSize: 9 },
        detail: {
          valueAnimation: true,
          formatter: '{value}',
          fontSize: 28,
          fontWeight: 700,
          color: theme.colorTextHeading,
          offsetCenter: [0, '28%'],
        },
        title: { offsetCenter: [0, '52%'], fontSize: 12, color: theme.colorTextSecondary },
        data: [{ value: v, name: label }],
      }],
    })
  }, [sentiment, theme])

  // ---- ECharts: 行业涨跌幅排行 (横向柱状图) ----
  useEffect(() => {
    const chart = useChart(barEl.current)
    if (!chart)
      return
    // 升序排列, 最高在顶部
    const sorted = [...industries].sort((a, b) => a.change - b.change)
    chart.setOption({
      grid: { left: 55, right: 45, top: 10, bottom: 24 },
      tooltip: { formatter: '{b}: {c}%' },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%', color: theme.colorTextTertiary, fontSize: 10 },
        splitLine: { lineStyle: { color: theme.colorBorderSecondary } },
      },
      yAxis: {
        type: 'category',
        data: sorted.map(i => i.name),
        axisLine: { lineStyle: { color: theme.colorBorderSecondary } },
        axisLabel: { color: theme.colorTextSecondary, fontSize: 11 },
      },
      series: [{
        type: 'bar',
        data: sorted.map(i => ({
          value: +i.change.toFixed(2),
          itemStyle: { color: i.change >= 0 ? theme.colorError : theme.colorSuccess, borderRadius: [0, 3, 3, 0] },
        })),
        barWidth: '55%',
        label: {
          show: true,
          position: 'right',
          formatter: (p: any) => `${p.value}%`,
          fontSize: 10,
          color: theme.colorTextSecondary,
        },
      }],
    })
  }, [industries, theme])

  // ---- ECharts: 个股分布散点图 (涨跌幅 vs 价格, 气泡=成交量) ----
  useEffect(() => {
    const chart = useChart(scatterEl.current)
    if (!chart)
      return
    chart.setOption({
      grid: { left: 48, right: 20, top: 20, bottom: 38 },
      tooltip: {
        formatter: (p: any) =>
          `${p.data[3]} (${p.data[4]})<br/>价格: ¥${p.data[1].toFixed(2)}<br/>涨跌: ${p.data[0].toFixed(2)}%<br/>成交: ${p.data[2].toFixed(1)}万手`,
      },
      xAxis: {
        type: 'value',
        name: '涨跌幅(%)',
        nameTextStyle: { color: theme.colorTextTertiary, fontSize: 10 },
        axisLabel: { formatter: '{value}%', color: theme.colorTextTertiary, fontSize: 10 },
        splitLine: { lineStyle: { color: theme.colorBorderSecondary } },
      },
      yAxis: {
        type: 'value',
        name: '价格(元)',
        nameTextStyle: { color: theme.colorTextTertiary, fontSize: 10 },
        axisLabel: { color: theme.colorTextTertiary, fontSize: 10 },
        splitLine: { lineStyle: { color: theme.colorBorderSecondary } },
      },
      series: [{
        type: 'scatter',
        data: stocks.map((s) => {
          const changePercent = ((s.price - s.prevClose) / s.prevClose) * 100
          return {
            value: [+changePercent.toFixed(2), +s.price.toFixed(2), s.volume, s.name, s.code],
            itemStyle: { color: changePercent >= 0 ? theme.colorError : theme.colorSuccess, opacity: 0.72 },
          }
        }),
        symbolSize: (val: number[]) => Math.max(8, Math.sqrt(val[2]) * 2.8),
      }],
    })
  }, [stocks, theme])

  // ---- Resize & Cleanup ----
  useEffect(() => {
    const handleResize = () => {
      ;[trendEl, pieEl, gaugeEl, barEl, scatterEl].forEach((ref) => {
        if (ref.current)
          echarts.getInstanceByDom(ref.current)?.resize()
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      ;[trendEl, pieEl, gaugeEl, barEl, scatterEl].forEach((ref) => {
        if (ref.current)
          echarts.getInstanceByDom(ref.current)?.dispose()
      })
    }
  }, [])

  // ---- 派生数据 ----
  const indexCards = indices.map((idx) => {
    const change = idx.value - idx.prevClose
    const changePercent = (change / idx.prevClose) * 100
    return { ...idx, change, changePercent, up: change >= 0 }
  })

  const stockRows = stocks.map((s, i) => {
    const change = s.price - s.prevClose
    const changePercent = (change / s.prevClose) * 100
    return { ...s, key: i, change, changePercent, up: change >= 0 }
  })

  const timeStr = `${now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })} ${now.toLocaleTimeString('zh-CN', { hour12: false })}`

  // ---- 表格列 ----
  const columns = [
    { title: '代码', dataIndex: 'code', key: 'code', width: 90 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 100 },
    {
      title: '最新价',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (v: number, r: any) => (
        <Space size={4}>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{v.toFixed(2)}</span>
          {r.lastTickUp === true && <span style={{ color: theme.colorError, fontSize: 9 }}>▲</span>}
          {r.lastTickUp === false && <span style={{ color: theme.colorSuccess, fontSize: 9 }}>▼</span>}
        </Space>
      ),
    },
    {
      title: '涨跌额',
      dataIndex: 'change',
      key: 'change',
      width: 90,
      render: (v: number, r: any) => (
        <span style={{ color: r.up ? theme.colorError : theme.colorSuccess, fontVariantNumeric: 'tabular-nums' }}>
          {v > 0 ? '+' : ''}
          {v.toFixed(2)}
        </span>
      ),
    },
    {
      title: '涨跌幅',
      dataIndex: 'changePercent',
      key: 'changePercent',
      width: 90,
      render: (v: number, r: any) => (
        <span style={{ color: r.up ? theme.colorError : theme.colorSuccess, fontVariantNumeric: 'tabular-nums' }}>
          {v > 0 ? '+' : ''}
          {v.toFixed(2)}
          %
        </span>
      ),
    },
    {
      title: '成交量(万手)',
      dataIndex: 'volume',
      key: 'volume',
      width: 110,
      render: (v: number) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(1)}</span>,
    },
    {
      title: '方向',
      dataIndex: 'up',
      key: 'up',
      width: 60,
      render: (up: boolean) => up
        ? <Tag color="red" style={{ margin: 0 }}>涨</Tag>
        : <Tag color="green" style={{ margin: 0 }}>跌</Tag>,
    },
  ]

  return (
    <div className={styles.wrapper} onDoubleClick={enterMaximize}>
      <div className={styles.container}>
        {/* 顶部标题栏 */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>金融数据大屏</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Badge status="processing" />
              <span style={{ color: theme.colorTextSecondary, fontSize: 12 }}>模拟实时交易 · 数据每 2 秒刷新</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div className={styles.breadthItem}>
              <span className={styles.breadthLabel}>上涨</span>
              <span className={styles.breadthValueUp}>{breadth.up}</span>
            </div>
            <div className={styles.breadthItem}>
              <span className={styles.breadthLabel}>下跌</span>
              <span className={styles.breadthValueDown}>{breadth.down}</span>
            </div>
            <div className={styles.breadthItem}>
              <span className={styles.breadthLabel}>平盘</span>
              <span className={styles.breadthValueFlat}>{breadth.flat}</span>
            </div>
            <span className={styles.headerTime}>{timeStr}</span>
          </div>
        </div>

        {/* KPI 指标卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {indexCards.map((item, i) => (
            <Col xs={12} sm={12} md={6} key={i}>
              <div className={styles.statCard}>
                <Text style={{ color: theme.colorTextSecondary, fontSize: 13 }}>{item.name}</Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                  <Statistic
                    value={item.value}
                    precision={2}
                    valueStyle={{ color: theme.colorTextHeading, fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                  />
                  <Space size={4}>
                    {item.up
                      ? <CaretUpOutlined style={{ color: theme.colorError }} />
                      : <CaretDownOutlined style={{ color: theme.colorSuccess }} />}
                    <span style={{ color: item.up ? theme.colorError : theme.colorSuccess, fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                      {item.change > 0 ? '+' : ''}
                      {item.change.toFixed(2)}
                    </span>
                    <span style={{ color: item.up ? theme.colorError : theme.colorSuccess, fontSize: 13, marginLeft: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {item.changePercent > 0 ? '+' : ''}
                      {item.changePercent.toFixed(2)}
                      %
                    </span>
                  </Space>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* 图表区域 1: 走势 + 资金流向 + 情绪指数 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={14}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>指数走势 (归一化涨跌幅 %)</div>
              <div ref={trendEl} style={{ width: '100%', height: 280 }} />
            </div>
          </Col>
          <Col xs={24} lg={6}>
            <div className={styles.chartCard} style={{ height: '100%' }}>
              <div className={styles.chartTitle}>板块资金流向 (亿元)</div>
              <div ref={pieEl} style={{ width: '100%', height: 280 }} />
            </div>
          </Col>
          <Col xs={24} lg={4}>
            <div className={styles.chartCard} style={{ height: '100%' }}>
              <div className={styles.chartTitle}>恐慌贪婪指数</div>
              <div ref={gaugeEl} style={{ width: '100%', height: 280 }} />
            </div>
          </Col>
        </Row>

        {/* 图表区域 2: 行业排行 + 个股分布 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>行业涨跌幅排行</div>
              <div ref={barEl} style={{ width: '100%', height: 260 }} />
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>个股分布 (涨跌幅 × 价格, 气泡=成交量)</div>
              <div ref={scatterEl} style={{ width: '100%', height: 260 }} />
            </div>
          </Col>
        </Row>

        {/* 热门股票表格 */}
        <div className={styles.chartCard} style={{ marginBottom: 12 }}>
          <div className={styles.sectionTitle}>热门个股实时行情</div>
          <div className={styles.tableWrapper}>
            <Table
              columns={columns}
              dataSource={stockRows}
              pagination={false}
              size="small"
              bordered={false}
            />
          </div>
        </div>

        {/* 底部消息滚动条 */}
        <div className={styles.ticker}>
          <span style={{ color: theme.colorPrimary, marginRight: 12 }}>📢 市场快讯</span>
          <span key={newsIdx} className={styles.newsFade}>{NEWS[newsIdx]}</span>
        </div>
      </div>
    </div>
  )
}
