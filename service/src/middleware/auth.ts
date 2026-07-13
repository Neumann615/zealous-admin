import type { Context, Next } from 'hono'
import { verifyToken } from '../lib/jwt'
import { unauthorized } from '../lib/response'

/** JWT 鉴权中间件 — 从 Authorization header 提取 token 并验证 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) {
    return c.json(unauthorized(), 401)
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  try {
    const username = await verifyToken(token)
    c.set('username', username)
    await next()
  }
  catch {
    return c.json(unauthorized(), 401)
  }
}
