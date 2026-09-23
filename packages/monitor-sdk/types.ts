/** 埋点分类，与后端 za_monitor_log.range_type 一一对应 */
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

/** 采集器开关名 */
export type CollectorName
  = | 'error'
    | 'promise'
    | 'api'
    | 'performance'
    | 'resource'
    | 'click'
    | 'route'

/** 单条埋点日志 */
export interface MonitorLog {
  rangeType: MonitorRangeType
  type?: MonitorLogLevel
  happenTime?: number
  params?: string
  title?: string
  content?: string
  page?: string
  url?: string
  method?: string
  status?: number
  duration?: number
  requestId?: string
  nickname?: string
  uid?: string
  extra?: Record<string, unknown>
}

/** 业务主动上报入参 */
export interface ReportInput {
  /** 操作名，作为聚合维度（错误分析按 title 归并） */
  title: string
  /** 失败时为 ERROR，部分失败为 WARN，成功为 INFO */
  type?: MonitorLogLevel
  content?: string
  params?: string
  page?: string
  extra?: Record<string, unknown>
}

export interface MonitorUser {
  nickname?: string
  uid?: string
}

export interface MonitorOptions {
  /** 应用标识，需与后台「应用管理」中的 appId 一致 */
  appId: string
  /** 采集入口，形如 http://localhost:3508/monitor/collect */
  reportUrl: string
  /** 来源系统关键字，写入 params 首词，用于统计页「来源系统」筛选 */
  source?: string
  /** 采样率 0~1，默认 1（全量） */
  sampleRate?: number
  /** 缓冲达到该条数立即上报，默认 10 */
  batchSize?: number
  /** 缓冲达到该时长立即上报（ms），默认 5000 */
  flushInterval?: number
  /** 缓冲区上限，超出丢弃最旧日志，默认 200 */
  maxBuffer?: number
  /** 忽略的接口地址（子串或正则），默认过滤本 SDK 的上报请求 */
  ignoreUrls?: Array<string | RegExp>
  /** 需要关闭的采集器 */
  disabled?: CollectorName[]
  /** 同一异常在该时间窗内只上报一次（ms），默认 1000 */
  errorThrottleMs?: number
  /** 公共字段，合并进每条日志的 extra */
  commonExtra?: Record<string, unknown>
  /** 是否监听页面卸载做兜底上报，默认 true */
  sendBeaconOnHide?: boolean
}

export interface MonitorClient {
  report: (input: ReportInput) => void
  captureError: (error: unknown, context?: Record<string, unknown>) => void
  setUser: (user: MonitorUser) => void
  setCommonExtra: (extra: Record<string, unknown>) => void
  setSource: (source: string) => void
  flush: () => void
  destroy: () => void
  getOptions: () => Readonly<MonitorOptions>
}

declare global {
  interface Window {
    __ZA_MONITOR__?: MonitorClient
  }
}