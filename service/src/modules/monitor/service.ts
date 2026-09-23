import type { MonitorApp, MonitorAppProps, MonitorAppType, MonitorLog } from './schema'
import { getDb } from '../../db'
import { now } from '../../lib/date'
import { ConflictError, NotFoundError } from '../../lib/errors'
import { DEFAULT_QUEUE_CONFIG } from './constants'
import { getQueue, insertLog, removeQueue } from './queue'

interface AppRow {
  id: number
  app_id: string
  app_name: string
  type: string
  content: string | null
  operating_state: number
  props: string | null
  create_time: string | null
  update_time: string | null
}

function parseProps(raw: string | null): MonitorAppProps {
  if (!raw)
    return { ...DEFAULT_QUEUE_CONFIG, enableQueue: false, consume: { enabled: false }, alert: null }
  try {
    const parsed = JSON.parse(raw) as MonitorAppProps
    return { ...DEFAULT_QUEUE_CONFIG, ...parsed }
  }
  catch {
    return { ...DEFAULT_QUEUE_CONFIG }
  }
}

function toApp(row: AppRow): MonitorApp {
  return {
    id: row.id,
    appId: row.app_id,
    appName: row.app_name,
    type: row.type as MonitorAppType,
    content: row.content,
    operatingState: row.operating_state,
    props: parseProps(row.props),
    createTime: row.create_time,
    updateTime: row.update_time,
  }
}

