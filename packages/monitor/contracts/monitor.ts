/** 埋点分类 */
export type MonitorRangeType
  = | 'WINDOW_ERROR'
    | 'PROMISE_ERROR'
    | 'API'
    | 'PERFORMANCE'
    | 'RESOURCE_PER'
    | 'USER_CLICK'
    | 'USER_ROUTE'
    | 'PROACTIVE_REPORTING'

export type MonitorLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

export type MonitorAppType = 'realTimeLog' | 'operationLog'

export type AlertChannelKind = 'realtime' | 'agg'

export interface AlertRuleBody {
  enabled?: boolean
  windowMinutes?: number
  minCount?: number
  minDurationMs?: number
  avgMs?: number
  maxMs?: number
  paramsPrefix?: string | null
}

export interface AlertRule {
  id: string
  realtime?: AlertRuleBody | null
  agg?: AlertRuleBody | null
}

export interface AlertNotifyChannel {
  type: 'webhook' | 'feishu'
  enabled?: boolean
  url: string
  secret?: string | null
  templateId?: 'TEXT_CARD' | 'MARKDOWN' | null
}

export interface AlertConfig {
  enabled: boolean
  cooldownMinutes: number | null
  channels: AlertNotifyChannel[] | null
  rules: AlertRule[] | null
}

export interface QueueConfig {
  maxSize?: number
  batchSize?: number
  flushInterval?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface MonitorAppProps extends QueueConfig {
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
  operatingState: number
  props: MonitorAppProps
  createTime: string | null
  updateTime: string | null
}

/** 单条日志 */
export interface MonitorLog {
  id: number
  appId: string
  logId: string
  serial: number
  happenTime: number
  type: MonitorLogLevel
  rangeType: MonitorRangeType | string
  params: string | null
  title: string | null
  content: string | null
  nickname: string | null
  uid: string | null
  page: string | null
  url: string | null
  method: string | null
  status: number | null
  duration: number | null
  requestId: string | null
  extra?: Record<string, unknown>
  createTime: string | null
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

export interface PageResult<T> {
  pageNum: number
  pageSize: number
  totalPage: number
  total: number
  list: T[]
}

export interface StatsQuery {
  appId: string
  startTime: number
  endTime: number
  source?: string
  granularity?: 'hour' | 'day'
  slowMs?: number
}

export interface MonitorMeta {
  rangeTypes: Array<{ value: string, label: string }>
  logLevels: Array<{ value: string, label: string }>
  perfStages: Array<{ value: string, label: string }>
  logTimeTypes: Array<{ value: number | '', label: string }>
  statsTimeTypes: Array<{ value: number | '', label: string }>
  alertTypes: Array<{ value: string, label: string }>
  alertRules: AlertRuleMeta[]
  alertFieldTips: Record<string, string>
  maxWindowMs: number
  logRetentionDays: number
}

export interface AlertRuleMeta {
  id: string
  label: string
  desc: string
  channel: AlertChannelKind
  alertType: string
  fields: string[]
  defaults: Record<string, unknown>
}

export interface StageStat {
  avg: number | null
  p95: number | null
  max: number | null
  min: number | null
}

export interface WorkbenchStats {
  window: { day: string, startTime: number, endTime: number }
  truncated: boolean
  overall: {
    pv: number
    uv: number
    clicks: number
    jsError: { count: number, rate: number, users: number, userPct: number }
  }
  yesterday: WorkbenchStats['overall'] | null
  trend: Array<{ bucket: string, pv: number, uv: number, errCount: number }>
  topPages: Array<{ page: string, pv: number, uv: number }>
  topErrors: Array<{ title: string, count: number, users: number }>
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

export interface BehaviorStats {
  truncated: boolean
  longWindow: boolean
  overall: { pv: number, uv: number | null, clicks: number, paths: number }
  trend: Array<{ day: string, pv: number, uv: number | null }>
  topClicks: Array<{ label: string, count: number, pages: string[] }>
  pageviews: Array<{ page: string, pv: number, uv: number | null }>
  topPaths: Array<{ from: string, to: string, count: number }>
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

export interface ChannelResult {
  type: string
  ok: boolean
  status?: number
  error?: string
  at: number
}

export interface AlertHistoryRecord {
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
  channels: ChannelResult[]
  cooldownHit: number
  retryCount: number
  lastRetryTime: string | null
  createTime: string | null
}

export interface AlertHistoryQuery {
  appId: string
  startTime: number
  endTime: number
  alertType?: string
  channel?: 'webhook' | 'feishu'
  ok?: '0' | '1'
  pageNum?: number
  pageSize?: number
}

export interface QueueStats {
  totalEnqueued: number
  totalDequeued: number
  totalProcessed: number
  totalFailed: number
  totalQueued: number
  retryQueueSize: number
  queueSizes: { high: number, normal: number, low: number }
}

export interface CollectResult {
  accepted: number
  dropped: number
  queued: boolean
  logId: string
}