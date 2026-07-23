import {
  CaretDownOutlined,
  CaretUpOutlined,
} from '@ant-design/icons'
import { useMaximize } from '@zealous-admin/layout/index'
import {
  Badge,
  Button,
  Col,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { createStyles, useTheme } from 'antd-style'
import * as echarts from 'echarts'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const { Text } = Typography

// ============================================================
// 工具函数
// ============================================================
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const randomWalk = (prev: number, vol: number, min: number, max: number) => clamp(prev + (Math.random() - 0.5) * vol, min, max)

// ============================================================
// Lambert 等角圆锥投影 (适合中国中纬度东西伸展的版图)
// ============================================================
function buildLambertProjector() {
  const DEG = Math.PI / 180
  const φ1 = 25 * DEG
  const φ2 = 47 * DEG
  const φ0 = 35 * DEG
  const λ0 = 105 * DEG

  const n = Math.log(Math.cos(φ1) / Math.cos(φ2))
    / Math.log(Math.tan(Math.PI / 4 + φ2 / 2) / Math.tan(Math.PI / 4 + φ1 / 2))
  const F = (Math.cos(φ1) * Math.tan(Math.PI / 4 + φ1 / 2) ** n) / n
  const ρ0 = F / Math.tan(Math.PI / 4 + φ0 / 2) ** n

  return (lng: number, lat: number): [number, number] => {
    const φ = lat * DEG
    const λ = lng * DEG
    const ρ = F / Math.tan(Math.PI / 4 + φ / 2) ** n
    const x = ρ * Math.sin(n * (λ - λ0))
    const y = ρ0 - ρ * Math.cos(n * (λ - λ0))
    return [x, y]
  }
}

// ============================================================
// 热力图颜色
// ============================================================
function heatColor(t: number, baseColor: THREE.Color): number {
  const c = new THREE.Color(baseColor)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, 0.45, 0.07 + t * 0.23)
  return c.getHex()
}

function heatColorHex(t: number, baseColor: THREE.Color): string {
  return new THREE.Color(heatColor(t, baseColor)).getStyle()
}

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

