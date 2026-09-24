import { beforeAll, describe, expect, it } from 'vitest'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'login-guard-test-secret'

const { getDb, initDb } = await import('../../db')
const { TooManyRequestsError } = await import('../../lib/errors')
const guard = await import('./login-guard')

beforeAll(() => {
  initDb()
})

describe('登录限流', () => {
  it('连续失败后要求验证码，达到阈值后锁定，成功登录后清零', () => {
    const username = `limited_${Date.now()}`
    const ip = `10.8.0.${Date.now() % 250}`

    expect(guard.isLoginCaptchaRequired(username, ip)).toBe(false)
    guard.recordLoginFailure(username, ip)
    guard.recordLoginFailure(username, ip)
    expect(guard.isLoginCaptchaRequired(username, ip)).toBe(true)
    expect(() => guard.assertLoginAllowed(username, ip)).not.toThrow()

    guard.recordLoginFailure(username, ip)
    guard.recordLoginFailure(username, ip)
    guard.recordLoginFailure(username, ip)
    expect(() => guard.assertLoginAllowed(username, ip)).toThrow(TooManyRequestsError)

    const row = getDb().prepare('SELECT fail_count, locked_until FROM za_login_throttle WHERE throttle_key = ?').get(`username:${username}`) as { fail_count: number, locked_until: number }
    expect(row.fail_count).toBe(5)
    expect(row.locked_until).toBeGreaterThan(Date.now())

    guard.clearLoginFailures(username, ip)
    expect(guard.isLoginCaptchaRequired(username, ip)).toBe(false)
    expect(() => guard.assertLoginAllowed(username, ip)).not.toThrow()
  })
})
