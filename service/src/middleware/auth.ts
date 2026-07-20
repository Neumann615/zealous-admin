import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../lib/jwt'
import { unauthorized } from '../lib/response'

declare global {
  namespace Express {
    interface Request {
      username?: string
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    res.status(401).json(unauthorized())
    return
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  verifyToken(token)
    .then((username) => {
      req.username = username
      next()
    })
    .catch(() => {
      res.status(401).json(unauthorized())
    })
}
