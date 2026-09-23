import type { AlertConfig, MonitorAlertHistory, MonitorApp } from './schema'
import { getDb } from '../../db'
import { now } from '../../lib/date'
import { NotFoundError } from '../../lib/errors'
import { ALERT_RULE_MAP, DEFAULT_COOLDOWN_MINUTES } from './constants'
import type { AlertPayload, ChannelResult } from './channels'
import { dispatchChannels } from './channels'
import { listApps } from './service'

/** 已知埋点类目，FALLBACK_AGG 用于兜底未匹配类目 */
const KNOWN_RANGE_TYPES = [
  'WINDOW_ERROR',
  'PROMISE_ERROR',
  'API',
  'PERFORMANCE',
  'RESOURCE_PER',
  'USER_CLICK',
  'USER_ROUTE',
  'PROACTIVE_REPORTING',
]

interface WindowRow {
  happen_time: number
  range_type: string
  type: string
  params: string | null
  title: string | null
  page: string | null
  url: string | null
  status: number | null
  duration: number | null
}

function fetchWindowRows(appId: string, startTime: number, endTime: number, rangeTypes?: string[]): WindowRow[] {
  const db = getDb()
  const conditions = ['app_id = ?', 'happen_time >= ?', 'happen_time <= ?']
  const args: Array<string | number> = [appId, startTime, endTime]
  if (rangeTypes?.length) {
    conditions.push(`range_type IN (${rangeTypes.map(() => '?').join(', ')})`)
    args.push(...rangeTypes)
  }
  return db.prepare(
    `SELECT happen_time, range_type, type, params, title, page, url, status, duration
     FROM za_monitor_log WHERE ${conditions.join(' AND ')} ORDER BY happen_time ASC LIMIT 20000`,
  ).all(...args) as unknown as WindowRow[]
}

function sourceOf(params: string | null): string {
  return params ? (params.split(',')[0]?.trim() ?? '') : ''
}

function isErrorStatus(row: WindowRow): boolean {
  return (row.status !== null && row.status >= 400) || row.status === 0 || row.type === 'ERROR'
}

/** 冷却表：appId:ruleId:dimension -> 最近触发时间 */
const cooldownMap = new Map<string, number>()

function cooldownKey(appId: string, ruleId: string, dimension: string): string {
  return `${appId}:${ruleId}:${dimension}`
}

function isInCooldown(key: string, cooldownMinutes: number | null): boolean {
  const last = cooldownMap.get(key)
  if (!last)
    return false
  const cooldownMs = (cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES) * 60 * 1000
  return Date.now() - last < cooldownMs
}

function markCooldown(key: string): void {
  cooldownMap.set(key, Date.now())
}

