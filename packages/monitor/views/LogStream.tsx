import type { Dayjs } from 'dayjs'
import type { MonitorLog } from '../contracts/monitor'
import {
  ClearOutlined,
  CopyOutlined,
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PauseCircleOutlined,
  SearchOutlined,
  UpOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  DatePicker,
  Dropdown,
  Empty,
  Input,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import { createStyles } from 'antd-style'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LOG_LEVEL_OPTIONS, LOG_TIME_TYPE_OPTIONS, RANGE_TYPE_OPTIONS, rangeTypeLabel } from '../constants/enums'
import { useMonitorApps } from '../hooks/useMonitorApps'
import { formatLogTime, isJsonText, prettyJson } from '../runtime/format'
import { queryMonitorLogsAPI } from '../services/monitor'

const STORAGE_QUERY = 'za-monitor-log-query'
const STORAGE_WIDTH = 'za-monitor-log-panel-width'
const STORAGE_COLLAPSED = 'za-monitor-log-collapsed'
const MIN_PANEL_WIDTH = 300
const DEFAULT_PANEL_WIDTH = 360
const PAGE_SIZE_OPTIONS = [50, 100, 200, 500, 1000]
const REFRESH_OPTIONS = [
  { label: '关闭', value: 0 },
  { label: '5秒', value: 5000 },
  { label: '10秒', value: 10000 },
  { label: '30秒', value: 30000 },
]
/** 内容超过该长度或换行数达到阈值时默认折叠 */
const FOLD_LENGTH = 150
const FOLD_LINES = 3
/** 单批次内默认展示条数 */
const BATCH_FOLD_SIZE = 5