interface FeatureData {
  name: string
  adcode: string
  polygons: Array<{ outer: Array<[number, number]>, holes: Array<Array<[number, number]>> }>
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

// 省份 GDP 模拟数据 (亿元)
const PROVINCE_GDP: Record<string, number> = {
  广东省: 124369,
  江苏省: 116364,
  山东省: 87435,
  浙江省: 77715,
  河南省: 61345,
  四川省: 53851,
  湖北省: 50013,
  福建省: 48810,
  湖南省: 46063,
  上海市: 43215,
  安徽省: 43005,
  河北省: 40391,
  北京市: 40269,
  陕西省: 32772,
  江西省: 32074,
  重庆市: 29129,
  辽宁省: 28975,
  云南省: 28954,
  广西壮族自治区: 26301,
  山西省: 23000,
  内蒙古自治区: 20500,
  贵州省: 20164,
  新疆维吾尔自治区: 17742,
  天津市: 16311,
  黑龙江省: 15884,
  吉林省: 13200,
  甘肃省: 11201,
  海南省: 6475,
  宁夏回族自治区: 5069,
  青海省: 3615,
  西藏自治区: 2139,
  香港特别行政区: 28000,
  澳门特别行政区: 2500,
  台湾省: 48000,
}

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
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
  mapWrapper: css`
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 0;
  `,
  mapContainer: css`
    width: 100%;
    height: 100%;
    cursor: grab;
    &:active { cursor: grabbing; }
  `,
  mapTooltip: css`
    position: absolute;
    pointer-events: none;
    z-index: 10;
    background: ${token.colorBgElevated};
    color: ${token.colorText};
    padding: 6px 12px;
    border-radius: ${token.borderRadius}px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid ${token.colorPrimaryBorder};
    white-space: nowrap;
    transform: translate(-50%, -130%);
    box-shadow: ${token.boxShadowSecondary};
  `,
  mapBackBtn: css`
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 10;
  `,
  mapLevelTitle: css`
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 10;
    background: ${token.colorBgElevated}DD;
    padding: 4px 12px;
    border-radius: ${token.borderRadius}px;
    font-size: 13px;
    font-weight: 600;
    color: ${token.colorTextSecondary};
    border: 1px solid ${token.colorBorderSecondary};
  `,
  mapLegend: css`
    position: absolute;
    bottom: 12px;
    left: 12px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: ${token.colorTextSecondary};
    background: ${token.colorBgElevated}DD;
    padding: 6px 12px;
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorderSecondary};
    font-variant-numeric: tabular-nums;
  `,
  mapLegendBar: css`
    width: 120px;
    height: 8px;
    border-radius: 4px;
  `,
  mapHint: css`
    position: absolute;
    bottom: 12px;
    right: 12px;
    z-index: 10;
    font-size: 11px;
    color: ${token.colorTextTertiary};
    background: ${token.colorBgElevated}AA;
    padding: 4px 10px;
    border-radius: ${token.borderRadius}px;
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
// ECharts 辅助
// ============================================================
function useChart(el: HTMLDivElement | null): echarts.ECharts | null {
  if (!el)
    return null
  return echarts.getInstanceByDom(el) || echarts.init(el)
}

// ============================================================
// 组件
// ============================================================
export default function Dashboard3() {
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

  // 趋势数据滑动窗口
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
  const stockDistEl = useRef<HTMLDivElement>(null)

  // ---- Three.js refs ----
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [mapTooltip, setMapTooltip] = useState<{ name: string, value: number, x: number, y: number } | null>(null)

  // ---- 地图下钻状态 ----
  const [mapLevel, setMapLevel] = useState<'national' | 'provincial'>('national')
  const [mapCurrentName, setMapCurrentName] = useState('')
  const [mapLegend, setMapLegend] = useState({ min: 0, max: 100 })
  const renderGeoRef = useRef<(adcode: string, name?: string) => void>(() => {})
  const levelRef = useRef<'national' | 'provincial'>('national')
  const currentAdcodeRef = useRef('100000')
  const currentNameRef = useRef('')

  useEffect(() => { levelRef.current = mapLevel }, [mapLevel])

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

      // 7. 追加趋势数据
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

  // ---- ECharts: 指数走势 ----
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

  // ---- ECharts: 恐慌贪婪指数 ----
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

  // ---- ECharts: 行业涨跌幅排行 ----
  useEffect(() => {
    const chart = useChart(barEl.current)
    if (!chart)
      return
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

  // ---- ECharts: 各股分布（基于实时涨跌幅动态分类）----
  useEffect(() => {
    const chart = useChart(stockDistEl.current)
    if (!chart)
      return

    // 基于涨跌幅动态分类
    const categoryMap: Record<string, number> = {
      '强势上涨': 0,
      '温和上涨': 0,
      '震荡整理': 0,
      '温和下跌': 0,
      '强势下跌': 0,
    }

    stocks.forEach((stock) => {
      const changePercent = ((stock.price - stock.prevClose) / stock.prevClose) * 100

      if (changePercent >= 3)
        categoryMap['强势上涨']++
      else if (changePercent >= 1)
        categoryMap['温和上涨']++
      else if (changePercent >= -1)
        categoryMap['震荡整理']++
      else if (changePercent >= -3)
        categoryMap['温和下跌']++
      else
        categoryMap['强势下跌']++
    })

    const data = Object.entries(categoryMap)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))

    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}只 ({d}%)',
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        textStyle: { color: theme.colorTextSecondary, fontSize: 11 },
      },
      series: [
        {
          name: '各股分布',
          type: 'pie',
          radius: ['35%', '60%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: theme.colorBgElevated,
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'outer',
            formatter: '{b}\n{c}只',
            fontSize: 11,
            color: theme.colorTextSecondary,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 13,
              fontWeight: 'bold',
              color: theme.colorTextHeading,
            },
          },
          data,
        },
      ],
      color: [theme.colorError, '#FF7875', theme.colorWarning, '#95DE64', theme.colorSuccess],
    })
  }, [stocks, theme])

  // ---- Three.js: 3D 中国地图 + 经济飞线 ----
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container)
      return

    const W = container.clientWidth
    const H = container.clientHeight
    let cleanup = false

    // 颜色
    const bgColor = new THREE.Color(theme.colorBgElevated)
    const borderColor = new THREE.Color(theme.colorBorderSecondary).getHex()
    const hoverColor = new THREE.Color(theme.colorPrimary).getHex()
    const baseColor = new THREE.Color(theme.colorPrimary)

    // Scene / 光照
    const scene = new THREE.Scene()
    scene.background = bgColor
    scene.add(new THREE.AmbientLight(0x8899AA, 0.6))
    const dl = new THREE.DirectionalLight(0xFFFFFF, 0.75)
    dl.position.set(5, 12, 8)
    scene.add(dl)
    const dl2 = new THREE.DirectionalLight(0x8899CC, 0.25)
    dl2.position.set(-3, 5, -4)
    scene.add(dl2)

    // 相机
    const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 50)
    cam.position.set(0, 14, 0)
    cam.up.set(0, 0, 1)
    cam.lookAt(0, 0, 0)

    // Renderer
    const rdr = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    rdr.setSize(W, H)
    rdr.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(rdr.domElement)

    // OrbitControls
    const controls = new OrbitControls(cam, rdr.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enableRotate = false
    controls.target.set(0, 0, 0)
    controls.minZoom = 0.4
    controls.maxZoom = 8
    controls.update()

    // 地图根节点
    const root = new THREE.Group()
    scene.add(root)
    const allMeshes: THREE.Mesh[] = []
    const hoveredRef = { current: null as THREE.Mesh | null }
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    // 清空 Group
    function clearGroup(g: THREE.Group) {
      while (g.children.length > 0) {
        const child = g.children[0]
        g.remove(child)
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry?.dispose()
          const mat = child.material
          if (mat instanceof THREE.Material)
            mat.dispose()
          else if (Array.isArray(mat))
            mat.forEach(m => m.dispose())
        }
      }
    }

    // 渲染地图（支持全国/省级下钻）
    function renderGeo(adcode: string, name?: string) {
      currentAdcodeRef.current = adcode
      currentNameRef.current = name || ''
      const url = `/geo/${adcode}_full.json`

      fetch(url)
        .then(r => r.json())
        .then((geo: any) => {
          if (cleanup)
            return

          const features: FeatureData[] = geo.features
            .filter((f: any) => f.properties?.name)
            .map((f: any) => {
              const geoms = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
              return {
                name: f.properties.name,
                adcode: f.properties.adcode?.toString() || '',
                polygons: geoms.map((rg: any[]) => ({ outer: rg[0], holes: rg.slice(1) })),
              }
            })

          if (features.length === 0)
            return

          // Lambert 投影
          const project = buildLambertProjector()

          // 计算边界
          let minX = Infinity
          let maxX = -Infinity
          let minY = Infinity
          let maxY = -Infinity
          features.forEach(f => f.polygons.forEach(poly => poly.outer.forEach(([lng, lat]) => {
            const [x, y] = project(lng, lat)
            if (x < minX)
              minX = x
            if (x > maxX)
              maxX = x
            if (y < minY)
              minY = y
            if (y > maxY)
              maxY = y
          })))

          const dw = maxX - minX || 1
          const dh = maxY - minY || 1
          const scale = 7.0 / Math.max(dw, dh)
          const cx = (minX + maxX) / 2 * scale
          const cy = (minY + maxY) / 2 * scale
          const toXY = (lng: number, lat: number): [number, number] => {
            const [x, y] = project(lng, lat)
            return [cx - x * scale, cy - y * scale]
          }

          // 热力图数据
          const isNational = adcode === '100000'
          const dataMap: Record<string, number> = {}
          let minVal = Infinity
          let maxVal = -Infinity

          if (isNational) {
            features.forEach((f) => {
              const v = PROVINCE_GDP[f.name] ?? 0
              dataMap[f.name] = v
              if (v < minVal)
                minVal = v
              if (v > maxVal)
                maxVal = v
            })
          }
          else {
            // 省级：生成随机模拟数据
            features.forEach((f) => {
              const v = Math.round(Math.random() * 9000 + 500)
              dataMap[f.name] = v
              if (v < minVal)
                minVal = v
              if (v > maxVal)
                maxVal = v
            })
          }

          // 清空旧数据
          clearGroup(root)
          allMeshes.length = 0
          if (hoveredRef.current) {
            hoveredRef.current = null
            setMapTooltip(null)
          }

          // 创建 3D 网格
          const EXTRUDE_DEPTH = 0.18
          features.forEach((feat) => {
            const value = dataMap[feat.name] ?? 0
            const t = maxVal > minVal ? (value - minVal) / (maxVal - minVal) : 0.5
            const color = heatColor(t, baseColor)

            feat.polygons.forEach((polyData) => {
              const outer = polyData.outer
              if (outer.length < 3)
                return
              try {
                const shape = new THREE.Shape()
                const [sx, sy] = toXY(outer[0][0], outer[0][1])
                shape.moveTo(sx, sy)
                for (let i = 1; i < outer.length; i++) {
                  const [x, y] = toXY(outer[i][0], outer[i][1])
                  shape.lineTo(x, y)
                }
                shape.closePath()

                polyData.holes.forEach((hole) => {
                  if (hole.length < 3)
                    return
                  const hp = new THREE.Path()
                  const [hx, hy] = toXY(hole[0][0], hole[0][1])
                  hp.moveTo(hx, hy)
                  for (let i = 1; i < hole.length; i++) {
                    const [x, y] = toXY(hole[i][0], hole[i][1])
                    hp.lineTo(x, y)
                  }
                  hp.closePath()
                  shape.holes.push(hp)
                })

                const geom = new THREE.ExtrudeGeometry(shape, {
                  depth: EXTRUDE_DEPTH,
                  bevelEnabled: true,
                  bevelThickness: 0.012,
                  bevelSize: 0.012,
                  bevelSegments: 2,
                })
                geom.rotateX(-Math.PI / 2)
                geom.translate(0, -EXTRUDE_DEPTH, 0)

                const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 })
                const mesh = new THREE.Mesh(geom, mat)
                mesh.userData = { name: feat.name, adcode: feat.adcode, value, originalColor: color }
                root.add(mesh)
                allMeshes.push(mesh)

                // 边界线
                const edges = new THREE.EdgesGeometry(geom, 15)
                root.add(new THREE.LineSegments(
                  edges,
                  new THREE.LineBasicMaterial({ color: borderColor, transparent: true, opacity: 0.5, depthTest: true }),
                ))
              }
              catch { /* skip */ }
            })
          })

          // 重置相机视角
          cam.position.set(0, 14, 0)
          cam.up.set(0, 0, 1)
          cam.lookAt(0, 0, 0)
          controls.target.set(0, 0, 0)
          controls.update()

          // 更新 UI 状态
          setMapLegend({ min: minVal, max: maxVal })
          if (isNational) {
            setMapLevel('national')
            setMapCurrentName('')
          }
          else {
            setMapLevel('provincial')
            setMapCurrentName(name || '')
          }
        })
        .catch(err => console.warn('Geo fetch failed:', err))
    }

    renderGeoRef.current = renderGeo

    // 鼠标悬停
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, cam)
      const intersects = raycaster.intersectObjects(allMeshes, false)

      if (hoveredRef.current) {
        const p = hoveredRef.current
        ;(p.material as THREE.MeshStandardMaterial).color.setHex(p.userData.originalColor)
        ;(p.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
        hoveredRef.current = null
        setMapTooltip(null)
      }

      if (intersects.length > 0) {
        const obj = intersects[0].object as THREE.Mesh
        if (obj.userData.name) {
          ;(obj.material as THREE.MeshStandardMaterial).color.setHex(hoverColor)
          ;(obj.material as THREE.MeshStandardMaterial).emissive.setHex(
            new THREE.Color(hoverColor).multiplyScalar(0.3).getHex(),
          )
          hoveredRef.current = obj
          setMapTooltip({
            name: obj.userData.name,
            value: obj.userData.value,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          })
        }
      }
    }
    container.addEventListener('mousemove', onMouseMove)

    // 点击下钻
    let mouseDownPos: { x: number, y: number } | null = null
    const onMouseDown = (e: MouseEvent) => {
      mouseDownPos = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = (e: MouseEvent) => {
      if (!mouseDownPos)
        return
      const dx = e.clientX - mouseDownPos.x
      const dy = e.clientY - mouseDownPos.y
      mouseDownPos = null
      if (Math.sqrt(dx * dx + dy * dy) > 5)
        return // 拖拽，非点击

      if (levelRef.current !== 'national')
        return // 仅全国级可下钻

      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, cam)
      const intersects = raycaster.intersectObjects(allMeshes, false)
      if (intersects.length > 0) {
        const obj = intersects[0].object as THREE.Mesh
        const adcode = obj.userData.adcode
        if (adcode && adcode !== '100000') {
          renderGeo(adcode, obj.userData.name)
        }
      }
    }
    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('mouseup', onMouseUp)

    // 动画循环
    function anim() {
      if (cleanup)
        return
      requestAnimationFrame(anim)
      controls.update()
      rdr.render(scene, cam)
    }
    anim()

    // 初始加载
    renderGeo(currentAdcodeRef.current, currentNameRef.current)

    // Resize
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      cam.aspect = w / h
      cam.updateProjectionMatrix()
      rdr.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cleanup = true
      controls.dispose()
      window.removeEventListener('resize', onResize)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('mouseup', onMouseUp)
      clearGroup(root)
      rdr.dispose()
      if (container.contains(rdr.domElement))
        container.removeChild(rdr.domElement)
    }
  }, [theme])

  // ---- Resize & Cleanup ----
  useEffect(() => {
    const chartRefs = [trendEl, pieEl, gaugeEl, barEl, stockDistEl]
    const resizeAll = () => {
      chartRefs.forEach((ref) => {
        if (ref.current)
          echarts.getInstanceByDom(ref.current)?.resize()
      })
    }
    // 延迟 resize 确保 flex 容器尺寸已计算完成
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(resizeAll)
    })
    window.addEventListener('resize', resizeAll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resizeAll)
      chartRefs.forEach((ref) => {
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

  // ---- 地图辅助函数 ----
  const handleMapBack = () => renderGeoRef.current('100000')
  const shortName = (name: string) =>
    name.replace('特别行政区', '').replace('壮族自治区', '').replace('回族自治区', '').replace('维吾尔自治区', '').replace('自治区', '').replace('省', '').replace('市', '')
  const fmtVal = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(2)}万亿` : `${v}亿`

