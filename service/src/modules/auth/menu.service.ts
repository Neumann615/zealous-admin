import { getDb } from '../../db'
import { NotFoundError } from '../../lib/errors'
import { now } from '../../lib/date'

function mapMenu(row: any) {
  if (!row)
    return row
  return {
    ...row,
    parentId: row.parent_id,
    createTime: row.create_time,
    activeIcon: row.active_icon || null,
  }
}

function computePath(parentId: number, name: string): string {
  if (!name)
    return ''
  if (parentId === 0)
    return `/${name}`
  const db = getDb()
  const parent = db.prepare('SELECT path FROM za_menu WHERE id = ?').get(parentId) as any
  const parentPath = parent?.path || ''
  return `${parentPath}/${name}`
}

function updateDescendantPaths(parentId: number) {
  const db = getDb()
  const children = db.prepare('SELECT * FROM za_menu WHERE parent_id = ?').all(parentId) as any[]
  for (const child of children) {
    const newPath = computePath(child.parent_id, child.name)
    db.prepare('UPDATE za_menu SET path = ? WHERE id = ?').run(newPath, child.id)
    updateDescendantPaths(child.id)
  }
}

export function getMenuList(parentId = 0) {
  const db = getDb()
  const menus = db.prepare('SELECT * FROM za_menu WHERE parent_id = ? ORDER BY sort').all(parentId)
  return (menus as any[]).map(mapMenu)
}

export function getMenuTree() {
  const db = getDb()
  const allMenus = db.prepare('SELECT * FROM za_menu ORDER BY sort').all() as any[]

  const buildTree = (parentId: number): any[] =>
    allMenus.filter(m => m.parent_id === parentId).map((m) => {
      const children = buildTree(m.id)
      const node = mapMenu(m)
      if (children.length > 0)
        node.children = children
      return node
    })

  return buildTree(0)
}

export function getAllMenus() {
  const db = getDb()
  return (db.prepare('SELECT * FROM za_menu ORDER BY sort').all() as any[]).map(mapMenu)
}

export function getMenuById(id: number) {
  const db = getDb()
  const menu = db.prepare('SELECT * FROM za_menu WHERE id = ?').get(id)
  if (!menu)
    throw new NotFoundError('菜单不存在')
  return mapMenu(menu)
}

export function createMenu(data: { parentId?: number, title: string, level?: number, sort?: number, name?: string, icon?: string, hidden?: number, component?: string, type?: number, permission?: string, activeIcon?: string }) {
  const db = getDb()
  const pid = data.parentId || 0
  const menuName = data.name || ''
  const menuPath = computePath(pid, menuName)

  const result = db.prepare(
    'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, path, component, type, permission, create_time, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(pid, data.title, data.level || 0, data.sort || 0, menuName, data.icon || null, data.hidden || 0, menuPath, data.component || null, data.type ?? 1, data.permission || null, now(), data.activeIcon || null)

  return mapMenu(db.prepare('SELECT * FROM za_menu WHERE id = ?').get(result.lastInsertRowid))
}

export function updateMenu(id: number, data: { parentId?: number, title?: string, level?: number, sort?: number, name?: string, icon?: string, hidden?: number, component?: string, type?: number, permission?: string, activeIcon?: string }) {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM za_menu WHERE id = ?').get(id) as any
  if (!existing)
    throw new NotFoundError('菜单不存在')

  const sets: string[] = []
  const values: any[] = []

  if (data.parentId !== undefined) { sets.push('parent_id = ?'); values.push(data.parentId) }
  if (data.title !== undefined) { sets.push('title = ?'); values.push(data.title) }
  if (data.level !== undefined) { sets.push('level = ?'); values.push(data.level) }
  if (data.sort !== undefined) { sets.push('sort = ?'); values.push(data.sort) }
  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name) }
  if (data.icon !== undefined) { sets.push('icon = ?'); values.push(data.icon) }
  if (data.hidden !== undefined) { sets.push('hidden = ?'); values.push(data.hidden) }
  if (data.component !== undefined) { sets.push('component = ?'); values.push(data.component) }
  if (data.type !== undefined) { sets.push('type = ?'); values.push(data.type) }
  if (data.permission !== undefined) { sets.push('permission = ?'); values.push(data.permission || null) }
  if (data.activeIcon !== undefined) { sets.push('active_icon = ?'); values.push(data.activeIcon) }

  const newName = data.name !== undefined ? (data.name || '') : existing.name
  const newParentId = data.parentId !== undefined ? data.parentId : existing.parent_id
  const needsPathUpdate = (data.name !== undefined || data.parentId !== undefined)
    && (newName !== existing.name || newParentId !== existing.parent_id)

  if (needsPathUpdate) {
    const newPath = computePath(newParentId, newName)
    sets.push('path = ?')
    values.push(newPath)
  }

  if (sets.length === 0)
    throw new NotFoundError('没有需要更新的字段')

  values.push(id)
  db.prepare(`UPDATE za_menu SET ${sets.join(', ')} WHERE id = ?`).run(...values)

  if (needsPathUpdate)
    updateDescendantPaths(id)

  return mapMenu(db.prepare('SELECT * FROM za_menu WHERE id = ?').get(id))
}

export function deleteMenu(id: number) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_menu WHERE id = ?').get(id)
  if (!existing)
    throw new NotFoundError('菜单不存在')

  // 按钮节点（type = 2）随父级一起删；目录 / 菜单子节点仍需先处理，避免误删整棵子树
  const childCount = (db.prepare('SELECT COUNT(*) AS count FROM za_menu WHERE parent_id = ? AND (type IS NULL OR type <> 2)').get(id) as any).count
  if (childCount > 0)
    throw new NotFoundError('存在子菜单，无法删除')

  const buttonIds = (db.prepare('SELECT id FROM za_menu WHERE parent_id = ? AND type = 2').all(id) as Array<{ id: number }>).map(row => row.id)
  const targetIds = [id, ...buttonIds]
  const placeholders = targetIds.map(() => '?').join(',')

  db.exec('BEGIN')
  try {
    db.prepare(`DELETE FROM za_role_menu_relation WHERE menu_id IN (${placeholders})`).run(...targetIds)
    db.prepare(`DELETE FROM za_menu WHERE id IN (${placeholders})`).run(...targetIds)
    db.exec('COMMIT')
  }
  catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