const useStyles = createStyles(({ token, css }) => ({
  wrap: css`
    display: flex;
    gap: ${token.marginSM}px;
    align-items: stretch;
    height: calc(100vh - 220px);
    min-height: 480px;
  `,
  panel: css`
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow: hidden;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  panelHead: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token.marginXS}px;
    padding: ${token.paddingSM}px ${token.padding}px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  panelTitle: css`
    font-size: ${token.fontSize}px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  form: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
    padding: ${token.padding}px;
    overflow-y: auto;
    flex: 1;
  `,
  field: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  fieldLabel: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  resizer: css`
    width: 6px;
    flex-shrink: 0;
    cursor: col-resize;
    border-radius: ${token.borderRadiusSM}px;
    transition: background 0.2s ease;

    &:hover {
      background: ${token.colorPrimaryBg};
    }
  `,
  main: css`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: ${token.marginSM}px;
  `,
  toolbar: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    flex-wrap: wrap;
    padding: ${token.paddingXS}px ${token.padding}px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  grow: css`
    flex: 1;
  `,
  list: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 2px;
  `,
  batch: css`
    margin-bottom: ${token.marginSM}px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    overflow: hidden;
  `,
  batchHead: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    flex-wrap: wrap;
    padding: ${token.paddingXS}px ${token.padding}px;
    background: ${token.colorFillQuaternary};
    border-bottom: 1px solid ${token.colorBorderSecondary};
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  batchId: css`
    font-family: ${token.fontFamilyCode};
    color: ${token.colorTextTertiary};
  `,
  row: css`
    display: grid;
    grid-template-columns: 132px 68px 128px minmax(0, 1fr);
    gap: ${token.marginSM}px;
    padding: ${token.paddingXS}px ${token.padding}px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    font-size: ${token.fontSizeSM}px;

    &:last-child {
      border-bottom: none;
    }
  `,
  rowError: css`
    background: ${token.colorErrorBg};
  `,
  rowWarn: css`
    background: ${token.colorWarningBg};
  `,
  time: css`
    font-family: ${token.fontFamilyCode};
    color: ${token.colorTextTertiary};
    white-space: nowrap;
  `,
  body: css`
    min-width: 0;
  `,
  title: css`
    font-weight: 600;
    color: ${token.colorText};
    word-break: break-all;
  `,
  content: css`
    margin-top: 2px;
    color: ${token.colorTextSecondary};
    white-space: pre-wrap;
    word-break: break-all;
  `,
  contentCode: css`
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeSM}px;
    background: ${token.colorFillQuaternary};
    border-radius: ${token.borderRadiusSM}px;
    padding: ${token.paddingXS}px;
    overflow-x: auto;
  `,
  rowActions: css`
    display: flex;
    align-items: flex-start;
    gap: 4px;
  `,
  sentinel: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${token.marginXS}px;
    padding: ${token.padding}px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
  `,
}))

interface QueryState {
  appId: string
  nickname: string
  params: string
  type: string
  rangeType: string
  logId: string
  title: string
  content: string
  timeType: number | ''
  pageSize: number
  range: [Dayjs, Dayjs] | null
}

const DEFAULT_QUERY: QueryState = {
  appId: '',
  nickname: '',
  params: '',
  type: '',
  rangeType: '',
  logId: '',
  title: '',
  content: '',
  timeType: 3_600_000,
  pageSize: 100,
  range: null,
}

function loadQueryState(): QueryState {
  try {
    const raw = localStorage.getItem(STORAGE_QUERY)
    if (!raw)
      return DEFAULT_QUERY
    const parsed = JSON.parse(raw) as Partial<QueryState>
    return {
      ...DEFAULT_QUERY,
      ...parsed,
      range: Array.isArray(parsed.range) && parsed.range.length === 2
        ? [dayjs(parsed.range[0]), dayjs(parsed.range[1])]
        : null,
    }
  }
  catch {
    return DEFAULT_QUERY
  }
}

interface Batch {
  key: string
  logId: string
  nickname: string | null
  page: string | null
  startTime: number
  errorCount: number
  warnCount: number
  rows: MonitorLog[]
}

function groupByBatch(rows: MonitorLog[]): Batch[] {
  const map = new Map<string, Batch>()
  for (const row of rows) {
    const key = row.logId || `single-${row.id}`
    const batch = map.get(key) ?? {
      key,
      logId: row.logId,
      nickname: row.nickname,
      page: row.page,
      startTime: row.happenTime,
      errorCount: 0,
      warnCount: 0,
      rows: [],
    }
    batch.rows.push(row)
    batch.startTime = Math.min(batch.startTime, row.happenTime)
    if (row.type === 'ERROR')
      batch.errorCount++
    else if (row.type === 'WARN')
      batch.warnCount++
    map.set(key, batch)
  }
  return [...map.values()].sort((a, b) => b.startTime - a.startTime)
}

const LEVEL_COLOR: Record<string, string> = {
  ERROR: 'error',
  WARN: 'warning',
  DEBUG: 'default',
  INFO: 'processing',
}

function LogContent({ text }: { text: string | null }) {
  const { styles } = useStyles()
  const [folded, setFolded] = useState(true)
  const [formatted, setFormatted] = useState(false)
  const raw = text ?? ''
  const json = useMemo(() => isJsonText(raw), [raw])
  if (!raw)
    return null

  const needFold = raw.length > FOLD_LENGTH || (raw.match(/\n/g)?.length ?? 0) >= FOLD_LINES
  const display = formatted && json ? prettyJson(raw) : raw
  const collapsed = needFold && folded

  return (
    <div className={styles.content}>
      <div className={formatted && json ? styles.contentCode : undefined}>
        {collapsed ? `${display.slice(0, FOLD_LENGTH)}…` : display}
      </div>
      <Space size={4} style={{ marginTop: 4 }}>
        {needFold
          ? (
              <Button size="small" type="link" icon={folded ? <DownOutlined /> : <UpOutlined />} onClick={() => setFolded(v => !v)}>
                {folded ? '展开' : '收起'}
              </Button>
            )
          : null}
        {json
          ? (
              <Button size="small" type="link" onClick={() => setFormatted(v => !v)}>
                {formatted ? '原文' : '格式化'}
              </Button>
            )
          : null}
      </Space>
    </div>
  )
}

function BatchCard({ batch }: { batch: Batch }) {
  const { styles, cx } = useStyles()
  const { message } = App.useApp()
  const [folded, setFolded] = useState(batch.rows.length > BATCH_FOLD_SIZE)
  const rows = folded ? batch.rows.slice(0, BATCH_FOLD_SIZE) : batch.rows

  const copy = async (text?: string | null) => {
    if (!text) {
      message.warning('无内容可复制')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制')
    }
    catch {
      message.error('复制失败')
    }
  }

  return (
    <div className={styles.batch}>
      <div className={styles.batchHead}>
        <span className={styles.batchId}>
          批次：
          {batch.logId || '-'}
        </span>
        <span>
          昵称：
          {batch.nickname || '-'}
        </span>
        <span>
          页面：
          {batch.page || '-'}
        </span>
        <span>
          共
          {batch.rows.length}
          {' '}
          条
        </span>
        {batch.errorCount
          ? <Tag color="error">
            ERROR
              {batch.errorCount}
            </Tag>
          : null}
        {batch.warnCount
          ? <Tag color="warning">
            WARN
              {batch.warnCount}
            </Tag>
          : null}
        {batch.rows.length > BATCH_FOLD_SIZE
          ? (
              <Button size="small" type="link" onClick={() => setFolded(v => !v)}>
                {folded ? `展开全部 ${batch.rows.length} 条` : '收起'}
              </Button>
            )
          : null}
      </div>
      {rows.map(row => (
        <div
          key={row.id}
          className={cx(styles.row, row.type === 'ERROR' && styles.rowError, row.type === 'WARN' && styles.rowWarn)}
        >
          <span className={styles.time}>{formatLogTime(row.happenTime)}</span>
          <span><Tag color={LEVEL_COLOR[row.type] ?? 'default'}>{row.type}</Tag></span>
          <Tooltip title={rangeTypeLabel(row.rangeType)}>
            <span className={styles.time}>{rangeTypeLabel(row.rangeType)}</span>
          </Tooltip>
          <div className={styles.body}>
            <div className={styles.title}>
              {row.title || row.url || '-'}
              {row.url
                ? <Tag style={{ marginLeft: 8 }} color="default">
                    {row.method}
                    {' '}
                    {row.status ?? ''}
                  </Tag>
                : null}
              {row.duration !== null && row.duration !== undefined
                ? <Tag style={{ marginLeft: 4 }} color="default">
                    {row.duration}
                  ms
                  </Tag>
                : null}
            </div>
            <LogContent text={row.content} />
          </div>
          <div className={styles.rowActions}>
            <Button
              size="small"
              type="text"
              icon={<CopyOutlined />}
              onClick={() => copy(row.content ?? row.title ?? '')}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** 实时日志：查询条件持久化 + 无限滚动 + 增量轮询 + 批次分组 */
export function LogStream() {
  const { styles, cx } = useStyles()
  const { message } = App.useApp()
  const { apps, loading: appsLoading } = useMonitorApps({ consumeOnly: false })

  const [query, setQuery] = useState<QueryState>(loadQueryState)
  const [rows, setRows] = useState<MonitorLog[]>([])
  const [total, setTotal] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'card' | 'table'>('card')
  const [keyword, setKeyword] = useState('')
  const [refreshInterval, setRefreshInterval] = useState(0)

  const [panelWidth, setPanelWidth] = useState(() => Number(localStorage.getItem(STORAGE_WIDTH)) || DEFAULT_PANEL_WIDTH)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_COLLAPSED) === '1')

  const listRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef<MonitorLog[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dragRef = useRef<{ startX: number, startWidth: number } | null>(null)
  rowsRef.current = rows

  useEffect(() => {
    localStorage.setItem(STORAGE_QUERY, JSON.stringify({ ...query, range: query.range?.map(item => item.valueOf()) ?? null }))
  }, [query])

  useEffect(() => {
    if (apps.length && !query.appId)
      setQuery(state => ({ ...state, appId: apps[0].appId }))
  }, [apps, query.appId])

  const resolveWindow = useCallback((state: QueryState) => {
    if (state.timeType) {
      const endTime = Date.now()
      return { startTime: endTime - Number(state.timeType), endTime }
    }
    if (state.range)
      return { startTime: state.range[0].valueOf(), endTime: state.range[1].valueOf() }
    const endTime = Date.now()
    return { startTime: endTime - 3_600_000, endTime }
  }, [])

  const buildParams = useCallback((state: QueryState, page: number) => {
    const { startTime, endTime } = resolveWindow(state)
    return {
      appId: state.appId,
      startTime,
      endTime,
      nickname: state.nickname || undefined,
      params: state.params || undefined,
      type: state.type || undefined,
      logId: state.logId || undefined,
      title: state.title || undefined,
      content: state.content || undefined,
      rangeType: state.rangeType || undefined,
      pageNum: page,
      pageSize: state.pageSize,
    }
  }, [resolveWindow])

  const search = useCallback(async (reset = true) => {
    if (!query.appId) {
      message.warning('请先选择应用')
      return
    }
    setLoading(true)
    try {
      const page = reset ? 1 : pageNum + 1
      const result = await queryMonitorLogsAPI(buildParams(query, page))
      setTotal(result.total)
      setPageNum(result.pageNum)
      setHasMore(result.pageNum < result.totalPage)
      setRows((prev) => {
        const base = reset ? [] : prev
        const seen = new Set(base.map(item => item.id))
        const merged = [...base, ...result.list.filter(item => !seen.has(item.id))]
        merged.sort((a, b) => (query.logId ? a.happenTime - b.happenTime : b.happenTime - a.happenTime))
        return merged
      })
      if (reset && listRef.current)
        listRef.current.scrollTop = 0
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '获取数据失败')
    }
    finally {
      setLoading(false)
    }
  }, [query, pageNum, buildParams, message])

  /** 增量拉取：只取本地最新一条之后的数据，避免整页重查 */
  const pollIncremental = useCallback(async () => {
    const state = query
    if (!state.appId || loading)
      return
    const current = rowsRef.current
    const startTime = current.length ? Math.max(...current.map(row => row.happenTime)) - 1 : resolveWindow(state).startTime
    try {
      const result = await queryMonitorLogsAPI({
        ...buildParams(state, 1),
        startTime,
        endTime: Date.now(),
        pageSize: state.pageSize,
      })
      if (!result.list.length)
        return
      setRows((prev) => {
        const seen = new Set(prev.map(item => item.id))
        const merged = [...prev, ...result.list.filter(item => !seen.has(item.id))]
        merged.sort((a, b) => (state.logId ? a.happenTime - b.happenTime : b.happenTime - a.happenTime))
        return merged.slice(0, 5000)
      })
      setTotal(value => value + result.list.length)
    }
    catch { /* 轮询失败静默，避免刷屏 */ }
  }, [query, loading, buildParams, resolveWindow])

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (refreshInterval > 0)
      timerRef.current = setInterval(pollIncremental, refreshInterval)
    return () => {
      if (timerRef.current)
        clearInterval(timerRef.current)
    }
  }, [refreshInterval, pollIncremental])

  useEffect(() => {
    if (!query.appId)
      return
    search(true)
    // 仅在应用切换时自动重查，其余条件变更由「检索」按钮触发
  }, [query.appId])

  /** 无限滚动哨兵 */
  useEffect(() => {
    const sentinel = sentinelRef.current
    const list = listRef.current
    if (!sentinel || !list || view !== 'card')
      return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore && !loading)
        search(false)
    }, { root: list, threshold: 0.1 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, search, view])

  const onDragStart = (event: React.MouseEvent) => {
    event.preventDefault()
    dragRef.current = { startX: event.clientX, startWidth: panelWidth }
    const onMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current)
        return
      const next = dragRef.current.startWidth + moveEvent.clientX - dragRef.current.startX
      setPanelWidth(Math.min(Math.max(next, MIN_PANEL_WIDTH), window.innerWidth - 480))
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      setPanelWidth((width) => {
        localStorage.setItem(STORAGE_WIDTH, String(width))
        return width
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
  }

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      localStorage.setItem(STORAGE_COLLAPSED, value ? '0' : '1')
      return !value
    })
  }

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase()
    if (!key)
      return rows
    return rows.filter(row => [
      row.title,
      row.content,
      row.params,
      row.rangeType,
      row.type,
      row.url,
      row.nickname,
      row.page,
    ].some(value => String(value ?? '').toLowerCase().includes(key)))
  }, [rows, keyword])

  const batches = useMemo(() => groupByBatch(filtered), [filtered])
  const errorCount = useMemo(() => filtered.filter(row => row.type === 'ERROR').length, [filtered])
  const warnCount = useMemo(() => filtered.filter(row => row.type === 'WARN').length, [filtered])
  const paramOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of rows) {
      for (const token of (row.params ?? '').split(',')) {
        const value = token.trim()
        if (value)
          set.add(value)
      }
    }
    return [...set].slice(0, 50).map(value => ({ value, label: value }))
  }, [rows])

  const tableColumns = [
    { title: '时间', dataIndex: 'happenTime', width: 168, render: (value: number) => <span className={styles.time}>{formatLogTime(value)}</span> },
    { title: '级别', dataIndex: 'type', width: 90, render: (value: string) => <Tag color={LEVEL_COLOR[value] ?? 'default'}>{value}</Tag> },
    { title: '归属', dataIndex: 'rangeType', width: 150, render: (value: string) => rangeTypeLabel(value) },
    { title: '关键字', dataIndex: 'params', width: 140, ellipsis: true },
    { title: '页面', dataIndex: 'page', width: 200, ellipsis: true },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '昵称', dataIndex: 'nickname', width: 120, ellipsis: true },
  ]

  const field = (label: string, node: React.ReactNode) => (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {node}
    </div>
  )

  const patch = (partial: Partial<QueryState>) => setQuery(state => ({ ...state, ...partial }))

  const appSelect = (
    <Select
      value={query.appId || undefined}
      onChange={value => patch({ appId: value })}
      loading={appsLoading}
      placeholder="选择应用"
      showSearch
      optionFilterProp="label"
      options={apps.map(app => ({ value: app.appId, label: app.appName }))}
    />
  )

  const paramsSelect = (
    <Select
      value={query.params || undefined}
      onChange={value => patch({ params: value ?? '' })}
      allowClear
      showSearch
      placeholder="params 关键字"
      options={paramOptions}
    />
  )

  const levelSegmented = (
    <Segmented
      value={query.type}
      onChange={value => patch({ type: String(value) })}
      options={LOG_LEVEL_OPTIONS.map(item => ({ value: item.value, label: item.label }))}
      size="small"
      block
    />
  )

  const rangeTypeSelect = (
    <Select
      value={query.rangeType || undefined}
      onChange={value => patch({ rangeType: value ?? '' })}
      allowClear
      placeholder="全部"
      options={RANGE_TYPE_OPTIONS}
    />
  )

  const timePicker = (
    <Space.Compact block>
      <Select
        value={query.timeType}
        onChange={(value) => {
          patch({ timeType: value })
          if (value === '')
            patch({ timeType: '', range: [dayjs().subtract(1, 'hour'), dayjs()] })
        }}
        style={{ width: 120 }}
        options={LOG_TIME_TYPE_OPTIONS}
      />
      {query.timeType === ''
        ? (
            <DatePicker.RangePicker
              showTime
              value={query.range}
              allowClear={false}
              onChange={value => patch({ range: value as [Dayjs, Dayjs] | null })}
              style={{ flex: 1 }}
            />
          )
        : null}
    </Space.Compact>
  )

  const pageSizeSelect = (
    <Select
      value={query.pageSize}
      onChange={value => patch({ pageSize: value })}
      options={PAGE_SIZE_OPTIONS.map(value => ({ value, label: `${value} 条` }))}
    />
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.panel} style={{ width: collapsed ? 48 : panelWidth }}>
        <div className={styles.panelHead}>
          {collapsed
            ? null
            : <span className={styles.panelTitle}>查询条件</span>}
          <Tooltip title={collapsed ? '展开查询条件' : '收起查询条件'}>
            <Button
              size="small"
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
            />
          </Tooltip>
        </div>
        {collapsed
          ? null
          : (
              <div className={styles.form}>
                {field('应用', appSelect)}
                {field('用户昵称', (<Input value={query.nickname} onChange={e => patch({ nickname: e.target.value })} allowClear placeholder="用户昵称" />))}
                {field('关键字', paramsSelect)}
                {field('日志级别', levelSegmented)}
                {field('日志类型', rangeTypeSelect)}
                {field('批次 id', (<Input value={query.logId} onChange={e => patch({ logId: e.target.value })} allowClear placeholder="批次id" />))}
                {field('时间', timePicker)}
                {field('标题', (<Input value={query.title} onChange={e => patch({ title: e.target.value })} allowClear placeholder="标题" />))}
                {field('内容', (<Input value={query.content} onChange={e => patch({ content: e.target.value })} allowClear placeholder="内容" />))}
                {field('每页条数', pageSizeSelect)}
                <Space>
                  <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => search(true)}>
                    检索
                  </Button>
                  <Button
                    icon={<ClearOutlined />}
                    onClick={() => {
                      setQuery({ ...DEFAULT_QUERY, appId: query.appId, pageSize: query.pageSize })
                      setRows([])
                      setTotal(0)
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </div>
            )}
      </div>

      {collapsed ? null : <div className={styles.resizer} onMouseDown={onDragStart} title="拖动调整查询区域宽度" />}

      <div className={styles.main}>
        <div className={styles.toolbar}>
          <Segmented
            value={view}
            onChange={value => setView(value as 'card' | 'table')}
            options={[{ value: 'card', label: '卡片' }, { value: 'table', label: '表格' }]}
          />
          <Input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            allowClear
            prefix={<SearchOutlined />}
            placeholder="在已加载结果中筛选"
            style={{ width: 240 }}
          />
          <Dropdown
            menu={{
              items: REFRESH_OPTIONS.map(item => ({ key: String(item.value), label: item.label })),
              selectable: true,
              selectedKeys: [String(refreshInterval)],
              onClick: ({ key }) => setRefreshInterval(Number(key)),
            }}
          >
            <Button icon={<PauseCircleOutlined />}>
              自动刷新：
              {REFRESH_OPTIONS.find(item => item.value === refreshInterval)?.label}
            </Button>
          </Dropdown>
          <Button icon={<SearchOutlined />} loading={loading} onClick={() => search(true)}>重新检索</Button>
          <div className={styles.grow} />
          <Space size={4}>
            <span>
              共
              {total}
              {' '}
              条
            </span>
            <Tag>
              已加载
              {rows.length}
            </Tag>
            {errorCount
              ? <Tag color="error">
                ERROR
                  {errorCount}
                </Tag>
              : null}
            {warnCount
              ? <Tag color="warning">
                WARN
                  {warnCount}
                </Tag>
              : null}
          </Space>
        </div>

        <Card styles={{ body: { padding: 12, height: '100%' } }} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {view === 'card'
            ? (
                <div className={styles.list} ref={listRef}>
                  {loading && !rows.length
                    ? <div className={styles.sentinel}>
                        <Spin />
                      正在检索中…
                      </div>
                    : null}
                  {!loading && !batches.length
                    ? <Empty description="暂无数据" style={{ marginTop: 48 }} />
                    : null}
                  {batches.map(batch => <BatchCard key={batch.key} batch={batch} />)}
                  <div className={styles.sentinel} ref={sentinelRef}>
                    {loading && rows.length
                      ? <>
                          <Spin size="small" />
                        正在检索中…
                        </>
                      : null}
                    {!loading && hasMore ? '加载更多…' : null}
                    {!loading && !hasMore && rows.length ? '到底了' : null}
                  </div>
                </div>
              )
            : (
                <Table
                  rowKey="id"
                  size="small"
                  virtual
                  loading={loading}
                  columns={tableColumns}
                  dataSource={filtered}
                  pagination={false}
                  scroll={{ x: 'max-content', y: 'calc(100vh - 380px)' }}
                  expandable={{
                    expandedRowRender: row => (
                      <div>
                        <div className={styles.time}>
                          批次：
                          {row.logId}
                          {' '}
                          · 序号：
                          {row.serial}
                          {' '}
                          · uid：
                          {row.uid ?? '-'}
                        </div>
                        <LogContent text={row.content} />
                        {row.extra ? <pre className={cx(styles.content, styles.contentCode)}>{prettyJson(JSON.stringify(row.extra))}</pre> : null}
                      </div>
                    ),
                  }}
                />
              )}
        </Card>
      </div>
    </div>
  )
}