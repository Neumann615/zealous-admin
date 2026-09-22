import type { Request, Response } from 'express'
import { z } from 'zod'

export const positiveIdSchema = z.coerce.number().int().positive()

export const enabledStatusSchema = z.union([z.literal(0), z.literal(1)])

export const idListSchema = z.array(z.coerce.number().int().positive()).min(1)

export function parseIdParam(req: Request, res: Response, key = 'id'): number | undefined {
  const result = positiveIdSchema.safeParse(req.params[key])
  if (!result.success) {
    res.status(400).json({ code: 400, message: `${key} 必须是正整数`, data: null })
    return undefined
  }
  return result.data
}

export function parseEnabledParam(req: Request, res: Response): 0 | 1 | undefined {
  const result = enabledStatusSchema.safeParse(Number(req.query.enabled))
  if (!result.success) {
    res.status(400).json({ code: 400, message: 'enabled 必须是 0 或 1', data: null })
    return undefined
  }
  return result.data
}

export function parseIdBody(req: Request, res: Response): number[] | undefined {
  const result = idListSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ code: 400, message: 'ID 列表不能为空', data: null })
    return undefined
  }
  return result.data
}
