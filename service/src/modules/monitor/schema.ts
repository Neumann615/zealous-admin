import type { DatabaseSync } from 'node:sqlite'
import { now } from '../../lib/date.js'

/** 监控日志类型（埋点分类），与采集 SDK 一一对应 */
export type MonitorRangeType =
  | 'WINDOW_ERROR'
  | 'PROMISE_ERROR'
  | 'API'
  | 'PERFORMANCE'
  | 'RESOURCE_PER'
  | 'USER_CLICK'
  | 'USER_ROUTE'
  | 'PROACTIVE_REPORTING'

/** 日志级别 */
export type MonitorLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

/** 应用类型 */
export type MonitorAppType = 'realTimeLog' | 'operationLog'

/** 预警规则通道：realtime=实时滑窗判定，agg=窗口聚合巡检 */
export type AlertChannelKind = 'realtime' | 'agg'

export interface AlertRuleRealtime {
  enabled: boolean
  minDurationMs?: number
  windowMinutes: number
  minCount: number
  paramsPrefix?: string
}

export interface AlertRuleAgg {
  enabled: boolean
  windowMinutes: number
  minCount: number
  avgMs?: number
  maxMs?: number
}

export interface AlertRule {
  id: string
  realtime?: AlertRuleRealtime
  agg?: AlertRuleAgg
}

export interface AlertNotifyChannel {
  /** webhook=通用 HTTP 回调，feishu=飞书自定义机器人 */
  type: 'webhook' | 'feishu'
  enabled: boolean
  url: string
  /** 飞书自定义机器人签名校验密钥（可选） */
  secret?: string
  templateId?: 'TEXT_CARD' | 'MARKDOWN'
}

export interface AlertConfig {
  enabled: boolean
  /** 同一规则+维度的冷却时间（分钟），null 表示用默认值 */
  cooldownMinutes: number | null
  channels: AlertNotifyChannel[] | null
  rules: AlertRule[] | null
}

export interface QueueConfig {
  maxSize: number
  batchSize: number
  flushInterval: number
  retryAttempts: number
  retryDelay: number
}

export interface MonitorAppProps extends Partial<QueueConfig> {
  enableQueue?: boolean
  consume?: { enabled: boolean }
  alert?: AlertConfig | null
}

export interface MonitorApp {
  id: number
  appId: string
  appName: string
  type: MonitorAppType
  content: string | null
  /** 1=启用，0=停用 */
  operatingState: number
  props: MonitorAppProps
  createTime: string | null
  updateTime: string | null
}

/** 单条上报日志（采集侧结构） */
export interface MonitorLogInput {
  logId?: string
  serial?: number
  happenTime?: number
  type?: MonitorLogLevel
  rangeType: MonitorRangeType
  params?: string
  title?: string
  content?: string
  nickname?: string
  uid?: string
  page?: string
  url?: string
  method?: string
  status?: number
  duration?: number
  requestId?: string
  extra?: Record<string, unknown>
}

/** 落库后的日志行（camelCase） */
export interface MonitorLog extends MonitorLogInput {
  id: number
  appId: string
  logId: string
  serial: number
  happenTime: number
  type: MonitorLogLevel
  createTime: string | null
}

export interface MonitorAlertHistory {
  id: number
  appId: string
  ruleId: string
  alertType: string
  level: string
  title: string
  fields: Record<string, unknown>
  happenTime: number
  startTime: number
  endTime: number
  channels: Array<Record<string, unknown>>
  cooldownHit: number
  retryCount: number
  lastRetryTime: string | null
  createTime: string | null
}

/** 队列运行时指标 */
export interface MonitorQueueStats {
  totalEnqueued: number
  totalDequeued: number
  totalProcessed: number
  totalFailed: number
  totalQueued: number
  retryQueueSize: number
  queueSizes: { high: number, normal: number, low: number }
}

const DEFAULT_APP_SEED = {
  appId: 'zealous-admin',
  appName: 'Zealous Admin',
  type: 'realTimeLog' as const,
  content: 'zealous-admin 自身前端监控（SDK 默认接入）',
}

export function prepareMonitorSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS za_monitor_app (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT NOT NULL UNIQUE,
      app_name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'realTimeLog',
      content TEXT,
      operating_state INTEGER NOT NULL DEFAULT 1,
      props TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_monitor_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT NOT NULL,
      log_id TEXT NOT NULL,
      serial INTEGER NOT NULL DEFAULT 0,
      happen_time INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO',
      range_type TEXT NOT NULL,
      params TEXT,
      title TEXT,
      content TEXT,
      nickname TEXT,
      uid TEXT,
      page TEXT,
      url TEXT,
      method TEXT,
      status INTEGER,
      duration INTEGER,
      request_id TEXT,
      extra TEXT,
      create_time TEXT
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_monitor_log_app_time ON za_monitor_log (app_id, happen_time)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_monitor_log_app_range_time ON za_monitor_log (app_id, range_type, happen_time)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_monitor_log_app_page_time ON za_monitor_log (app_id, page, happen_time)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_monitor_log_batch ON za_monitor_log (app_id, log_id, serial)')

  db.exec(`
    CREATE TABLE IF NOT EXISTS za_monitor_alert_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT NOT NULL,
      rule_id TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'WARN',
      title TEXT NOT NULL,
      fields TEXT,
      happen_time INTEGER NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      channels TEXT,
      cooldown_hit INTEGER NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_retry_time TEXT,
      create_time TEXT
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_monitor_alert_app_time ON za_monitor_alert_history (app_id, happen_time)')

  const timestamp = now()
  db.prepare(`
    INSERT OR IGNORE INTO za_monitor_app (app_id, app_name, type, content, operating_state, props, create_time, update_time)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    DEFAULT_APP_SEED.appId,
    DEFAULT_APP_SEED.appName,
    DEFAULT_APP_SEED.type,
    DEFAULT_APP_SEED.content,
    JSON.stringify({
      enableQueue: true,
      maxSize: 5000,
      batchSize: 50,
      flushInterval: 1000,
      retryAttempts: 2,
      retryDelay: 500,
      consume: { enabled: true },
      alert: null,
    }),
    timestamp,
    timestamp,
  )
}