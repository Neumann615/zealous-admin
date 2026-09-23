import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

export const REQUEST_ID_HEADER = 'X-Request-Id'

/**
 * 为每个请求打上可追溯 ID。
 * 前端采集 SDK 的接口采集器会读取该响应头写入 API 日志，用于把一条前端异常和后端日志串起来，
 * 因此必须同时通过 CORS 的 exposedHeaders 暴露给浏览器。
 */
export function requestId(_req: Request, res: Response, next: NextFunction) {
  if (!res.getHeader(REQUEST_ID_HEADER))
    res.setHeader(REQUEST_ID_HEADER, randomUUID())
  next()
}