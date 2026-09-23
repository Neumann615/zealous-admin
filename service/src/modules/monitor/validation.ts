import { z } from 'zod'

const logLevelSchema = z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG'])

/** 单条上报日志 */
export const collectLogSchema = z.object({
  logId: z.string().max(128).optional(),
  serial: z.number().int().min(0).max(100_000).optional(),
  happenTime: z.number().int().positive().optional(),
  type: logLevelSchema.optional(),
  rangeType: z.string().min(1).max(48),
  params: z.string().max(500).optional().nullable(),
  title: z.string().max(500).optional().nullable(),
  content: z.string().max(20_000).optional().nullable(),
  nickname: z.string().max(128).optional().nullable(),
  uid: z.string().max(128).optional().nullable(),
  page: z.string().max(512).optional().nullable(),
  url: z.string().max(500).optional().nullable(),
  method: z.string().max(16).optional().nullable(),
  status: z.number().int().min(-1).max(999).optional().nullable(),
  duration: z.number().min(0).max(3_600_000).optional().nullable(),
  requestId: z.string().max(128).optional().nullable(),
  extra: z.record(z.unknown()).optional().nullable(),
})

/** 采集入口：批量上报 */
export const collectSchema = z.object({
  appId: z.string().min(1).max(64),
  logId: z.string().max(128).optional(),
  uid: z.string().max(128).optional(),
  nickname: z.string().max(128).optional(),
  page: z.string().max(512).optional(),
  logs: z.array(collectLogSchema).min(1).max(100),
})

/** 实时日志 / 操作日志检索 */
export const logQuerySchema = z.object({
  appId: z.string().min(1),
  startTime: z.coerce.number().int(),
  endTime: z.coerce.number().int(),
  nickname: z.string().max(128).optional(),
  params: z.string().max(500).optional(),
  type: z.string().max(16).optional(),
  logId: z.string().max(128).optional(),
  title: z.string().max(500).optional(),
  content: z.string().max(2_000).optional(),
  rangeType: z.string().max(48).optional(),
  pageNum: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(5_000).default(100),
})

/** 统计分析通用查询 */
export const statsQuerySchema = z.object({
  appId: z.string().min(1),
  startTime: z.coerce.number().int(),
  endTime: z.coerce.number().int(),
  source: z.string().max(128).optional(),
  granularity: z.enum(['hour', 'day']).optional(),
  slowMs: z.coerce.number().int().min(0).max(600_000).optional(),
})

/** 工作台只按应用维度取今日数据 */
export const workbenchQuerySchema = z.object({
  appId: z.string().min(1),
})

const alertRuleBodySchema = z.object({
  enabled: z.boolean().optional(),
  windowMinutes: z.number().int().min(1).max(1_440).optional(),
  minCount: z.number().int().min(1).max(1_000_000).optional(),
  minDurationMs: z.number().int().min(0).max(600_000).optional(),
  avgMs: z.number().int().min(0).max(3_600_000).optional(),
  maxMs: z.number().int().min(0).max(3_600_000).optional(),
  paramsPrefix: z.string().max(128).optional().nullable(),
})

export const alertRuleSchema = z.object({
  id: z.string().min(1).max(48),
  realtime: alertRuleBodySchema.optional().nullable(),
  agg: alertRuleBodySchema.optional().nullable(),
})

export const alertChannelSchema = z.object({
  type: z.enum(['webhook', 'feishu']),
  enabled: z.boolean().optional().default(true),
  url: z.string().url().max(500),
  secret: z.string().max(200).optional().nullable(),
  templateId: z.enum(['TEXT_CARD', 'MARKDOWN']).optional().nullable(),
})

export const alertConfigSchema = z.object({
  enabled: z.boolean(),
  cooldownMinutes: z.number().int().min(0).max(10_080).nullable().optional(),
  channels: z.array(alertChannelSchema).max(10).nullable().optional(),
  rules: z.array(alertRuleSchema).max(50).nullable().optional(),
}).nullable()

export const appPropsSchema = z.object({
  enableQueue: z.boolean().optional(),
  maxSize: z.number().int().min(1).max(1_000_000).optional(),
  batchSize: z.number().int().min(1).max(10_000).optional(),
  flushInterval: z.number().int().min(100).max(600_000).optional(),
  retryAttempts: z.number().int().min(0).max(10).optional(),
  retryDelay: z.number().int().min(100).max(60_000).optional(),
  consume: z.object({ enabled: z.boolean() }).optional(),
  alert: alertConfigSchema.optional(),
})

export const appCreateSchema = z.object({
  appId: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-_]*$/i, 'appId 仅允许字母、数字、中划线与下划线'),
  appName: z.string().min(1).max(64),
  type: z.enum(['realTimeLog', 'operationLog']).default('realTimeLog'),
  content: z.string().max(500).optional().nullable(),
  operatingState: z.number().int().min(0).max(1).default(1),
  props: appPropsSchema.optional(),
})

export const appUpdateSchema = z.object({
  appId: z.string().min(1).max(64),
  appName: z.string().min(1).max(64).optional(),
  type: z.enum(['realTimeLog', 'operationLog']).optional(),
  content: z.string().max(500).optional().nullable(),
  operatingState: z.number().int().min(0).max(1).optional(),
  props: appPropsSchema.optional(),
})

export const appIdParamSchema = z.object({
  appId: z.string().min(1).max(64),
})

export const alertHistoryQuerySchema = z.object({
  appId: z.string().min(1),
  startTime: z.coerce.number().int(),
  endTime: z.coerce.number().int(),
  alertType: z.string().max(48).optional(),
  channel: z.enum(['webhook', 'feishu']).optional(),
  /** 1=全部成功，0=存在失败 */
  ok: z.enum(['0', '1']).optional(),
  pageNum: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
})

export const alertRetrySchema = z.object({
  id: z.number().int().positive(),
})

export const appListQuerySchema = z.object({
  keyword: z.string().max(128).optional(),
})