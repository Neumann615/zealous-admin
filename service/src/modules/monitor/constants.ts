import type { AlertChannelKind, MonitorLogLevel, MonitorRangeType } from './schema'

/** 埋点分类字典 */
export const RANGE_TYPE_OPTIONS: Array<{ value: MonitorRangeType, label: string }> = [
  { value: 'WINDOW_ERROR', label: '脚本异常' },
  { value: 'PROMISE_ERROR', label: 'Promise 未处理拒绝' },
  { value: 'API', label: '接口请求/返回/报错' },
  { value: 'PERFORMANCE', label: '页面性能' },
  { value: 'RESOURCE_PER', label: '资源加载汇总' },
  { value: 'USER_CLICK', label: '用户点击' },
  { value: 'USER_ROUTE', label: '路由变化' },
  { value: 'PROACTIVE_REPORTING', label: '业务主动上报' },
]

/** 日志级别字典 */
export const LOG_LEVEL_OPTIONS: Array<{ value: MonitorLogLevel | '', label: string }> = [
  { value: '', label: '全部' },
  { value: 'INFO', label: 'INFO' },
  { value: 'WARN', label: 'WARN' },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'DEBUG', label: 'DEBUG' },
]

/** 性能阶段（顺序即渲染顺序） */
export const PERF_STAGES = ['dns', 'tcp', 'ttfb', 'download', 'dcl', 'load', 'fp', 'fcp'] as const

export const PERF_STAGE_OPTIONS = [
  { value: 'dns', label: 'DNS查询' },
  { value: 'tcp', label: 'TCP连接' },
  { value: 'ttfb', label: '首字节' },
  { value: 'download', label: '响应下载' },
  { value: 'dcl', label: 'DOM就绪' },
  { value: 'load', label: '完全加载' },
  { value: 'fp', label: '首次绘制' },
  { value: 'fcp', label: '首次内容绘制' },
]

/** 统计页时间快捷档位（毫秒），空字符串表示自定义 */
export const STATS_TIME_TYPE_OPTIONS = [
  { value: 3_600_000, label: '最近1小时' },
  { value: 14_400_000, label: '最近4小时' },
  { value: 28_800_000, label: '最近8小时' },
  { value: 86_400_000, label: '最近24小时' },
  { value: 259_200_000, label: '最近3天' },
  { value: 604_800_000, label: '最近7天' },
  { value: '', label: '自定义' },
]

/** 日志页时间快捷档位（毫秒） */
export const LOG_TIME_TYPE_OPTIONS = [
  { value: 3_600_000, label: '最近1小时' },
  { value: 7_200_000, label: '最近2小时' },
  { value: 28_800_000, label: '最近8小时' },
  { value: 43_200_000, label: '最近12小时' },
  { value: 86_400_000, label: '最近一天' },
  { value: 259_200_000, label: '最近三天' },
  { value: 604_800_000, label: '最近一周' },
  { value: '', label: '自定义' },
]

/** 预警类型字典（预警记录筛选用） */
export const ALERT_TYPE_OPTIONS = [
  { value: 'SLOW_API', label: '慢接口实时预警' },
  { value: 'API_ERROR', label: '接口报错实时预警' },
  { value: 'BIZ_OP_FAILED', label: '业务操作失败实时预警' },
  { value: 'API_AGG', label: '接口聚合巡检' },
  { value: 'WINDOW_ERROR_AGG', label: '脚本异常突增' },
  { value: 'PROMISE_ERROR_AGG', label: 'Promise 异常突增' },
  { value: 'PROACTIVE_AGG', label: '业务失败突增' },
  { value: 'FALLBACK_AGG', label: '未知类目兜底突增' },
]

export interface AlertRuleMeta {
  id: string
  label: string
  desc: string
  channel: AlertChannelKind
  alertType: string
  fields: string[]
  defaults: Record<string, unknown>
}

