import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../lib/jwt'
import { unauthorized } from '../lib/response'
import { resolveSession } from '../modules/auth/session'

declare global {
  namespace Express {
    interface Request {
      username?: string
      adminId?: number
      tokenJti?: string
      tokenExpMs?: number
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
    .then((payload) => {
      const session = resolveSession(payload)
      if (!session) {
        res.status(401).json(unauthorized())
        return
      }
      req.username = session.admin.username
      req.adminId = session.admin.id
      req.tokenJti = session.jti
      req.tokenExpMs = session.expMs
      next()
    })
    .catch(() => {
      res.status(401).json(unauthorized())
    })
}