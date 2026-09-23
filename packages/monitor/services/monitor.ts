import type {
  AlertHistoryQuery,
  AlertHistoryRecord,
  ApiStats,
  BehaviorStats,
  CollectResult,
  ErrorStats,
  LogQuery,
  MonitorApp,
  MonitorAppProps,
  MonitorAppType,
  MonitorLog,
  MonitorMeta,
  PageResult,
  PerfStats,
  QueueStats,
  StatsQuery,
  WorkbenchStats,
} from '../contracts/monitor'
import { monitorRequest } from '../runtime/client'

/** 字典与规则目录（前端已内置同名字典，此接口用于校验前后端一致性） */
export function getMonitorMetaAPI() {
  return monitorRequest<MonitorMeta>({ url: '/monitor/meta' })
}

export function getMonitorAppsAPI(params?: { keyword?: string }) {
  return monitorRequest<MonitorApp[]>({ url: '/monitor/apps', params: { ...params } })
}

export interface MonitorAppSaveRequest {
  appId: string
  appName?: string
  type?: MonitorAppType
  content?: string | null
  operatingState?: number
  props?: MonitorAppProps
}

export function createMonitorAppAPI(data: MonitorAppSaveRequest) {
  return monitorRequest<MonitorApp>({ url: '/monitor/apps/create', method: 'POST', data })
}

export function updateMonitorAppAPI(data: MonitorAppSaveRequest) {
  return monitorRequest<MonitorApp>({ url: '/monitor/apps/update', method: 'POST', data })
}

export function getQueueStatsAPI(appId: string) {
  return monitorRequest<QueueStats>({ url: `/monitor/apps/${encodeURIComponent(appId)}/queue-stats` })
}

export function startQueueAPI(appId: string) {
  return monitorRequest<null>({ url: `/monitor/apps/${encodeURIComponent(appId)}/queue/start`, method: 'POST', data: {} })
}

export function stopQueueAPI(appId: string) {
  return monitorRequest<null>({ url: `/monitor/apps/${encodeURIComponent(appId)}/queue/stop`, method: 'POST', data: {} })
}

export function queryMonitorLogsAPI(params: LogQuery, signal?: AbortSignal) {
  return monitorRequest<PageResult<MonitorLog>>({ url: '/monitor/logs', params: { ...params }, signal })
}

export function getWorkbenchStatsAPI(appId: string, signal?: AbortSignal) {
  return monitorRequest<WorkbenchStats>({ url: '/monitor/stats/workbench', params: { appId }, signal })
}

export function getPerfStatsAPI(params: StatsQuery, signal?: AbortSignal) {
  return monitorRequest<PerfStats>({ url: '/monitor/stats/perf', params: { ...params }, signal })
}

export function getApiStatsAPI(params: StatsQuery, signal?: AbortSignal) {
  return monitorRequest<ApiStats>({ url: '/monitor/stats/api', params: { ...params }, signal })
}

export function getBehaviorStatsAPI(params: StatsQuery, signal?: AbortSignal) {
  return monitorRequest<BehaviorStats>({ url: '/monitor/stats/behavior', params: { ...params }, signal })
}

export function getErrorStatsAPI(params: StatsQuery, signal?: AbortSignal) {
  return monitorRequest<ErrorStats>({ url: '/monitor/stats/error', params: { ...params }, signal })
}

export function getBizErrorStatsAPI(params: StatsQuery, signal?: AbortSignal) {
  return monitorRequest<ErrorStats>({ url: '/monitor/stats/biz-error', params: { ...params }, signal })
}

export function getAlertHistoryAPI(params: AlertHistoryQuery, signal?: AbortSignal) {
  return monitorRequest<PageResult<AlertHistoryRecord>>({ url: '/monitor/alerts/history', params: { ...params }, signal })
}

export function retryAlertAPI(id: number) {
  return monitorRequest<AlertHistoryRecord>({ url: '/monitor/alerts/retry', method: 'POST', data: { id } })
}

/** 采集入口为公开接口，SDK 直接 fetch；此处仅供后台内自测与「发送测试日志」使用 */
export function collectLogsAPI(reportUrl: string, payload: { appId: string, logs: Array<Record<string, unknown>> }) {
  return fetch(reportUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(response => response.json()) as Promise<{ code: number, message: string, data: CollectResult }>
}