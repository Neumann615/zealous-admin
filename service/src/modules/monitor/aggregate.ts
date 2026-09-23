import { getDb } from '../../db'
import {
  AGG_SCAN_LIMIT,
  DAY_GRANULARITY_THRESHOLD_MS,
  DEFAULT_SLOW_MS,
  PERF_STAGES,
} from './constants'

interface RawRow {
  happen_time: number
  range_type: string
  type: string
  params: string | null
  title: string | null
  nickname: string | null
  page: string | null
  url: string | null
  status: number | null
  duration: number | null
  request_id: string | null
  uid: string | null
  extra: string | null
}

interface ScanResult {
  rows: RawRow[]
  truncated: boolean
}

const RAW_COLUMNS = `
  happen_time, range_type, type, params, title, nickname, page, url, status, duration, request_id, uid, extra
`

/** 按窗口拉取明细（带扫描上限），超出上限时 truncated=true，由 UI 明示口径 */
function scanRows(
  appId: string,
  startTime: number,
  endTime: number,
  rangeTypes?: string[],
): ScanResult {
  const db = getDb()
  const conditions = ['app_id = ?', 'happen_time >= ?', 'happen_time <= ?']
  const args: Array<string | number> = [appId, startTime, endTime]
  if (rangeTypes?.length) {
    conditions.push(`range_type IN (${rangeTypes.map(() => '?').join(', ')})`)
    args.push(...rangeTypes)
  }
  const rows = db.prepare(
    `SELECT ${RAW_COLUMNS} FROM za_monitor_log WHERE ${conditions.join(' AND ')} ORDER BY happen_time ASC LIMIT ?`,
  ).all(...args, AGG_SCAN_LIMIT + 1) as unknown as RawRow[]

  const truncated = rows.length > AGG_SCAN_LIMIT
  return { rows: truncated ? rows.slice(0, AGG_SCAN_LIMIT) : rows, truncated }
}