  // 图例渐变色
  const baseColor = new THREE.Color(theme.colorPrimary)
  const legendDark = heatColorHex(0, baseColor)
  const legendBright = heatColorHex(1, baseColor)

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

        {/* 图表区域 1: 各股分布 + 3D 中国地图(居中) + 右侧图表 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={7}>
            <div className={styles.chartCard} style={{ height: 502 }}>
              <div className={styles.chartTitle}>各股分布</div>
              <div ref={stockDistEl} style={{ width: '100%', flex: 1, minHeight: 0 }} />
            </div>
          </Col>
          <Col xs={24} lg={10}>
            <div className={styles.chartCard} style={{ height: 502, padding: 0 }}>
              <div className={styles.mapWrapper}>
                <div ref={mapContainerRef} className={styles.mapContainer} />
                {mapLevel === 'provincial' && (
                  <Button className={styles.mapBackBtn} onClick={handleMapBack} size="small">
                    ← 返回全国
                  </Button>
                )}
                <div className={styles.mapLevelTitle}>
                  {mapLevel === 'national' ? '全国 GDP 热力图' : `${shortName(mapCurrentName)} · 区县分布`}
                </div>
                <div className={styles.mapLegend}>
                  <span>{fmtVal(mapLegend.min)}</span>
                  <div
                    className={styles.mapLegendBar}
                    style={{ background: `linear-gradient(to right, ${legendDark}, ${legendBright})` }}
                  />
                  <span>{fmtVal(mapLegend.max)}</span>
                </div>
                <div className={styles.mapHint}>
                  {mapLevel === 'national' ? '🖱 点击省份下钻 · 拖拽缩放' : '拖拽缩放'}
                </div>
                {mapTooltip && (
                  <div className={styles.mapTooltip} style={{ left: mapTooltip.x, top: mapTooltip.y }}>
                    {shortName(mapTooltip.name)}
                    <span style={{ marginLeft: 8, color: theme.colorPrimary, fontWeight: 700 }}>
                      {fmtVal(mapTooltip.value)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Col>
          <Col xs={24} lg={7}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 502 }}>
              <div className={styles.chartCard} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div className={styles.chartTitle}>板块资金流向 (亿元)</div>
                <div ref={pieEl} style={{ width: '100%', flex: 1, minHeight: 0 }} />
              </div>
              <div className={styles.chartCard} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div className={styles.chartTitle}>恐慌贪婪指数</div>
                <div ref={gaugeEl} style={{ width: '100%', flex: 1, minHeight: 0 }} />
              </div>
            </div>
          </Col>
        </Row>

        {/* 图表区域 2: 指数走势 + 行业排行 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>指数走势 (归一化涨跌幅 %)</div>
              <div ref={trendEl} style={{ width: '100%', height: 280 }} />
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>行业涨跌幅排行</div>
              <div ref={barEl} style={{ width: '100%', height: 280 }} />
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