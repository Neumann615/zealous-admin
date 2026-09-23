import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'

type Source = 'body' | 'query' | 'params'

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const message = result.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
      res.status(400).json({ code: 400, message: message || '参数校验失败', data: null })
      return
    }
    if (source === 'body') {
      req.body = result.data
    }
    else if (source === 'query') {
      Object.defineProperty(req, 'query', { value: result.data, writable: true })
    }
    else {
      Object.defineProperty(req, 'params', { value: result.data, writable: true })
    }
    next()
  }
}