export function listApps(keyword?: string): MonitorApp[] {
  const db = getDb()
  const rows = keyword
    ? db.prepare(
        'SELECT * FROM za_monitor_app WHERE app_id LIKE ? OR app_name LIKE ? OR content LIKE ? ORDER BY id ASC',
      ).all(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`) as unknown as AppRow[]
    : db.prepare('SELECT * FROM za_monitor_app ORDER BY id ASC').all() as unknown as AppRow[]
  return rows.map(toApp)
}

export function getApp(appId: string): MonitorApp | undefined {
  const row = getDb().prepare('SELECT * FROM za_monitor_app WHERE app_id = ?').get(appId) as unknown as AppRow | undefined
  return row ? toApp(row) : undefined
}

export function getAppOrThrow(appId: string): MonitorApp {
  const app = getApp(appId)
  if (!app)
    throw new NotFoundError('应用不存在')
  return app
}

/** 采集侧高频读取：带 5 秒 TTL 的应用缓存，避免每条上报都打库 */
const appCache = new Map<string, { app: MonitorApp | undefined, expireAt: number }>()
const APP_CACHE_TTL = 5000

export function getAppCached(appId: string): MonitorApp | undefined {
  const hit = appCache.get(appId)
  if (hit && hit.expireAt > Date.now())
    return hit.app
  const app = getApp(appId)
  appCache.set(appId, { app, expireAt: Date.now() + APP_CACHE_TTL })
  return app
}

export function invalidateAppCache(appId?: string): void {
  if (appId)
    appCache.delete(appId)
  else
    appCache.clear()
}

export interface AppInput {
  appId?: string
  appName?: string
  type?: MonitorAppType
  content?: string
  operatingState?: number
  props?: MonitorAppProps
}

export function createApp(input: AppInput): MonitorApp {
  const appId = (input.appId ?? '').trim()
  if (!appId)
    throw new NotFoundError('appId 不能为空')
  if (getApp(appId))
    throw new ConflictError('appId 已存在')

  const timestamp = now()
  const props: MonitorAppProps = { ...DEFAULT_QUEUE_CONFIG, ...input.props }
  getDb().prepare(`
    INSERT INTO za_monitor_app (app_id, app_name, type, content, operating_state, props, create_time, update_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    appId,
    input.appName?.trim() || appId,
    input.type ?? 'realTimeLog',
    input.content ?? null,
    input.operatingState ?? 1,
    JSON.stringify(props),
    timestamp,
    timestamp,
  )
  invalidateAppCache(appId)
  syncQueue(appId, props)
  return getAppOrThrow(appId)
}

export function updateApp(appId: string, patch: AppInput): MonitorApp {
  const current = getAppOrThrow(appId)
  const nextProps: MonitorAppProps = { ...current.props, ...(patch.props ?? {}) }
  if (patch.props?.consume)
    nextProps.consume = { ...current.props.consume, ...patch.props.consume }
  if (patch.props && 'alert' in patch.props)
    nextProps.alert = patch.props.alert ?? null

  getDb().prepare(`
    UPDATE za_monitor_app
    SET app_name = ?, type = ?, content = ?, operating_state = ?, props = ?, update_time = ?
    WHERE app_id = ?
  `).run(
    patch.appName?.trim() || current.appName,
    patch.type ?? current.type,
    patch.content ?? current.content,
    patch.operatingState ?? current.operatingState,
    JSON.stringify(nextProps),
    now(),
    appId,
  )
  invalidateAppCache(appId)
  syncQueue(appId, nextProps)
  return getAppOrThrow(appId)
}

/** 队列参数变更后同步到运行时实例；关闭队列则回收实例（改走同步写库） */
function syncQueue(appId: string, props: MonitorAppProps): void {
  if (props.enableQueue) {
    getQueue(appId, getDb(), {
      maxSize: props.maxSize,
      batchSize: props.batchSize,
      flushInterval: props.flushInterval,
      retryAttempts: props.retryAttempts,
      retryDelay: props.retryDelay,
    })
  }
  else {
    removeQueue(appId)
  }
}

export function ensureQueue(appId: string, props: MonitorAppProps): void {
  syncQueue(appId, props)
}

/** 同步写库（应用未启用队列时的落库路径） */
export function writeLogSync(appId: string, log: Omit<MonitorLog, 'id' | 'appId' | 'createTime'>): void {
  insertLog(getDb(), { ...log, appId } as any)
}

export interface LogQuery {
  appId: string
  startTime: number
  endTime: number
  nickname?: string
  params?: string
  type?: string
  logId?: string
  title?: string
  content?: string
  rangeType?: string
  pageNum?: number
  pageSize?: number
}

export interface LogPage {
  pageNum: number
  pageSize: number
  totalPage: number
  total: number
  list: MonitorLog[]
}

const LOG_COLUMNS = `
  id, app_id AS appId, log_id AS logId, serial, happen_time AS happenTime, type,
  range_type AS rangeType, params, title, content, nickname, uid, page, url, method,
  status, duration, request_id AS requestId, extra, create_time AS createTime
`

function buildLogWhere(query: LogQuery): { sql: string, args: Array<string | number> } {
  const conditions = ['app_id = ?', 'happen_time >= ?', 'happen_time <= ?']
  const args: Array<string | number> = [query.appId, query.startTime, query.endTime]

  const push = (column: string, value: string | undefined) => {
    if (value === undefined || value === '')
      return
    conditions.push(`${column} LIKE ?`)
    args.push(`%${value}%`)
  }

  push('nickname', query.nickname)
  push('params', query.params)
  push('title', query.title)
  push('content', query.content)
  push('range_type', query.rangeType)

  if (query.type) {
    conditions.push('type = ?')
    args.push(query.type)
  }
  if (query.logId) {
    conditions.push('log_id = ?')
    args.push(query.logId)
  }
  return { sql: conditions.join(' AND '), args }
}

export function queryLogs(query: LogQuery): LogPage {
  const db = getDb()
  const pageNum = Math.max(1, query.pageNum ?? 1)
  const pageSize = Math.min(5000, Math.max(1, query.pageSize ?? 100))
  const { sql, args } = buildLogWhere(query)

  const total = Number(
    (db.prepare(`SELECT COUNT(*) AS c FROM za_monitor_log WHERE ${sql}`).get(...args) as { c: number }).c,
  )
  // 指定批次 id 时升序还原调用链，否则按发生时间倒序
  const order = query.logId ? 'happen_time ASC, serial ASC' : 'happen_time DESC, id DESC'
  const rows = db.prepare(
    `SELECT ${LOG_COLUMNS} FROM za_monitor_log WHERE ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`,
  ).all(...args, pageSize, (pageNum - 1) * pageSize) as Array<Record<string, unknown>>

  return {
    pageNum,
    pageSize,
    totalPage: Math.ceil(total / pageSize),
    total,
    list: rows.map(row => ({ ...row, extra: row.extra ? safeParse(row.extra) : undefined })) as unknown as MonitorLog[],
  }
}

function safeParse(raw: unknown): Record<string, unknown> | undefined {
  if (typeof raw !== 'string')
    return undefined
  try {
    return JSON.parse(raw) as Record<string, unknown>
  }
  catch {
    return undefined
  }
}

/** 明细日志保留期清理，返回删除条数 */
export function pruneLogs(retentionDays: number): number {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  const result = getDb().prepare('DELETE FROM za_monitor_log WHERE happen_time < ?').run(cutoff)
  return Number(result.changes)
}