/** 预警规则目录：字段与默认值对齐前端监控平台既有语义 */
export const ALERT_RULE_CATALOG: AlertRuleMeta[] = [
  {
    id: 'API_SLOW',
    label: '接口慢调用（实时）',
    desc: '实时窗口判定：同一接口窗口内耗时达慢门槛满次数下限即预警',
    channel: 'realtime',
    alertType: 'SLOW_API',
    fields: ['enabled', 'minDurationMs', 'windowMinutes', 'minCount', 'paramsPrefix'],
    defaults: { enabled: true, minDurationMs: 1000, windowMinutes: 5, minCount: 3, paramsPrefix: '' },
  },
  {
    id: 'API_ERROR',
    label: '接口报错（实时）',
    desc: '实时窗口判定：同一接口窗口内报错达次数下限即预警',
    channel: 'realtime',
    alertType: 'API_ERROR',
    fields: ['enabled', 'windowMinutes', 'minCount', 'paramsPrefix'],
    defaults: { enabled: true, windowMinutes: 5, minCount: 3, paramsPrefix: '' },
  },
  {
    id: 'API_AGG',
    label: '接口聚合巡检',
    desc: '窗口聚合巡检：调用次数达到下限，且 avg 或 max 耗时超阈值即预警',
    channel: 'agg',
    alertType: 'API_AGG',
    fields: ['enabled', 'windowMinutes', 'minCount', 'avgMs', 'maxMs'],
    defaults: { enabled: true, windowMinutes: 5, minCount: 5, avgMs: 5000, maxMs: 10000 },
  },
  {
    id: 'WINDOW_ERROR_AGG',
    label: '脚本异常突增（聚合）',
    desc: '窗口聚合巡检：脚本异常次数达到下限即预警',
    channel: 'agg',
    alertType: 'WINDOW_ERROR_AGG',
    fields: ['enabled', 'windowMinutes', 'minCount'],
    defaults: { enabled: true, windowMinutes: 5, minCount: 10 },
  },
  {
    id: 'PROMISE_ERROR_AGG',
    label: 'Promise 异常突增（聚合）',
    desc: '窗口聚合巡检：Promise 异常次数达到下限即预警',
    channel: 'agg',
    alertType: 'PROMISE_ERROR_AGG',
    fields: ['enabled', 'windowMinutes', 'minCount'],
    defaults: { enabled: true, windowMinutes: 5, minCount: 10 },
  },
  {
    id: 'PROACTIVE_RT',
    label: '业务操作失败（实时）',
    desc: '实时窗口判定：同一操作窗口内失败达次数下限即预警',
    channel: 'realtime',
    alertType: 'BIZ_OP_FAILED',
    fields: ['enabled', 'windowMinutes', 'minCount', 'paramsPrefix'],
    defaults: { enabled: true, windowMinutes: 5, minCount: 3, paramsPrefix: '' },
  },
  {
    id: 'PROACTIVE_AGG',
    label: '业务失败突增（聚合）',
    desc: '窗口聚合巡检：业务操作失败次数达到下限即预警',
    channel: 'agg',
    alertType: 'PROACTIVE_AGG',
    fields: ['enabled', 'windowMinutes', 'minCount'],
    defaults: { enabled: true, windowMinutes: 5, minCount: 5 },
  },
  {
    id: 'FALLBACK_AGG',
    label: '未知类目兜底（聚合）',
    desc: '窗口聚合巡检：未匹配已知类目的日志达到次数下限即预警（兜底）',
    channel: 'agg',
    alertType: 'FALLBACK_AGG',
    fields: ['enabled', 'windowMinutes', 'minCount'],
    defaults: { enabled: true, windowMinutes: 5, minCount: 10 },
  },
]

export const ALERT_RULE_MAP = new Map(ALERT_RULE_CATALOG.map(rule => [rule.id, rule]))

/** 预警字段释义 */
export const ALERT_FIELD_TIPS: Record<string, string> = {
  minDurationMs: '单笔接口耗时达到该值（ms）即计入慢调用窗口计数',
  windowMinutes: '统计窗口时长（分钟）：同一维度在窗口内累计判定',
  minCount: '窗口内命中次数达到该值才触发预警',
  avgMs: '窗口内平均耗时阈值（ms），与 max 满足其一即触发',
  maxMs: '窗口内单笔最大耗时阈值（ms），与 avg 满足其一即触发',
  paramsPrefix: '按 params 首词圈定监控来源，留空表示全部来源',
}

/** 默认冷却时间（分钟） */
export const DEFAULT_COOLDOWN_MINUTES = 10

/** 单次聚合查询最多扫描的明细行数，超出则置 truncated 并在 UI 明示 */
export const AGG_SCAN_LIMIT = 50_000

/** 统计查询窗口上限：30 天 */
export const MAX_QUERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/** 窗口超过该值时强制按天粒度，且不提供窗口级 UV 口径 */
export const DAY_GRANULARITY_THRESHOLD_MS = 24 * 60 * 60 * 1000

/** 慢调用统计默认门槛（ms） */
export const DEFAULT_SLOW_MS = 1000

/** 明细日志保留天数 */
export const LOG_RETENTION_DAYS = Number(process.env.MONITOR_LOG_RETENTION_DAYS ?? 7)

/** 预警记录保留天数 */
export const ALERT_RETENTION_DAYS = Number(process.env.MONITOR_ALERT_RETENTION_DAYS ?? 90)

/** 队列默认配置 */
export const DEFAULT_QUEUE_CONFIG = {
  maxSize: 5000,
  batchSize: 50,
  flushInterval: 1000,
  retryAttempts: 2,
  retryDelay: 500,
}