import type { DatabaseSync } from 'node:sqlite'
import type { MonitorLogInput, MonitorQueueStats, QueueConfig } from './schema'
import { DEFAULT_QUEUE_CONFIG } from './constants'

/** 队列内待落库的日志（已完成 appId 归属与字段归一） */
export interface QueuedLog extends Omit<MonitorLogInput, 'type' | 'rangeType'> {
  appId: string
  happenTime: number
  rangeType: string
  type: string
}

type Priority = 'high' | 'normal' | 'low'

const HIGH_RANGE_TYPES = new Set(['WINDOW_ERROR', 'PROMISE_ERROR'])
const LOW_RANGE_TYPES = new Set(['USER_CLICK', 'USER_ROUTE', 'RESOURCE_PER'])

function resolvePriority(log: QueuedLog): Priority {
  if (log.type === 'ERROR' || HIGH_RANGE_TYPES.has(log.rangeType))
    return 'high'
  if (LOW_RANGE_TYPES.has(log.rangeType))
    return 'low'
  return 'normal'
}

const INSERT_SQL = `
  INSERT INTO za_monitor_log (
    app_id, log_id, serial, happen_time, type, range_type, params, title, content,
    nickname, uid, page, url, method, status, duration, request_id, extra, create_time
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function timestamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 落库一条日志（同步写库路径与批量路径共用） */
export function insertLog(db: DatabaseSync, log: QueuedLog): void {
  db.prepare(INSERT_SQL).run(
    log.appId,
    log.logId ?? '',
    log.serial ?? 0,
    log.happenTime,
    log.type ?? 'INFO',
    log.rangeType,
    log.params ?? null,
    log.title ?? null,
    log.content ?? null,
    log.nickname ?? null,
    log.uid ?? null,
    log.page ?? null,
    log.url ?? null,
    log.method ?? null,
    log.status ?? null,
    log.duration ?? null,
    log.requestId ?? null,
    log.extra ? JSON.stringify(log.extra) : null,
    timestamp(),
  )
}

/**
 * 单应用日志队列：三级优先级 + 批量落库 + 失败重试。
 * 关闭队列（enableQueue=false）时由 collector 走同步写库，不经过此处。
 */
export class MonitorLogQueue {
  private readonly buckets: Record<Priority, QueuedLog[]> = { high: [], normal: [], low: [] }

  private readonly retryBucket: Array<{ log: QueuedLog, attempts: number }> = []

  private config: QueueConfig = { ...DEFAULT_QUEUE_CONFIG }

  private timer: NodeJS.Timeout | null = null

  private flushing = false

  private stats = {
    totalEnqueued: 0,
    totalDequeued: 0,
    totalProcessed: 0,
    totalFailed: 0,
    totalDropped: 0,
  }

  constructor(
    private readonly appId: string,
    private readonly db: DatabaseSync,
    config?: Partial<QueueConfig>,
  ) {
    this.setConfig(config)
  }

  setConfig(config?: Partial<QueueConfig>): void {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config }
    this.restart()
  }

  getConfig(): QueueConfig {
    return { ...this.config }
  }

  get appId_(): string {
    return this.appId
  }

  enqueue(log: QueuedLog): boolean {
    const priority = resolvePriority(log)
    const total = this.size()
    if (total >= this.config.maxSize) {
      // 溢出保护：优先丢低优先级最旧的一条，保证 ERROR 类日志不丢
      const dropped = this.dropOldestLowest(priority)
      if (!dropped) {
        this.stats.totalDropped++
        return false
      }
    }
    this.buckets[priority].push(log)
    this.stats.totalEnqueued++
    return true
  }

  size(): number {
    return this.buckets.high.length + this.buckets.normal.length + this.buckets.low.length
  }

  getStats(): MonitorQueueStats {
    return {
      totalEnqueued: this.stats.totalEnqueued,
      totalDequeued: this.stats.totalDequeued,
      totalProcessed: this.stats.totalProcessed,
      totalFailed: this.stats.totalFailed,
      totalQueued: this.size(),
      retryQueueSize: this.retryBucket.length,
      queueSizes: {
        high: this.buckets.high.length,
        normal: this.buckets.normal.length,
        low: this.buckets.low.length,
      },
    }
  }

  start(): void {
    if (this.timer)
      return
    this.timer = setInterval(() => {
      this.flush().catch(() => {})
    }, this.config.flushInterval)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /** 立即落库一批，返回本批处理条数 */
  async flush(): Promise<number> {
    if (this.flushing)
      return 0
    this.flushing = true
    try {
      const batch = this.takeBatch()
      if (!batch.length)
        return 0
      this.persist(batch)
      return batch.length
    }
    finally {
      this.flushing = false
    }
  }

  /** 进程退出前兜底：把剩余日志全部同步落库 */
  drain(): void {
    this.stop()
    const rest: QueuedLog[] = [...this.buckets.high, ...this.buckets.normal, ...this.buckets.low]
    this.buckets.high = []
    this.buckets.normal = []
    this.buckets.low = []
    this.stats.totalDequeued += rest.length
    if (rest.length)
      this.persist(rest)
  }

  private restart(): void {
    this.stop()
    this.start()
  }

  private takeBatch(): QueuedLog[] {
    const batch: QueuedLog[] = []
    const limit = this.config.batchSize
    for (const priority of ['high', 'normal', 'low'] as Priority[]) {
      while (batch.length < limit && this.buckets[priority].length) {
        const log = this.buckets[priority].shift()
        if (log) {
          batch.push(log)
          this.stats.totalDequeued++
        }
      }
      if (batch.length >= limit)
        break
    }
    return batch
  }

  private persist(batch: QueuedLog[]): void {
    try {
      this.db.exec('BEGIN')
      for (const log of batch)
        insertLog(this.db, log)
      this.db.exec('COMMIT')
      this.stats.totalProcessed += batch.length
    }
    catch (error) {
      try {
        this.db.exec('ROLLBACK')
      }
      catch { /* ignore */ }
      this.stats.totalFailed += batch.length
      for (const log of batch) {
        if (this.retryBucket.length >= this.config.maxSize)
          break
        this.retryBucket.push({ log, attempts: 0 })
      }
      console.error(`[monitor] 批量落库失败 appId=${this.appId}`, error)
      this.scheduleRetry()
    }
  }

  private scheduleRetry(): void {
    if (!this.retryBucket.length)
      return
    const delay = Math.max(this.config.retryDelay, 100)
    const timer = setTimeout(() => {
      const pending = this.retryBucket.splice(0, this.config.batchSize)
      const stillFailed: Array<{ log: QueuedLog, attempts: number }> = []
      for (const item of pending) {
        try {
          insertLog(this.db, item.log)
          this.stats.totalProcessed++
          this.stats.totalFailed = Math.max(0, this.stats.totalFailed - 1)
        }
        catch {
          if (item.attempts + 1 < this.config.retryAttempts)
            stillFailed.push({ log: item.log, attempts: item.attempts + 1 })
        }
      }
      this.retryBucket.unshift(...stillFailed)
      if (this.retryBucket.length)
        this.scheduleRetry()
    }, delay)
    timer.unref?.()
  }

  private dropOldestLowest(incoming: Priority): boolean {
    const order: Priority[] = incoming === 'low'
      ? ['low', 'normal']
      : ['low', 'normal', 'high']
    for (const priority of order) {
      if (this.buckets[priority].length) {
        this.buckets[priority].shift()
        this.stats.totalDropped++
        return true
      }
    }
    return false
  }
}

/** 进程级队列注册表：appId -> 队列实例 */
const queues = new Map<string, MonitorLogQueue>()

export function getQueue(appId: string, db: DatabaseSync, config?: Partial<QueueConfig>): MonitorLogQueue {
  let queue = queues.get(appId)
  if (!queue) {
    queue = new MonitorLogQueue(appId, db, config)
    queue.start()
    queues.set(appId, queue)
  }
  else if (config) {
    queue.setConfig(config)
  }
  return queue
}

export function findQueue(appId: string): MonitorLogQueue | undefined {
  return queues.get(appId)
}

export function allQueues(): MonitorLogQueue[] {
  return [...queues.values()]
}

export function removeQueue(appId: string): void {
  const queue = queues.get(appId)
  if (queue) {
    queue.drain()
    queues.delete(appId)
  }
}