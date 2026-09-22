import type { CommonResult } from '../types/common'

export interface AuthRequestConfig {
  url: string
  method?: 'GET' | 'POST'
  data?: unknown
  params?: Record<string, unknown>
}

export type AuthRequester = <T>(config: AuthRequestConfig) => Promise<CommonResult<T>>

let requester: AuthRequester | undefined

export function configureAuthClient(requester_: AuthRequester): void {
  requester = requester_
}

export async function authRequest<T>(config: AuthRequestConfig): Promise<T> {
  if (!requester)
    throw new Error('Auth client not initialized. Call configureAuthClient first.')
  const result = await requester<T>(config)
  if (result.code !== 200)
    throw new Error(result.message || 'Request failed')
  return result.data
}
