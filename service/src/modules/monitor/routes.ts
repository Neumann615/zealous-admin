import { Router } from 'express'
import { success } from '../../lib/response'
import { authMiddleware } from '../../middleware/auth'
import { asyncHandler } from '../../middleware/error'
import { validate } from '../../middleware/validate'
import {
  getApiStats,
  getBehaviorStats,
  getErrorStats,
  getPerfStats,
  getWorkbenchStats,
} from './aggregate'
import { listAlertHistory, retryAlert } from './alert'
import { evaluateRealtime } from './alert'
import { ingest } from './collector'
import {
  ALERT_FIELD_TIPS,
  ALERT_RULE_CATALOG,
  ALERT_TYPE_OPTIONS,
  LOG_LEVEL_OPTIONS,
  LOG_TIME_TYPE_OPTIONS,
  MAX_QUERY_WINDOW_MS,
  PERF_STAGE_OPTIONS,
  RANGE_TYPE_OPTIONS,
  STATS_TIME_TYPE_OPTIONS,
} from './constants'
import { BadRequestError } from '../../lib/errors'
import { getDb } from '../../db'
import { findQueue, getQueue, removeQueue } from './queue'
import {
  createApp,
  getAppOrThrow,
  listApps,
  pruneLogs,
  queryLogs,
  updateApp,
} from './service'
import {
  alertHistoryQuerySchema,
  alertRetrySchema,
  appCreateSchema,
  appIdParamSchema,
  appListQuerySchema,
  appUpdateSchema,
  collectSchema,
  logQuerySchema,
  statsQuerySchema,
  workbenchQuerySchema,
} from './validation'
import { LOG_RETENTION_DAYS } from './constants'

const router = Router()

function assertWindow(startTime: number, endTime: number): void {
  if (endTime <= startTime)
    throw new BadRequestError('结束时间必须大于开始时间')
  if (endTime - startTime > MAX_QUERY_WINDOW_MS)
    throw new BadRequestError('查询窗口超过上限 30 天')
}

/** 采集入口：无用户态鉴权（SDK 运行在浏览器），靠 appId 白名单 + 批量上限兜底 */
router.post('/collect', validate(collectSchema), asyncHandler(async (req, res) => {
  const result = ingest(req.body)
  if (result.accepted > 0)
    evaluateRealtime(req.body.appId).catch(() => {})
  res.json(success(result))
}))

router.use(authMiddleware)

/** 字典与规则目录：前端渲染筛选项与预警配置表单的唯一来源 */
router.get('/meta', asyncHandler(async (_req, res) => {
  res.json(success({
    rangeTypes: RANGE_TYPE_OPTIONS,
    logLevels: LOG_LEVEL_OPTIONS,
    perfStages: PERF_STAGE_OPTIONS,
    logTimeTypes: LOG_TIME_TYPE_OPTIONS,
    statsTimeTypes: STATS_TIME_TYPE_OPTIONS,
    alertTypes: ALERT_TYPE_OPTIONS,
    alertRules: ALERT_RULE_CATALOG,
    alertFieldTips: ALERT_FIELD_TIPS,
    maxWindowMs: MAX_QUERY_WINDOW_MS,
    logRetentionDays: LOG_RETENTION_DAYS,
  }))
}))

router.get('/apps', validate(appListQuerySchema, 'query'), asyncHandler(async (req, res) => {
  res.json(success(listApps(req.query.keyword)))
}))

router.post('/apps/create', validate(appCreateSchema), asyncHandler(async (req, res) => {
  res.json(success(createApp(req.body), '创建成功'))
}))

router.post('/apps/update', validate(appUpdateSchema), asyncHandler(async (req, res) => {
  const { appId, ...patch } = req.body
  res.json(success(updateApp(appId, patch), '保存成功'))
}))

router.get('/apps/:appId', validate(appIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  res.json(success(getAppOrThrow(req.params.appId)))
}))

router.get('/apps/:appId/queue-stats', validate(appIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  const app = getAppOrThrow(req.params.appId)
  const queue = findQueue(app.appId)
  res.json(success(queue
    ? queue.getStats()
    : {
        totalEnqueued: 0,
        totalDequeued: 0,
        totalProcessed: 0,
        totalFailed: 0,
        totalQueued: 0,
        retryQueueSize: 0,
        queueSizes: { high: 0, normal: 0, low: 0 },
      }))
}))

router.post('/apps/:appId/queue/start', validate(appIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  const app = getAppOrThrow(req.params.appId)
  updateApp(app.appId, { props: { ...app.props, enableQueue: true } })
  getQueue(app.appId, getDb(), app.props)
  res.json(success(null, '队列已启动'))
}))

router.post('/apps/:appId/queue/stop', validate(appIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  const app = getAppOrThrow(req.params.appId)
  const queue = findQueue(app.appId)
  queue?.drain()
  updateApp(app.appId, { props: { ...app.props, enableQueue: false } })
  removeQueue(app.appId)
  res.json(success(null, '队列已停止，后续上报改为同步写库'))
}))

router.get('/logs', validate(logQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const query = req.query as any
  assertWindow(query.startTime, query.endTime)
  res.json(success(queryLogs(query)))
}))

router.get('/stats/workbench', validate(workbenchQuerySchema, 'query'), asyncHandler(async (req, res) => {
  res.json(success(getWorkbenchStats(req.query.appId)))
}))

router.get('/stats/perf', validate(statsQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { appId, startTime, endTime } = req.query as any
  assertWindow(startTime, endTime)
  res.json(success(getPerfStats(appId, startTime, endTime)))
}))

router.get('/stats/api', validate(statsQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { appId, startTime, endTime, source, slowMs } = req.query as any
  assertWindow(startTime, endTime)
  res.json(success(getApiStats(appId, startTime, endTime, source, slowMs)))
}))

router.get('/stats/behavior', validate(statsQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { appId, startTime, endTime, source } = req.query as any
  assertWindow(startTime, endTime)
  res.json(success(getBehaviorStats(appId, startTime, endTime, source)))
}))

router.get('/stats/error', validate(statsQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { appId, startTime, endTime, source, granularity } = req.query as any
  assertWindow(startTime, endTime)
  res.json(success(getErrorStats(appId, startTime, endTime, 'js', granularity, source)))
}))

router.get('/stats/biz-error', validate(statsQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { appId, startTime, endTime, source, granularity } = req.query as any
  assertWindow(startTime, endTime)
  res.json(success(getErrorStats(appId, startTime, endTime, 'biz', granularity, source)))
}))

router.get('/alerts/history', validate(alertHistoryQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const query = req.query as any
  assertWindow(query.startTime, query.endTime)
  res.json(success(listAlertHistory(query)))
}))

router.post('/alerts/retry', validate(alertRetrySchema), asyncHandler(async (req, res) => {
  res.json(success(await retryAlert(req.body.id), '重发成功'))
}))

/** 运维接口：立即执行一次保留期清理 */
router.post('/maintenance/prune', asyncHandler(async (_req, res) => {
  res.json(success({ removed: pruneLogs(LOG_RETENTION_DAYS) }, '清理完成'))
}))

export default router