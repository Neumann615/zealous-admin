import { getDb } from '../../db'
import { TooManyRequestsError } from '../../lib/errors'

interface ThrottleRow {
  fail_count: number
  last_failure_at: number
  locked_until: number
}

const FAILURE_WINDOW_MS = 15 * 60 * 1000
const LOCK_DURATION_MS = 15 * 60 * 1000
const USERNAME_LOCK_FAILURES = 5
const USERNAME_CAPTCHA_FAILURES = 2
const IP_LOCK_FAILURES = 20
const IP_CAPTCHA_FAILURES = 5

function usernameKey(username: string): string {
  return `username:${username.trim().toLowerCase()}`
}

function ipKey(ip: string): string {
  return `ip:${ip}`
}

function getRow(key: string): ThrottleRow | undefined {
  return getDb().prepare(
    'SELECT fail_count, last_failure_at, locked_until FROM za_login_throttle WHERE throttle_key = ?',
  ).get(key) as ThrottleRow | undefined
}

function cleanupExpired(): void {
  getDb().prepare('DELETE FROM za_login_throttle WHERE locked_until < ? AND last_failure_at < ?').run(Date.now(), Date.now() - FAILURE_WINDOW_MS)
}

export function assertLoginAllowed(username: string, ip: string): void {
  cleanupExpired()
  const now = Date.now()
  for (const key of [usernameKey(username), ipKey(ip)]) {
    const row = getRow(key)
    if (row?.locked_until && row.locked_until > now)
      throw new TooManyRequestsError(`尝试过于频繁，请 ${Math.ceil((row.locked_until - now) / 60_000)} 分钟后再试`)
  }
}

export function isLoginCaptchaRequired(username: string, ip: string): boolean {
  const userRow = getRow(usernameKey(username))
  const ipRow = getRow(ipKey(ip))
  return (userRow?.fail_count ?? 0) >= USERNAME_CAPTCHA_FAILURES
    || (ipRow?.fail_count ?? 0) >= IP_CAPTCHA_FAILURES
}

export function recordLoginFailure(username: string, ip: string): void {
  const now = Date.now()
  const limits = new Map([
    [usernameKey(username), USERNAME_LOCK_FAILURES],
    [ipKey(ip), IP_LOCK_FAILURES],
  ])
  const db = getDb()

  for (const [key, lockFailures] of limits) {
    const row = getRow(key)
    const expired = !row || now - row.last_failure_at > FAILURE_WINDOW_MS
    const failCount = expired ? 1 : row.fail_count + 1
    const lockedUntil = failCount >= lockFailures ? now + LOCK_DURATION_MS : 0

    db.prepare(`
      INSERT INTO za_login_throttle (throttle_key, fail_count, last_failure_at, locked_until)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(throttle_key) DO UPDATE SET
        fail_count = excluded.fail_count,
        last_failure_at = excluded.last_failure_at,
        locked_until = excluded.locked_until
    `).run(key, failCount, now, lockedUntil)
  }
}

export function clearLoginFailures(username: string, ip: string): void {
  getDb().prepare('DELETE FROM za_login_throttle WHERE throttle_key IN (?, ?)').run(usernameKey(username), ipKey(ip))
}
