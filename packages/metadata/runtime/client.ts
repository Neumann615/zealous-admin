export interface MetadataRequestConfig {
  url: string
  method?: 'GET' | 'POST'
  data?: unknown
  params?: Record<string, unknown>
  signal?: AbortSignal
}

export interface MetadataResult<T> {
  code: number
  message: string
  data: T
}

export type MetadataRequester = <T>(config: MetadataRequestConfig) => Promise<MetadataResult<T>>

let requester: MetadataRequester | undefined

export function configureMetadataClient(requester_: MetadataRequester): void {
  requester = requester_
}

export async function metadataRequest<T>(config: MetadataRequestConfig): Promise<T> {
  if (!requester)
    throw new Error('元数据客户端未初始化，请先调用 configureMetadataClient')
  const result = await requester<T>(config)
  if (result.code !== 200)
    throw new Error(result.message || '元数据请求失败')
  return result.data
}
