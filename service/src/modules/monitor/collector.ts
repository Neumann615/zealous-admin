import type { MonitorLogInput } from './schema'
import { randomUUID } from 'node:crypto'
import { getDb } from '../../db'
import { getAppCached } from './service'
import { findQueue, getQueue, insertLog } from './queue'
import type { QueuedLog } from './queue'

/** 采集侧上报体：一个批次（同一次网络请求）内的多条日志 */
export interface CollectPayload {
  appId: string
  /** 批次 id，缺省时由服务端生成 */
  logId?: string
  /** 批次级公共字段，单条日志未显式给出时继承 */
  uid?: string
  nickname?: string
  page?: string
  logs: MonitorLogInput[]
}

export interface CollectResult {
  accepted: number
  dropped: number
  queued: boolean
  logId: string
}

const MAX_BATCH_SIZE = 100
const MAX_CONTENT_LENGTH = 20_000
const MAX_TITLE_LENGTH = 500

function truncate(value: string | undefined, max: number): string | undefined {
  if (value === undefined)
    return undefined
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function normalize(
  payload: CollectPayload,
  log: MonitorLogInput,
  index: number,
  logId: string,
): QueuedLog {
  const extra = log.extra && typeof log.extra === 'object' ? log.extra : undefined
  return {
    appId: payload.appId,
    logId,
    serial: typeof log.serial === 'number' ? log.serial : index,
    happenTime: typeof log.happenTime === 'number' && log.happenTime > 0 ? log.happenTime : Date.now(),
    type: log.type ?? 'INFO',
    rangeType: log.rangeType,
    params: truncate(log.params, MAX_TITLE_LENGTH),
    title: truncate(log.title, MAX_TITLE_LENGTH),
    content: truncate(log.content, MAX_CONTENT_LENGTH),
    nickname: log.nickname ?? payload.nickname,
    uid: log.uid ?? payload.uid,
    page: log.page ?? payload.page,
    url: truncate(log.url, MAX_TITLE_LENGTH),
    method: log.method,
    status: typeof log.status === 'number' ? log.status : undefined,
    duration: typeof log.duration === 'number' ? log.duration : undefined,
    requestId: log.requestId,
    extra,
  }
}

/**
 * 采集入口：校验应用 → 归一化 → 队列（启用时）或同步写库。
 * 采集接口无用户态鉴权，靠 appId 白名单 + 批量上限 + 字段截断兜底。
 */
export function ingest(payload: CollectPayload): CollectResult {
  const app = getAppCached(payload.appId)
  if (!app || app.operatingState !== 1)
    return { accepted: 0, dropped: payload.logs?.length ?? 0, queued: false, logId: '' }

  const logId = payload.logId || `${app.appId}-${Date.now()}-${randomUUID().slice(0, 8)}`
  const logs = (payload.logs ?? []).slice(0, MAX_BATCH_SIZE)
  const rows = logs
    .filter(log => log && typeof log.rangeType === 'string' && log.rangeType)
    .map((log, index) => normalize(payload, log, index, logId))

  if (!rows.length)
    return { accepted: 0, dropped: 0, queued: false, logId }

  const db = getDb()
  const useQueue = app.props.enableQueue !== false
  let accepted = 0
  let dropped = 0

  if (useQueue) {
    const queue = findQueue(app.appId) ?? getQueue(app.appId, db, {
      maxSize: app.props.maxSize,
      batchSize: app.props.batchSize,
      flushInterval: app.props.flushInterval,
      retryAttempts: app.props.retryAttempts,
      retryDelay: app.props.retryDelay,
    })
    for (const row of rows) {
      if (queue.enqueue(row))
        accepted++
      else
        dropped++
    }
  }
  else {
    for (const row of rows) {
      try {
        insertLog(db, row)
        accepted++
      }
      catch (error) {
        dropped++
        console.error('[monitor] 同步写库失败', error)
      }
    }
  }

  return { accepted, dropped, queued: useQueue, logId }
}

/** 供测试与健康检查使用：立即把队列刷入数据库 */
export async function flushAll(): Promise<void> {
  const { allQueues } = await import('./queue')
  await Promise.all(allQueues().map(queue => queue.flush()))
}