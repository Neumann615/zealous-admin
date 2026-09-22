import type { NextFunction, Request, RequestHandler, Response } from 'express'
import process from 'node:process'
import { failed } from '../../../lib/response'

const METADATA_API_BASE_URL = process.env.METADATA_API_BASE_URL
const METADATA_API_TOKEN = process.env.METADATA_API_TOKEN
const METADATA_AUTH_HEADER = process.env.METADATA_AUTH_HEADER || 'Authorization'
const METADATA_TIMEOUT_MS = Number(process.env.METADATA_TIMEOUT_MS || 15000)

export const METADATA_BIZ_BASE_PATH = '/ds/biz/ds-biz-dc-metadata'
export const METADATA_INNER_BASE_PATH = '/ds/inner/ds-biz-dc-metadata'

export class MetadataUpstreamError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly upstreamCode?: number,
    public readonly traceId?: string,
  ) {
    super(message)
    this.name = 'MetadataUpstreamError'
  }
}

export function requireMetadataBaseUrl(): string {
  if (!METADATA_API_BASE_URL)
    throw new MetadataUpstreamError(503, '未配置元数据平台地址（METADATA_API_BASE_URL）')
  return METADATA_API_BASE_URL.replace(/\/$/, '')
}

function resolveAuthorization(req: Request): string | undefined {
  const forwarded = req.headers['metadata-authorization']
  if (typeof forwarded === 'string' && forwarded)
    return forwarded

  if (!METADATA_API_TOKEN)
    return undefined
  return METADATA_API_TOKEN.startsWith('Bearer ') ? METADATA_API_TOKEN : `Bearer ${METADATA_API_TOKEN}`
}

function createMetadataHeaders(req: Request, hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (hasBody)
    headers['Content-Type'] = 'application/json'

  const authorization = resolveAuthorization(req)
  if (authorization)
    headers[METADATA_AUTH_HEADER] = authorization
  return headers
}

interface UpstreamResponse<T = unknown> {
  code?: number
  msg?: string
  message?: string
  data?: T
  traceId?: string
}

export async function metadataUpstreamRequest<T = unknown>(
  req: Request,
  path: string,
  init: { method?: 'GET' | 'POST', body?: unknown } = {},
): Promise<T> {
  const method = init.method || 'GET'
  const hasBody = init.body !== undefined
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS)

  try {
    const response = await fetch(`${requireMetadataBaseUrl()}${path}`, {
      method,
      headers: createMetadataHeaders(req, hasBody),
      body: hasBody ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    })
    const payload = await response.json() as UpstreamResponse<T>

    if (!response.ok || payload.code !== 200) {
      throw new MetadataUpstreamError(
        response.status,
        payload.msg || payload.message || `元数据平台请求失败（${response.status}）`,
        payload.code,
        payload.traceId,
      )
    }
    return payload.data as T
  }
  catch (error) {
    if (error instanceof MetadataUpstreamError)
      throw error
    if (error instanceof Error && error.name === 'AbortError')
      throw new MetadataUpstreamError(504, '元数据平台请求超时')
    throw new MetadataUpstreamError(502, error instanceof Error ? error.message : '元数据平台不可用')
  }
  finally {
    clearTimeout(timeout)
  }
}

export function appendMetadataQuery(req: Request, path: string, keys: string[]): string {
  const search = new URLSearchParams()
  for (const key of keys) {
    const value = req.query[key]
    if (value === undefined || value === null || value === '')
      continue
    search.set(key, String(value))
  }
  const queryString = search.toString()
  return queryString ? `${path}?${queryString}` : path
}

export async function proxyMetadataJson<T = unknown>(
  req: Request,
  res: Response,
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
): Promise<void> {
  try {
    const data = await metadataUpstreamRequest<T>(req, path, { method, body })
    res.json({ code: 200, message: '操作成功', data })
  }
  catch (error) {
    sendMetadataError(res, error)
  }
}

export function sendMetadataError(res: Response, error: unknown): void {
  if (error instanceof MetadataUpstreamError) {
    res.status(error.status).json(failed(error.message))
    return
  }
  res.status(500).json(failed(error instanceof Error ? error.message : '元数据操作失败'))
}

export function asyncMetadataHandler(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next)
  }
}
