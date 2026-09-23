import bcrypt from 'bcryptjs'
import { getDb } from '../../db'
import { ConflictError, NotFoundError } from '../../lib/errors'
import { now } from '../../lib/date'
import { revokeAllTokensBefore } from './session'

const ADMIN_FIELDS = 'id, username, icon, email, nick_name AS nickName, note, create_time AS createTime, login_time AS loginTime, status'

export async function register(data: { username: string, password: string, icon?: string, email?: string, nickName?: string, note?: string }) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_admin WHERE username = ?').get(data.username)
  if (existing)
    throw new ConflictError('用户名已存在')

  const hashedPassword = await bcrypt.hash(data.password, 10)
  const result = db.prepare(
    'INSERT INTO za_admin (username, password, icon, email, nick_name, note, create_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(data.username, hashedPassword, data.icon || null, data.email || null, data.nickName || null, data.note || null, now(), 1)

  return db.prepare(`SELECT ${ADMIN_FIELDS} FROM za_admin WHERE id = ?`).get(result.lastInsertRowid)
}

export function getUserList(params: { keyword?: string, pageNum: number, pageSize: number }) {
  const db = getDb()
  const offset = (params.pageNum - 1) * params.pageSize

  let total: number
  let admins: any[]

  if (params.keyword) {
    const like = `%${params.keyword}%`
    total = (db.prepare(
      'SELECT COUNT(*) AS count FROM za_admin WHERE username LIKE ? OR nick_name LIKE ?',
    ).get(like, like) as any).count
    admins = db.prepare(
      `SELECT ${ADMIN_FIELDS} FROM za_admin WHERE username LIKE ? OR nick_name LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?`,
    ).all(like, like, params.pageSize, offset)
  }
  else {
    total = (db.prepare('SELECT COUNT(*) AS count FROM za_admin').get() as any).count
    admins = db.prepare(
      `SELECT ${ADMIN_FIELDS} FROM za_admin ORDER BY id DESC LIMIT ? OFFSET ?`,
    ).all(params.pageSize, offset)
  }

  return { list: admins, total, pageSize: params.pageSize, pageNum: params.pageNum }
}

export function getUserById(id: number) {
  const db = getDb()
  const admin = db.prepare(`SELECT ${ADMIN_FIELDS} FROM za_admin WHERE id = ?`).get(id)
  if (!admin)
    throw new NotFoundError('管理员不存在')
  return admin
}

export async function updateUser(id: number, data: { username?: string, password?: string, icon?: string, email?: string, nickName?: string, note?: string, status?: number }) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_admin WHERE id = ?').get(id)
  if (!existing)
    throw new NotFoundError('管理员不存在')

  if (data.username) {
    const conflict = db.prepare('SELECT id FROM za_admin WHERE username = ? AND id != ?').get(data.username, id)
    if (conflict)
      throw new ConflictError('用户名已被占用')
  }

  const sets: string[] = []
  const values: any[] = []

  if (data.username !== undefined) { sets.push('username = ?'); values.push(data.username) }
  if (data.icon !== undefined) { sets.push('icon = ?'); values.push(data.icon) }
  if (data.email !== undefined) { sets.push('email = ?'); values.push(data.email) }
  if (data.nickName !== undefined) { sets.push('nick_name = ?'); values.push(data.nickName) }
  if (data.note !== undefined) { sets.push('note = ?'); values.push(data.note) }
  if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status) }
  if (data.password) {
    sets.push('password = ?')
    values.push(await bcrypt.hash(data.password, 10))
  }

  if (sets.length === 0)
    throw new NotFoundError('没有需要更新的字段')

  values.push(id)
  db.prepare(`UPDATE za_admin SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  if (data.password || data.status === 0)
    revokeAllTokensBefore(id)
  return db.prepare(`SELECT ${ADMIN_FIELDS} FROM za_admin WHERE id = ?`).get(id)
}

export function deleteUser(id: number) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_admin WHERE id = ?').get(id)
  if (!existing)
    throw new NotFoundError('管理员不存在')

  db.prepare('DELETE FROM za_admin_role_relation WHERE admin_id = ?').run(id)
  db.prepare('DELETE FROM za_admin WHERE id = ?').run(id)
}

export function updateUserStatus(id: number, status: number) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_admin WHERE id = ?').get(id)
  if (!existing)
    throw new NotFoundError('管理员不存在')

  db.prepare('UPDATE za_admin SET status = ? WHERE id = ?').run(status, id)
  if (status !== 1)
    revokeAllTokensBefore(id)
}

export function assignRoles(adminId: number, roleIdsStr: string) {
  const db = getDb()
  db.prepare('DELETE FROM za_admin_role_relation WHERE admin_id = ?').run(adminId)

  if (roleIdsStr) {
    const roleIds = roleIdsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
    if (roleIds.length > 0) {
      const stmt = db.prepare('INSERT INTO za_admin_role_relation (admin_id, role_id) VALUES (?, ?)')
      for (const roleId of roleIds) stmt.run(adminId, roleId)
    }
  }
}

export function getUserRoles(adminId: number) {
  const db = getDb()
  const relations = db.prepare('SELECT role_id FROM za_admin_role_relation WHERE admin_id = ?').all(adminId) as any[]
  const roleIds = relations.map(r => r.role_id)

  if (roleIds.length === 0)
    return []

  const placeholders = roleIds.map(() => '?').join(',')
  return db.prepare(`SELECT * FROM za_role WHERE id IN (${placeholders})`).all(...roleIds)
}
