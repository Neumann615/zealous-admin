import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../lib/jwt'
import { unauthorized } from '../lib/response'
import { getPermissions } from '../modules/auth/permission.service'
import { resolveSession } from '../modules/auth/session'

declare global {
  namespace Express {
    interface Request {
      username?: string
      adminId?: number
      tokenJti?: string
      tokenExpMs?: number
      /** 当前会话的权限标识集合，超管为 ['*']；由 permissionMiddleware 消费 */
      permissions?: string[]
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
      // 每次请求实时解析：角色授权或菜单权限一改动立即生效，不需要等令牌过期
      req.permissions = getPermissions(session.admin.id)
      next()
    })
    .catch(() => {
      res.status(401).json(unauthorized())
    })
}
