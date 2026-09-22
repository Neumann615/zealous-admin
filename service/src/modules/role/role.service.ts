import { getDb } from '../../db'
import { ConflictError, NotFoundError } from '../../lib/errors'
import { now } from '../../lib/date'

function mapRole(row: any) {
  if (!row)
    return row
  return {
    ...row,
    adminCount: row.admin_count,
    createTime: row.create_time,
  }
}

export function getRoleList(params: { keyword?: string, pageNum: number, pageSize: number }) {
  const db = getDb()
  const offset = (params.pageNum - 1) * params.pageSize

  let total: number
  let roles: any[]

  if (params.keyword) {
    const like = `%${params.keyword}%`
    total = (db.prepare(
      'SELECT COUNT(*) AS count FROM za_role WHERE name LIKE ? OR description LIKE ?',
    ).get(like, like) as any).count
    roles = db.prepare(
      'SELECT * FROM za_role WHERE name LIKE ? OR description LIKE ? ORDER BY sort LIMIT ? OFFSET ?',
    ).all(like, like, params.pageSize, offset)
  }
  else {
    total = (db.prepare('SELECT COUNT(*) AS count FROM za_role').get() as any).count
    roles = db.prepare('SELECT * FROM za_role ORDER BY sort LIMIT ? OFFSET ?').all(params.pageSize, offset)
  }

  return { list: roles.map(mapRole), total, pageSize: params.pageSize, pageNum: params.pageNum }
}

export function createRole(data: { name: string, description?: string, sort?: number }) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_role WHERE name = ?').get(data.name)
  if (existing)
    throw new ConflictError('角色名称已存在')

  const result = db.prepare(
    'INSERT INTO za_role (name, description, sort, create_time, status, admin_count) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(data.name, data.description || null, data.sort || 0, now(), 1, 0)

  const role = db.prepare('SELECT * FROM za_role WHERE id = ?').get(result.lastInsertRowid)
  return mapRole(role)
}

export function getAllRoles() {
  const db = getDb()
  return (db.prepare('SELECT * FROM za_role ORDER BY sort').all() as any[]).map(mapRole)
}

export function getRoleById(id: number) {
  const db = getDb()
  const role = db.prepare('SELECT * FROM za_role WHERE id = ?').get(id)
  if (!role)
    throw new NotFoundError('角色不存在')
  return mapRole(role)
}

export function updateRole(id: number, data: { name?: string, description?: string, sort?: number, status?: number }) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_role WHERE id = ?').get(id)
  if (!existing)
    throw new NotFoundError('角色不存在')

  if (data.name) {
    const conflict = db.prepare('SELECT id FROM za_role WHERE name = ? AND id != ?').get(data.name, id)
    if (conflict)
      throw new ConflictError('角色名称已存在')
  }

  const sets: string[] = []
  const values: any[] = []

  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name) }
  if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description) }
  if (data.sort !== undefined) { sets.push('sort = ?'); values.push(data.sort) }
  if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status) }

  if (sets.length === 0)
    throw new NotFoundError('没有需要更新的字段')

  values.push(id)
  db.prepare(`UPDATE za_role SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return mapRole(db.prepare('SELECT * FROM za_role WHERE id = ?').get(id))
}

export function deleteRole(id: number) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_role WHERE id = ?').get(id)
  if (!existing)
    throw new NotFoundError('角色不存在')

  db.prepare('DELETE FROM za_admin_role_relation WHERE role_id = ?').run(id)
  db.prepare('DELETE FROM za_role_menu_relation WHERE role_id = ?').run(id)
  db.prepare('DELETE FROM za_role WHERE id = ?').run(id)
}

export function getRoleMenus(roleId: number) {
  const db = getDb()
  const relations = db.prepare('SELECT menu_id FROM za_role_menu_relation WHERE role_id = ?').all(roleId) as any[]
  const menuIds = relations.map(r => r.menu_id)
  if (menuIds.length === 0)
    return []

  const placeholders = menuIds.map(() => '?').join(',')
  return db.prepare(`SELECT * FROM za_menu WHERE id IN (${placeholders})`).all(...menuIds)
}

export function assignMenus(roleId: number, menuIdsStr: string) {
  const db = getDb()
  db.prepare('DELETE FROM za_role_menu_relation WHERE role_id = ?').run(roleId)

  if (menuIdsStr) {
    const menuIds = menuIdsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
    if (menuIds.length > 0) {
      const stmt = db.prepare('INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)')
      for (const menuId of menuIds) stmt.run(roleId, menuId)
    }
  }
}