function insertHistory(input: {
  appId: string
  ruleId: string
  alertType: string
  level: string
  title: string
  fields: Record<string, unknown>
  happenTime: number
  startTime: number
  endTime: number
  channels: ChannelResult[]
  cooldownHit: number
}): number {
  const result = getDb().prepare(`
    INSERT INTO za_monitor_alert_history
      (app_id, rule_id, alert_type, level, title, fields, happen_time, start_time, end_time, channels, cooldown_hit, retry_count, create_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    input.appId,
    input.ruleId,
    input.alertType,
    input.level,
    input.title,
    JSON.stringify(input.fields ?? {}),
    input.happenTime,
    input.startTime,
    input.endTime,
    JSON.stringify(input.channels ?? []),
    input.cooldownHit,
    now(),
  )
  return Number(result.lastInsertRowid)
}

async function fire(
  app: MonitorApp,
  ruleId: string,
  level: 'INFO' | 'WARN' | 'ERROR',
  title: string,
  fields: Record<string, unknown>,
  window: { startTime: number, endTime: number, minutes: number },
): Promise<void> {
  const meta = ALERT_RULE_MAP.get(ruleId)
  const config = app.props.alert as AlertConfig
  const payload: AlertPayload = {
    appId: app.appId,
    appName: app.appName,
    ruleId,
    ruleLabel: meta?.label ?? ruleId,
    alertType: meta?.alertType ?? ruleId,
    level,
    title,
    windowMinutes: window.minutes,
    happenTime: Date.now(),
    fields,
  }

  const results = await dispatchChannels(config.channels, payload)
  insertHistory({
    appId: app.appId,
    ruleId,
    alertType: payload.alertType,
    level,
    title,
    fields,
    happenTime: payload.happenTime,
    startTime: window.startTime,
    endTime: window.endTime,
    channels: results,
    cooldownHit: 0,
  })
}

interface Hit {
  ruleId: string
  dimension: string
  level: 'INFO' | 'WARN' | 'ERROR'
  title: string
  windowMinutes: number
  fields: Record<string, unknown>
}

function ruleConfig(app: MonitorApp, ruleId: string): { enabled: boolean, values: Record<string, any> } | null {
  const meta = ALERT_RULE_MAP.get(ruleId)
  const config = app.props.alert
  if (!meta || !config?.enabled)
    return null
  const rule = (config.rules ?? []).find(item => item.id === ruleId)
  const body = (rule?.[meta.channel] ?? {}) as Record<string, any>
  if (!body || body.enabled === false)
    return null
  return { enabled: true, values: { ...meta.defaults, ...body } }
}

/** 实时通道规则：API_SLOW / API_ERROR / PROACTIVE_RT，按维度（接口/操作）滑窗判定 */
export function evaluateRealtimeRules(app: MonitorApp): Hit[] {
  const hits: Hit[] = []
  const endTime = Date.now()

  for (const ruleId of ['API_SLOW', 'API_ERROR', 'PROACTIVE_RT']) {
    const rule = ruleConfig(app, ruleId)
    if (!rule)
      continue
    const { windowMinutes, minCount, minDurationMs, paramsPrefix } = rule.values
    const startTime = endTime - windowMinutes * 60 * 1000
    const rangeTypes = ruleId === 'PROACTIVE_RT' ? ['PROACTIVE_REPORTING'] : ['API']
    const rows = fetchWindowRows(app.appId, startTime, endTime, rangeTypes).filter(
      row => !paramsPrefix || sourceOf(row.params) === paramsPrefix,
    )
    if (!rows.length)
      continue

    const groups = new Map<string, WindowRow[]>()
    for (const row of rows) {
      const key = ruleId === 'PROACTIVE_RT' ? (row.title || '未命名操作') : (row.url || row.title || '未知接口')
      const list = groups.get(key) ?? []
      list.push(row)
      groups.set(key, list)
    }

    for (const [dimension, list] of groups) {
      let matched: WindowRow[]
      if (ruleId === 'API_SLOW')
        matched = list.filter(row => (row.duration ?? 0) >= Number(minDurationMs ?? 0))
      else if (ruleId === 'API_ERROR')
        matched = list.filter(isErrorStatus)
      else
        matched = list.filter(row => row.type === 'ERROR' || row.type === 'WARN')

      if (matched.length < Number(minCount))
        continue

      hits.push({
        ruleId,
        dimension,
        windowMinutes: Number(windowMinutes),
        level: ruleId === 'API_SLOW' ? 'WARN' : 'ERROR',
        title: ruleId === 'API_SLOW'
          ? `接口慢调用：${dimension}`
          : ruleId === 'API_ERROR'
            ? `接口报错：${dimension}`
            : `业务操作失败：${dimension}`,
        fields: {
          维度: dimension,
          命中次数: matched.length,
          阈值: minCount,
          窗口: `${windowMinutes} 分钟`,
          ...(ruleId === 'API_SLOW'
            ? {
                慢门槛ms: minDurationMs,
                平均耗时ms: Math.round(matched.reduce((sum, row) => sum + (row.duration ?? 0), 0) / matched.length),
                最大耗时ms: Math.max(...matched.map(row => row.duration ?? 0)),
              }
            : {}),
          最近页面: matched[matched.length - 1]?.page ?? '',
        },
      })
    }
  }
  return hits
}

/** 聚合通道规则：定时巡检窗口聚合结果 */
export function evaluateAggRules(app: MonitorApp): Hit[] {
  const hits: Hit[] = []
  const endTime = Date.now()

  for (const ruleId of ['API_AGG', 'WINDOW_ERROR_AGG', 'PROMISE_ERROR_AGG', 'PROACTIVE_AGG', 'FALLBACK_AGG']) {
    const rule = ruleConfig(app, ruleId)
    if (!rule)
      continue
    const { windowMinutes, minCount, avgMs, maxMs } = rule.values
    const startTime = endTime - windowMinutes * 60 * 1000

    if (ruleId === 'API_AGG') {
      const rows = fetchWindowRows(app.appId, startTime, endTime, ['API'])
      const groups = new Map<string, WindowRow[]>()
      for (const row of rows) {
        const key = row.url || row.title || '未知接口'
        const list = groups.get(key) ?? []
        list.push(row)
        groups.set(key, list)
      }
      for (const [dimension, list] of groups) {
        if (list.length < Number(minCount))
          continue
        const durations = list.map(row => row.duration ?? 0)
        const mean = durations.reduce((sum, v) => sum + v, 0) / durations.length
        const max = Math.max(...durations)
        if (mean < Number(avgMs) && max < Number(maxMs))
          continue
        hits.push({
          ruleId,
          dimension,
          windowMinutes: Number(windowMinutes),
          level: 'WARN',
          title: `接口聚合巡检：${dimension}`,
          fields: {
            维度: dimension,
            调用次数: list.length,
            平均耗时ms: Math.round(mean),
            最大耗时ms: Math.round(max),
            阈值: `avg>=${avgMs} 或 max>=${maxMs}`,
            窗口: `${windowMinutes} 分钟`,
          },
        })
      }
      continue
    }

    let rows: WindowRow[]
    let level: 'INFO' | 'WARN' | 'ERROR' = 'ERROR'
    let label = ruleId
    if (ruleId === 'WINDOW_ERROR_AGG') {
      rows = fetchWindowRows(app.appId, startTime, endTime, ['WINDOW_ERROR'])
      label = '脚本异常突增'
    }
    else if (ruleId === 'PROMISE_ERROR_AGG') {
      rows = fetchWindowRows(app.appId, startTime, endTime, ['PROMISE_ERROR'])
      label = 'Promise 异常突增'
    }
    else if (ruleId === 'PROACTIVE_AGG') {
      rows = fetchWindowRows(app.appId, startTime, endTime, ['PROACTIVE_REPORTING'])
        .filter(row => row.type === 'ERROR' || row.type === 'WARN')
      label = '业务失败突增'
    }
    else {
      rows = fetchWindowRows(app.appId, startTime, endTime).filter(
        row => !KNOWN_RANGE_TYPES.includes(row.range_type),
      )
      label = '未知类目兜底'
      level = 'WARN'
    }

    if (rows.length < Number(minCount))
      continue

    const top = new Map<string, number>()
    for (const row of rows) {
      const key = row.title || '未命名'
      top.set(key, (top.get(key) ?? 0) + 1)
    }
    const [topTitle, topCount] = [...top.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['-', 0]

    hits.push({
      ruleId,
      dimension: ruleId,
      windowMinutes: Number(windowMinutes),
      level,
      title: `${label}：${topTitle}`,
      fields: {
        命中次数: rows.length,
        阈值: minCount,
        窗口: `${windowMinutes} 分钟`,
        Top标题: topTitle,
        Top次数: topCount,
        最近页面: rows[rows.length - 1]?.page ?? '',
      },
    })
  }
  return hits
}

/** 实时规则节流：同一应用最快 15 秒评估一次，避免每次 flush 都全表扫窗口 */
const realtimeThrottle = new Map<string, number>()
const REALTIME_INTERVAL_MS = 15_000

export async function evaluateApp(app: MonitorApp, kind: 'realtime' | 'agg'): Promise<void> {
  const config = app.props.alert
  if (!config?.enabled || app.operatingState !== 1)
    return

  const hits = kind === 'realtime' ? evaluateRealtimeRules(app) : evaluateAggRules(app)
  const nowTs = Date.now()

  for (const hit of hits) {
    const window = {
      minutes: hit.windowMinutes,
      endTime: nowTs,
      startTime: nowTs - hit.windowMinutes * 60 * 1000,
    }
    const key = cooldownKey(app.appId, hit.ruleId, hit.dimension)
    if (isInCooldown(key, config.cooldownMinutes)) {
      insertHistory({
        appId: app.appId,
        ruleId: hit.ruleId,
        alertType: ALERT_RULE_MAP.get(hit.ruleId)?.alertType ?? hit.ruleId,
        level: hit.level,
        title: hit.title,
        fields: hit.fields,
        happenTime: nowTs,
        startTime: window.startTime,
        endTime: window.endTime,
        channels: [],
        cooldownHit: 1,
      })
      continue
    }
    markCooldown(key)
    await fire(app, hit.ruleId, hit.level, hit.title, hit.fields, window)
  }
}

/** 实时评估入口（由队列 flush 后调用，内部节流） */
export async function evaluateRealtime(appId: string): Promise<void> {
  const last = realtimeThrottle.get(appId) ?? 0
  if (Date.now() - last < REALTIME_INTERVAL_MS)
    return
  realtimeThrottle.set(appId, Date.now())

  const app = listApps().find(item => item.appId === appId)
  if (!app)
    return
  await evaluateApp(app, 'realtime')
}

/** 聚合巡检：默认每 60 秒一轮，遍历所有开启预警的应用 */
let sweepTimer: NodeJS.Timeout | null = null

export function startAlertSweeper(intervalMs = 60_000): void {
  if (sweepTimer)
    return
  sweepTimer = setInterval(() => {
    for (const app of listApps()) {
      if (app.props.alert?.enabled)
        evaluateApp(app, 'agg').catch(error => console.error('[monitor] 聚合巡检失败', error))
    }
  }, intervalMs)
  sweepTimer.unref?.()
}

export function stopAlertSweeper(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer)
    sweepTimer = null
  }
}

export interface AlertHistoryQuery {
  appId: string
  startTime: number
  endTime: number
  alertType?: string
  channel?: string
  ok?: string
  pageNum?: number
  pageSize?: number
}

export function listAlertHistory(query: AlertHistoryQuery) {
  const db = getDb()
  const pageNum = Math.max(1, query.pageNum ?? 1)
  const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 20))
  const conditions = ['app_id = ?', 'happen_time >= ?', 'happen_time <= ?']
  const args: Array<string | number> = [query.appId, query.startTime, query.endTime]
  if (query.alertType) {
    conditions.push('alert_type = ?')
    args.push(query.alertType)
  }

  // 通知结果存放在 JSON 列，筛选下推到 SQL，保证 total 与分页 list 口径一致
  const channelsJson = 'COALESCE(channels, \'[]\')'
  if (query.channel) {
    conditions.push(`EXISTS (SELECT 1 FROM json_each(${channelsJson}) WHERE json_extract(value, '$.type') = ?)`)
    args.push(query.channel)
  }
  if (query.ok === '1') {
    conditions.push(`NOT EXISTS (SELECT 1 FROM json_each(${channelsJson}) WHERE json_extract(value, '$.ok') = 0)`)
  }
  else if (query.ok === '0') {
    conditions.push(`(json_array_length(${channelsJson}) = 0 OR EXISTS (SELECT 1 FROM json_each(${channelsJson}) WHERE json_extract(value, '$.ok') = 0))`)
  }

  const where = conditions.join(' AND ')
  const total = Number(
    (db.prepare(`SELECT COUNT(*) AS c FROM za_monitor_alert_history WHERE ${where}`).get(...args) as { c: number }).c,
  )
  const rows = db.prepare(`
    SELECT id, app_id AS appId, rule_id AS ruleId, alert_type AS alertType, level, title, fields,
           happen_time AS happenTime, start_time AS startTime, end_time AS endTime, channels,
           cooldown_hit AS cooldownHit, retry_count AS retryCount, last_retry_time AS lastRetryTime,
           create_time AS createTime
    FROM za_monitor_alert_history
    WHERE ${where}
    ORDER BY happen_time DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(...args, pageSize, (pageNum - 1) * pageSize) as Array<Record<string, any>>

  const list = rows.map(row => ({
    ...row,
    fields: safeParse(row.fields, {}),
    channels: safeParse<ChannelResult[]>(row.channels, []),
  })) as unknown as MonitorAlertHistory[]

  return { pageNum, pageSize, totalPage: Math.ceil(total / pageSize), total, list }
}

function safeParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string')
    return fallback
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return fallback
  }
}

