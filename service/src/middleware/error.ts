import type { NextFunction, Request, Response } from 'express'
import { BusinessError } from '../lib/errors'
import { failed } from '../lib/response'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof BusinessError) {
    res.status(err.code).json(failed(err.message, err.code))
    return
  }
  console.error('[Unhandled]', err)
  res.status(500).json(failed('服务器内部错误'))
}

export function asyncHandler(
  fn: (req: any, res: any, next: any) => Promise<any>,
) {
  return (req: any, res: any, next: any) => {
    fn(req, res, next).catch(next)
  }
}