function parseExtra(raw: string | null): Record<string, any> {
  if (!raw)
    return {}
  try {
    return JSON.parse(raw) as Record<string, any>
  }
  catch {
    return {}
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function hourKey(ts: number): string {
  return `${pad(new Date(ts).getHours())}:00`
}

function toNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/** 全量值排序：短窗口精确分位数 */
function percentileExact(values: number[], p: number): number | null {
  if (!values.length)
    return null
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return Math.round(sorted[idx])
}

/** 直方图近似：长窗口按 50ms 分桶累计，取累计占比首次达到 p 的桶上界 */
function percentileHistogram(values: number[], p: number, bucketSize = 50): number | null {
  if (!values.length)
    return null
  const buckets = new Map<number, number>()
  for (const value of values) {
    const key = Math.floor(value / bucketSize)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b)
  const target = (p / 100) * values.length
  let cumulative = 0
  for (const key of keys) {
    cumulative += buckets.get(key) ?? 0
    if (cumulative >= target)
      return Math.round((key + 1) * bucketSize - bucketSize / 2)
  }
  return Math.round((keys[keys.length - 1] ?? 0) * bucketSize)
}

function percentile(values: number[], p: number, approximate: boolean): number | null {
  if (!values.length)
    return null
  return approximate ? percentileHistogram(values, p) : percentileExact(values, p)
}

function avg(values: number[]): number | null {
  if (!values.length)
    return null
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function pct(numerator: number, denominator: number): number {
  if (!denominator)
    return 0
  return round((numerator / denominator) * 100, 2)
}

/** 来源系统 = params 首词（门户形态应用用它区分业务来源） */
function sourceOf(params: string | null): string {
  if (!params)
    return ''
  return params.split(',')[0]?.trim() ?? ''
}

function matchSource(row: RawRow, source?: string): boolean {
  if (!source)
    return true
  return sourceOf(row.params) === source
}

const ERROR_RANGE_TYPES = ['WINDOW_ERROR', 'PROMISE_ERROR']

export interface WorkbenchStats {
  window: { day: string, startTime: number, endTime: number }
  truncated: boolean
  overall: {
    pv: number
    uv: number
    clicks: number
    jsError: { count: number, rate: number, users: number, userPct: number }
  }
  yesterday: {
    pv: number
    uv: number
    clicks: number
    jsError: { count: number, rate: number, users: number, userPct: number }
  } | null
  trend: Array<{ bucket: string, pv: number, uv: number, errCount: number }>
  topPages: Array<{ page: string, pv: number, uv: number }>
  topErrors: Array<{ title: string, count: number, users: number }>
}

function summarizeCore(rows: RawRow[]) {
  const users = new Set<string>()
  const errorUsers = new Set<string>()
  let pv = 0
  let clicks = 0
  let errCount = 0
  for (const row of rows) {
    if (row.uid)
      users.add(row.uid)
    if (row.range_type === 'USER_ROUTE')
      pv++
    else if (row.range_type === 'USER_CLICK')
      clicks++
    if (ERROR_RANGE_TYPES.includes(row.range_type)) {
      errCount++
      if (row.uid)
        errorUsers.add(row.uid)
    }
  }
  const uv = users.size
  return {
    pv,
    uv,
    clicks,
    jsError: {
      count: errCount,
      rate: pct(errCount, pv),
      users: errorUsers.size,
      userPct: pct(errorUsers.size, uv),
    },
  }
}

/** 工作台看板：今日 00:00 至今 + 昨日对比 + 按小时趋势 + Top 页面/错误 */
export function getWorkbenchStats(appId: string): WorkbenchStats {
  const nowTs = Date.now()
  const todayStart = new Date(new Date(nowTs).setHours(0, 0, 0, 0)).getTime()
  const yesterdayStart = todayStart - DAY_GRANULARITY_THRESHOLD_MS

  const today = scanRows(appId, todayStart, nowTs)
  const yesterday = scanRows(appId, yesterdayStart, todayStart - 1)

  const overall = summarizeCore(today.rows)

  const trendMap = new Map<string, { pv: number, uv: Set<string>, errCount: number }>()
  for (let hour = 0; hour < 24; hour++)
    trendMap.set(`${pad(hour)}:00`, { pv: 0, uv: new Set(), errCount: 0 })

  for (const row of today.rows) {
    const bucket = trendMap.get(hourKey(row.happen_time))
    if (!bucket)
      continue
    if (row.range_type === 'USER_ROUTE')
      bucket.pv++
    if (ERROR_RANGE_TYPES.includes(row.range_type))
      bucket.errCount++
    if (row.uid)
      bucket.uv.add(row.uid)
  }

  const pageMap = new Map<string, { pv: number, uv: Set<string> }>()
  const errorMap = new Map<string, { count: number, users: Set<string> }>()
  for (const row of today.rows) {
    if (row.range_type === 'USER_ROUTE' && row.page) {
      const item = pageMap.get(row.page) ?? { pv: 0, uv: new Set<string>() }
      item.pv++
      if (row.uid)
        item.uv.add(row.uid)
      pageMap.set(row.page, item)
    }
    if (ERROR_RANGE_TYPES.includes(row.range_type)) {
      const title = row.title || '未命名异常'
      const item = errorMap.get(title) ?? { count: 0, users: new Set<string>() }
      item.count++
      if (row.uid)
        item.users.add(row.uid)
      errorMap.set(title, item)
    }
  }

  return {
    window: { day: dayKey(todayStart), startTime: todayStart, endTime: nowTs },
    truncated: today.truncated || yesterday.truncated,
    overall,
    yesterday: yesterday.rows.length ? summarizeCore(yesterday.rows) : null,
    trend: [...trendMap.entries()].map(([bucket, item]) => ({
      bucket,
      pv: item.pv,
      uv: item.uv.size,
      errCount: item.errCount,
    })),
    topPages: [...pageMap.entries()]
      .map(([page, item]) => ({ page, pv: item.pv, uv: item.uv.size }))
      .sort((a, b) => b.pv - a.pv)
      .slice(0, 10),
    topErrors: [...errorMap.entries()]
      .map(([title, item]) => ({ title, count: item.count, users: item.users.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  }
}

export interface StageStat {
  avg: number | null
  p95: number | null
  max: number | null
  min: number | null
}

export interface PerfStats {
  granularity: 'hour' | 'day'
  approximate: boolean
  truncated: boolean
  overall: {
    pages: number
    samples: number
    stages: Record<string, StageStat>
    resource: {
      avgCount: number | null
      avgTotalKB: number | null
      slowTop: Array<{ name: string, avg: number | null, count: number }>
    }
  }
  trend: Array<{ day: string, loadAvg: number | null, loadP95: number | null }>
  pages: Array<{ page: string, samples: number, stages: Record<string, StageStat> }>
}

function buildStageStats(samples: Record<string, number[]>, approximate: boolean): Record<string, StageStat> {
  const result: Record<string, StageStat> = {}
  for (const stage of PERF_STAGES) {
    const values = samples[stage] ?? []
    if (!values.length)
      continue
    result[stage] = {
      avg: avg(values),
      p95: percentile(values, 95, approximate),
      max: Math.round(Math.max(...values)),
      min: Math.round(Math.min(...values)),
    }
  }
  return result
}

/** 性能统计：PERFORMANCE 埋点聚合 + RESOURCE_PER 资源汇总 */
export function getPerfStats(appId: string, startTime: number, endTime: number): PerfStats {
  const span = endTime - startTime
  const granularity: 'hour' | 'day' = span > DAY_GRANULARITY_THRESHOLD_MS ? 'day' : 'hour'
  const approximate = granularity === 'day'

  const perf = scanRows(appId, startTime, endTime, ['PERFORMANCE'])
  const resource = scanRows(appId, startTime, endTime, ['RESOURCE_PER'])

  const globalStages: Record<string, number[]> = {}
  const perPage = new Map<string, Record<string, number[]>>()
  const trendMap = new Map<string, number[]>()

  for (const row of perf.rows) {
    const extra = parseExtra(row.extra)
    const stages = (extra.stages ?? {}) as Record<string, unknown>
    const page = row.page || '未知页面'
    const bucketKey = granularity === 'day' ? dayKey(row.happen_time) : hourKey(row.happen_time)
    if (!trendMap.has(bucketKey))
      trendMap.set(bucketKey, [])

    for (const stage of PERF_STAGES) {
      const value = toNumber(stages[stage])
      if (value === null)
        continue
      ;(globalStages[stage] ??= []).push(value)
      const pageStages = perPage.get(page) ?? {}
      ;(pageStages[stage] ??= []).push(value)
      perPage.set(page, pageStages)
      if (stage === 'load')
        trendMap.get(bucketKey)!.push(value)
    }
  }

  const resourceCounts: number[] = []
  const resourceKB: number[] = []
  const slowResources = new Map<string, number[]>()
  for (const row of resource.rows) {
    const extra = parseExtra(row.extra)
    const count = toNumber(extra.count)
    const totalKB = toNumber(extra.totalKB)
    if (count !== null)
      resourceCounts.push(count)
    if (totalKB !== null)
      resourceKB.push(totalKB)
    for (const item of (extra.resources ?? []) as Array<Record<string, unknown>>) {
      const name = String(item.name ?? '')
      const duration = toNumber(item.duration)
      if (!name || duration === null)
        continue
      ;(slowResources.get(name) ?? slowResources.set(name, []).get(name)!).push(duration)
    }
  }

  const pages = [...perPage.entries()]
    .map(([page, stages]) => ({
      page,
      samples: (stages.load ?? []).length,
      stages: buildStageStats(stages, approximate),
    }))
    .sort((a, b) => (b.stages.load?.p95 ?? 0) - (a.stages.load?.p95 ?? 0))

  const trendKeys = [...trendMap.keys()].sort()

  return {
    granularity,
    approximate,
    truncated: perf.truncated || resource.truncated,
    overall: {
      pages: perPage.size,
      samples: perf.rows.length,
      stages: buildStageStats(globalStages, approximate),
      resource: {
        avgCount: avg(resourceCounts),
        avgTotalKB: avg(resourceKB),
        slowTop: [...slowResources.entries()]
          .map(([name, values]) => ({ name, avg: avg(values), count: values.length }))
          .filter(item => item.avg !== null)
          .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
          .slice(0, 10),
      },
    },
    trend: trendKeys.map(key => ({
      day: key,
      loadAvg: avg(trendMap.get(key) ?? []),
      loadP95: percentile(trendMap.get(key) ?? [], 95, approximate),
    })),
    pages,
  }
}

export interface ApiErrorSample {
  time: number
  status: number | null
  message: string
  duration: number | null
  page: string | null
  user: string | null
  requestId: string | null
  repeat: number
}

export interface ApiStats {
  truncated: boolean
  slowMs: number
  trend: Array<{ day: string, count: number, p95: number | null }>
  apis: Array<{
    url: string
    count: number
    avg: number | null
    max: number | null
    p95: number | null
    slowCount: number
    slowPct: number
    errorCount: number
    errorRate: number
    errors: ApiErrorSample[]
  }>
}

/** 接口分析：API 埋点聚合（调用次数、慢调用、报错、P95 趋势、错误样本） */
export function getApiStats(
  appId: string,
  startTime: number,
  endTime: number,
  source?: string,
  slowMs = DEFAULT_SLOW_MS,
): ApiStats {
  const span = endTime - startTime
  const approximate = span > DAY_GRANULARITY_THRESHOLD_MS
  const scan = scanRows(appId, startTime, endTime, ['API'])
  const rows = scan.rows.filter(row => matchSource(row, source))

  interface ApiAcc {
    count: number
    durations: number[]
    slowCount: number
    errorCount: number
    errors: Map<string, ApiErrorSample>
  }
  const apiMap = new Map<string, ApiAcc>()
  const trendMap = new Map<string, { count: number, durations: number[] }>()

  for (const row of rows) {
    const url = row.url || row.title || '未知接口'
    const acc = apiMap.get(url) ?? { count: 0, durations: [], slowCount: 0, errorCount: 0, errors: new Map<string, ApiErrorSample>() }
    acc.count++
    const duration = toNumber(row.duration)
    if (duration !== null)
      acc.durations.push(duration)
    if (duration !== null && duration >= slowMs)
      acc.slowCount++

    const isError = (row.status !== null && row.status >= 400) || row.status === 0 || row.type === 'ERROR'
    if (isError) {
      acc.errorCount++
      const message = row.title || '请求失败'
      const key = `${row.status ?? 'NET'}|${message}`
      const existing = acc.errors.get(key)
      if (existing) {
        existing.repeat++
        existing.time = Math.max(existing.time, row.happen_time)
      }
      else {
        acc.errors.set(key, {
          time: row.happen_time,
          status: row.status,
          message,
          duration,
          page: row.page,
          user: row.nickname,
          requestId: row.request_id,
          repeat: 1,
        })
      }
    }
    apiMap.set(url, acc)

    const bucketKey = approximate ? dayKey(row.happen_time) : hourKey(row.happen_time)
    const bucket = trendMap.get(bucketKey) ?? { count: 0, durations: [] }
    bucket.count++
    if (duration !== null)
      bucket.durations.push(duration)
    trendMap.set(bucketKey, bucket)
  }

  return {
    truncated: scan.truncated,
    slowMs,
    trend: [...trendMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, item]) => ({ day, count: item.count, p95: percentile(item.durations, 95, approximate) })),
    apis: [...apiMap.entries()]
      .map(([url, acc]) => ({
        url,
        count: acc.count,
        avg: avg(acc.durations),
        max: acc.durations.length ? Math.round(Math.max(...acc.durations)) : null,
        p95: percentile(acc.durations, 95, approximate),
        slowCount: acc.slowCount,
        slowPct: pct(acc.slowCount, acc.durations.length),
        errorCount: acc.errorCount,
        errorRate: pct(acc.errorCount, acc.durations.length),
        errors: [...acc.errors.values()].sort((a, b) => b.time - a.time).slice(0, 5),
      }))
      .sort((a, b) => b.count - a.count),
  }
}

export interface BehaviorStats {
  truncated: boolean
  longWindow: boolean
  overall: { pv: number, uv: number | null, clicks: number, paths: number }
  trend: Array<{ day: string, pv: number, uv: number | null }>
  topClicks: Array<{ label: string, count: number, pages: string[] }>
  pageviews: Array<{ page: string, pv: number, uv: number | null }>
  topPaths: Array<{ from: string, to: string, count: number }>
}

/** 行为分析：PV/UV、点击、页面访问、路径流转 */
export function getBehaviorStats(
  appId: string,
  startTime: number,
  endTime: number,
  source?: string,
): BehaviorStats {
  const span = endTime - startTime
  const longWindow = span > DAY_GRANULARITY_THRESHOLD_MS
  const scan = scanRows(appId, startTime, endTime, ['USER_ROUTE', 'USER_CLICK'])
  const rows = scan.rows.filter(row => matchSource(row, source))

  const users = new Set<string>()
  const pathPairs = new Set<string>()
  let pv = 0
  let clicks = 0

  const clickMap = new Map<string, { count: number, pages: Set<string> }>()
  const pageMap = new Map<string, { pv: number, uv: Set<string> }>()
  const pathMap = new Map<string, number>()
  const trendMap = new Map<string, { pv: number, uv: Set<string> }>()

  for (const row of rows) {
    const bucketKey = longWindow ? dayKey(row.happen_time) : hourKey(row.happen_time)
    const bucket = trendMap.get(bucketKey) ?? { pv: 0, uv: new Set<string>() }
    if (row.uid) {
      users.add(row.uid)
      bucket.uv.add(row.uid)
    }

    if (row.range_type === 'USER_ROUTE') {
      pv++
      bucket.pv++
      const page = row.page || '未知页面'
      const pageItem = pageMap.get(page) ?? { pv: 0, uv: new Set<string>() }
      pageItem.pv++
      if (row.uid)
        pageItem.uv.add(row.uid)
      pageMap.set(page, pageItem)

      const from = String(parseExtra(row.extra).from ?? '')
      if (from && from !== page) {
        const pairKey = `${from} -> ${page}`
        pathPairs.add(pairKey)
        pathMap.set(pairKey, (pathMap.get(pairKey) ?? 0) + 1)
      }
    }
    else if (row.range_type === 'USER_CLICK') {
      clicks++
      const label = row.title || '未命名点击'
      const item = clickMap.get(label) ?? { count: 0, pages: new Set<string>() }
      item.count++
      if (row.page)
        item.pages.add(row.page)
      clickMap.set(label, item)
    }
    trendMap.set(bucketKey, bucket)
  }

  return {
    truncated: scan.truncated,
    longWindow,
    overall: { pv, uv: longWindow ? null : users.size, clicks, paths: pathPairs.size },
    trend: [...trendMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, item]) => ({ day, pv: item.pv, uv: longWindow ? null : item.uv.size })),
    topClicks: [...clickMap.entries()]
      .map(([label, item]) => ({ label, count: item.count, pages: [...item.pages].slice(0, 5) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    pageviews: [...pageMap.entries()]
      .map(([page, item]) => ({ page, pv: item.pv, uv: longWindow ? null : item.uv.size }))
      .sort((a, b) => b.pv - a.pv)
      .slice(0, 50),
    topPaths: [...pathMap.entries()]
      .map(([key, count]) => {
        const [from, to] = key.split(' -> ')
        return { from: from ?? '', to: to ?? '', count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
  }
}

export interface ErrorStats {
  kind: 'js' | 'biz'
  granularity: 'hour' | 'day'
  truncated: boolean
  longWindow: boolean
  total: { count: number, rate: number, users: number, userPct: number | null, denominator: number }
  trend: Array<{ bucket: string, count: number, users: number, base: number }>
  top: Array<{ title: string, count: number, pct: number, users: number, lastPage: string | null, lastTime: number }>
}

/**
 * 错误聚合统计。
 * kind=js：WINDOW_ERROR + PROMISE_ERROR，失败率分母为 PV（采样近似、分子全量，方向性高估）。
 * kind=biz：PROACTIVE_REPORTING 中 type=ERROR/WARN 视为失败，分母为同期主动上报操作总数。
 */
export function getErrorStats(
  appId: string,
  startTime: number,
  endTime: number,
  kind: 'js' | 'biz',
  granularity?: 'hour' | 'day',
  source?: string,
): ErrorStats {
  const span = endTime - startTime
  const longWindow = span > DAY_GRANULARITY_THRESHOLD_MS
  const resolvedGranularity: 'hour' | 'day' = longWindow ? 'day' : (granularity ?? 'hour')

  // js 的失败率分母是 PV，biz 的分母是同期主动上报操作总数，两者扫描范围不同
  const rangeTypes = kind === 'js' ? [...ERROR_RANGE_TYPES, 'USER_ROUTE'] : ['PROACTIVE_REPORTING']
  const scan = scanRows(appId, startTime, endTime, rangeTypes)
  const rows = scan.rows.filter(row => matchSource(row, source))

  const isFailure = (row: RawRow): boolean =>
    kind === 'js' ? ERROR_RANGE_TYPES.includes(row.range_type) : row.type === 'ERROR' || row.type === 'WARN'
  const isBase = (row: RawRow): boolean =>
    kind === 'js' ? row.range_type === 'USER_ROUTE' : row.range_type === 'PROACTIVE_REPORTING'

  const users = new Set<string>()
  const affectedUsers = new Set<string>()
  let count = 0
  let denominator = 0

  const titleMap = new Map<string, { count: number, users: Set<string>, lastPage: string | null, lastTime: number }>()
  const trendMap = new Map<string, { count: number, users: Set<string>, base: number }>()

  for (const row of rows) {
    if (row.uid)
      users.add(row.uid)
    const bucketKey = resolvedGranularity === 'day' ? dayKey(row.happen_time) : hourKey(row.happen_time)
    const bucket = trendMap.get(bucketKey) ?? { count: 0, users: new Set<string>(), base: 0 }

    if (isBase(row)) {
      denominator++
      bucket.base++
    }
    if (isFailure(row)) {
      count++
      bucket.count++
      if (row.uid) {
        affectedUsers.add(row.uid)
        bucket.users.add(row.uid)
      }
      const title = row.title || (kind === 'js' ? '未命名异常' : '未命名操作')
      const item = titleMap.get(title) ?? { count: 0, users: new Set<string>(), lastPage: row.page, lastTime: row.happen_time }
      item.count++
      if (row.uid)
        item.users.add(row.uid)
      if (row.happen_time >= item.lastTime) {
        item.lastTime = row.happen_time
        item.lastPage = row.page
      }
      titleMap.set(title, item)
    }
    trendMap.set(bucketKey, bucket)
  }

  return {
    kind,
    granularity: resolvedGranularity,
    truncated: scan.truncated,
    longWindow,
    total: {
      count,
      rate: pct(count, denominator),
      users: affectedUsers.size,
      userPct: longWindow ? null : pct(affectedUsers.size, users.size),
      denominator,
    },
    trend: [...trendMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bucket, item]) => ({ bucket, count: item.count, users: item.users.size, base: item.base })),
    top: [...titleMap.entries()]
      .map(([title, item]) => ({
        title,
        count: item.count,
        pct: pct(item.count, count),
        users: item.users.size,
        lastPage: item.lastPage,
        lastTime: item.lastTime,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50),
  }
}

/** 预警判定用的轻量窗口计数 */
export function countWindow(
  appId: string,
  startTime: number,
  endTime: number,
  filter: { rangeTypes?: string[], types?: string[], urlLike?: string, paramsPrefix?: string },
): { count: number, durations: number[], titles: Map<string, number> } {
  const scan = scanRows(appId, startTime, endTime, filter.rangeTypes)
  const durations: number[] = []
  const titles = new Map<string, number>()
  let count = 0

  for (const row of scan.rows) {
    if (filter.types?.length && !filter.types.includes(row.type))
      continue
    if (filter.paramsPrefix && sourceOf(row.params) !== filter.paramsPrefix)
      continue
    if (filter.urlLike && !(row.url ?? '').includes(filter.urlLike))
      continue
    count++
    const duration = toNumber(row.duration)
    if (duration !== null)
      durations.push(duration)
    const key = row.url || row.title || '未知'
    titles.set(key, (titles.get(key) ?? 0) + 1)
  }
  return { count, durations, titles }
}