/** 失败重发：仅重投失败通道，不产生冷却命中计数 */
export async function retryAlert(id: number): Promise<MonitorAlertHistory> {
  const db = getDb()
  const row = db.prepare('SELECT * FROM za_monitor_alert_history WHERE id = ?').get(id) as Record<string, any> | undefined
  if (!row)
    throw new NotFoundError('预警记录不存在')

  const app = listApps().find(item => item.appId === row.app_id)
  const meta = ALERT_RULE_MAP.get(row.rule_id)
  const previous = safeParse<ChannelResult[]>(row.channels, [])
  const payload: AlertPayload = {
    appId: row.app_id,
    appName: app?.appName ?? row.app_id,
    ruleId: row.rule_id,
    ruleLabel: meta?.label ?? row.rule_id,
    alertType: row.alert_type,
    level: row.level,
    title: row.title,
    windowMinutes: Math.max(1, Math.round((row.end_time - row.start_time) / 60000)),
    happenTime: row.happen_time,
    fields: safeParse(row.fields, {}),
  }

  const failedTypes = new Set(previous.filter(item => !item.ok).map(item => item.type))
  const channels = (app?.props.alert?.channels ?? []).filter(
    channel => failedTypes.size === 0 || failedTypes.has(channel.type),
  )
  const results = await dispatchChannels(channels, payload)
  const merged = previous.map((item) => {
    const retry = results.find(result => result.type === item.type)
    return retry ?? item
  })
  for (const result of results) {
    if (!merged.some(item => item.type === result.type))
      merged.push(result)
  }

  db.prepare(
    'UPDATE za_monitor_alert_history SET channels = ?, retry_count = retry_count + 1, last_retry_time = ? WHERE id = ?',
  ).run(JSON.stringify(merged), now(), id)

  return {
    ...(row as any),
    channels: merged,
    retryCount: Number(row.retry_count) + 1,
    lastRetryTime: now(),
  } as MonitorAlertHistory
}

/** 预警记录保留期清理 */
export function pruneAlertHistory(retentionDays: number): number {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  return Number(getDb().prepare('DELETE FROM za_monitor_alert_history WHERE happen_time < ?').run(cutoff).changes)
}