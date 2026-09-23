export interface MonitorRequestConfig {
  url: string
  method?: 'GET' | 'POST'
  data?: unknown
  params?: Record<string, unknown>
  signal?: AbortSignal
}

export interface MonitorResult<T> {
  code: number
  message: string
  data: T
}

export type MonitorRequester = <T>(config: MonitorRequestConfig) => Promise<MonitorResult<T>>

let requester: MonitorRequester | undefined

/** 由宿主注入请求实现（zealous-admin 中接 packages/layout 的 http），保证鉴权与错误处理统一 */
export function configureMonitorClient(requester_: MonitorRequester): void {
  requester = requester_
}

export async function monitorRequest<T>(config: MonitorRequestConfig): Promise<T> {
  if (!requester)
    throw new Error('监控客户端未初始化，请先调用 configureMonitorClient')
  const result = await requester<T>(config)
  if (result.code !== 200)
    throw new Error(result.message || '监控请求失败')
  return result.data
}