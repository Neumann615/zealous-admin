import type { TokenPayload } from '../../lib/jwt'
import { getDb } from '../../db'

export interface SessionAdmin {
  id: number
  username: string
  status: number
}

export interface ResolvedSession {
  admin: SessionAdmin
  jti?: string
  expMs: number
}

interface AdminRow {
  id: number
  username: string
  status: number
  revokedBefore: number | null
}

/** 登出：吊销单个令牌 */
export function revokeToken(jti: string, expMs: number): void {
  const db = getDb()
  db.prepare('INSERT OR IGNORE INTO za_token_revocation (jti, expires_at) VALUES (?, ?)').run(jti, expMs)
  db.prepare('DELETE FROM za_token_revocation WHERE expires_at < ?').run(Date.now())
}

/** 改密 / 禁用 / 删除：按签发时间水位线整体吊销该账号的存量令牌 */
export function revokeAllTokensBefore(adminId: number, timestampMs: number = Date.now()): void {
  getDb().prepare('UPDATE za_admin SET token_revoked_before = ? WHERE id = ?').run(timestampMs, adminId)
}

function isRevoked(jti: string): boolean {
  return getDb().prepare('SELECT 1 AS hit FROM za_token_revocation WHERE jti = ?').get(jti) !== undefined
}

/** 验签之后回查账号：禁用、删除、整体吊销、单令牌吊销在这里统一拦截 */
export function resolveSession(payload: TokenPayload): ResolvedSession | null {
  const admin = getDb().prepare(
    'SELECT id, username, status, token_revoked_before AS revokedBefore FROM za_admin WHERE id = ?',
  ).get(Number(payload.sub)) as AdminRow | undefined
  if (!admin || admin.status !== 1)
    return null

  const iatMs = (payload.iat ?? 0) * 1000
  if (iatMs < (admin.revokedBefore ?? 0))
    return null

  if (payload.jti && isRevoked(payload.jti))
    return null

  return {
    admin: { id: admin.id, username: admin.username, status: admin.status },
    jti: payload.jti,
    expMs: (payload.exp ?? 0) * 1000,
  }
}