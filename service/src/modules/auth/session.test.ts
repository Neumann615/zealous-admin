import { beforeAll, describe, expect, it } from 'vitest'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'session-test-secret'

const { initDb } = await import('../../db')
const { signToken, verifyToken } = await import('../../lib/jwt')
const session = await import('./session')
const authService = await import('./auth.service')
const userService = await import('./user.service')

beforeAll(() => {
  initDb()
})

describe('auth session lifecycle', () => {
  it('禁用账号无法登录', async () => {
    const admin = await userService.register({ username: 'sess_disabled', password: 'pass1234' }) as { id: number }
    userService.updateUserStatus(admin.id, 0)
    await expect(authService.login('sess_disabled', 'pass1234')).rejects.toThrow('账号已被禁用')
  })

  it('令牌 sub 为 admin id 且会话可解析', async () => {
    const payload = await verifyToken((await authService.login('admin', 'admin123')).token)
    expect(payload.sub).toMatch(/^\d+$/)
    expect(session.resolveSession(payload)?.admin.username).toBe('admin')
  })

  it('登出吊销后同一令牌立即失效', async () => {
    const payload = await verifyToken((await authService.login('admin', 'admin123')).token)
    expect(session.resolveSession(payload)).not.toBeNull()
    session.revokeToken(payload.jti!, (payload.exp ?? 0) * 1000)
    expect(session.resolveSession(payload)).toBeNull()
  })

  it('整体吊销后存量令牌立即失效', async () => {
    const admin = await userService.register({ username: 'sess_revoke', password: 'pass1234' }) as { id: number }
    const payload = await verifyToken(await signToken({ sub: String(admin.id) }))
    expect(session.resolveSession(payload)).not.toBeNull()
    session.revokeAllTokensBefore(admin.id, Date.now() + 1000)
    expect(session.resolveSession(payload)).toBeNull()
  })
})