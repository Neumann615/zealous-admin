import { Router } from 'express'
import { getDb } from '../db'
import { now } from '../lib/date'
import { failed, success } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const db = getDb()

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

// 根据父级 path + name 计算菜单的完整 path
function computePath(parentId: number, name: string): string {
  if (!name)
    return ''
  if (parentId === 0)
    return `/${name}`
  const parent = db.prepare('SELECT path FROM za_menu WHERE id = ?').get(parentId) as any
  const parentPath = parent?.path || ''
  return `${parentPath}/${name}`
}

// 递归更新所有子孙菜单的 path
function updateDescendantPaths(parentId: number) {
  const children = db.prepare('SELECT * FROM za_menu WHERE parent_id = ?').all(parentId) as any[]
  for (const child of children) {
    const newPath = computePath(child.parent_id, child.name)
    db.prepare('UPDATE za_menu SET path = ? WHERE id = ?').run(newPath, child.id)
    updateDescendantPaths(child.id)
  }
}

router.use(authMiddleware)

router.get('/menu/list', (req, res) => {
  try {
    const parentId = Number(req.query.parentId) || 0
    const menus = db.prepare('SELECT * FROM za_menu WHERE parent_id = ? ORDER BY sort').all(parentId)
    res.json(success((menus as any[]).map(mapMenu)))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取菜单列表失败'))
  }
})

router.get('/menu/tree', (_req, res) => {
  try {
    const allMenus = db.prepare('SELECT * FROM za_menu ORDER BY sort').all() as any[]

    const buildTree = (parentId: number): any[] =>
      allMenus.filter(m => m.parent_id === parentId).map((m) => {
        const children = buildTree(m.id)
        const node = mapMenu(m)
        if (children.length > 0) {
          node.children = children
        }
        return node
      })

    res.json(success(buildTree(0)))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取菜单树失败'))
  }
})

router.post('/menu/create', (req, res) => {
  try {
    const { parentId, title, level, sort, name, icon, hidden, component, activeIcon } = req.body

    if (!title) {
      res.json(failed('菜单标题不能为空'))
      return
    }

    const pid = parentId || 0
    const menuName = name || ''
    const menuPath = computePath(pid, menuName)

    const result = db.prepare(
      'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, path, component, create_time, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(pid, title, level || 0, sort || 0, menuName, icon || null, hidden || 0, menuPath, component || null, now(), activeIcon || null)

    const menu = db.prepare('SELECT * FROM za_menu WHERE id = ?').get(result.lastInsertRowid)
    res.json(success(mapMenu(menu)))
  }
  catch (e: any) {
    res.json(failed(e.message || '创建菜单失败'))
  }
})

router.get('/menu/all', (_req, res) => {
  try {
    const menus = db.prepare('SELECT * FROM za_menu ORDER BY sort').all()
    res.json(success((menus as any[]).map(mapMenu)))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取所有菜单失败'))
  }
})

router.get('/menu/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const menu = db.prepare('SELECT * FROM za_menu WHERE id = ?').get(id)

    if (!menu) {
      res.json(failed('菜单不存在'))
      return
    }
    res.json(success(mapMenu(menu)))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取菜单失败'))
  }
})

router.post('/menu/update/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const { parentId, title, level, sort, name, icon, hidden, component, activeIcon } = req.body

    const existing = db.prepare('SELECT * FROM za_menu WHERE id = ?').get(id) as any
    if (!existing) {
      res.json(failed('菜单不存在'))
      return
    }

    const sets: string[] = []
    const values: any[] = []

    if (parentId !== undefined) { sets.push('parent_id = ?'); values.push(parentId) }
    if (title !== undefined) { sets.push('title = ?'); values.push(title) }
    if (level !== undefined) { sets.push('level = ?'); values.push(level) }
    if (sort !== undefined) { sets.push('sort = ?'); values.push(sort) }
    if (name !== undefined) { sets.push('name = ?'); values.push(name) }
    if (icon !== undefined) { sets.push('icon = ?'); values.push(icon) }
    if (hidden !== undefined) { sets.push('hidden = ?'); values.push(hidden) }
    if (component !== undefined) { sets.push('component = ?'); values.push(component) }
    if (activeIcon !== undefined) { sets.push('active_icon = ?'); values.push(activeIcon) }

    // name 或 parentId 变更时，重新计算自身及所有子孙的 path
    const newName = name !== undefined ? (name || '') : existing.name
    const newParentId = parentId !== undefined ? parentId : existing.parent_id
    const needsPathUpdate = (name !== undefined || parentId !== undefined)
      && (newName !== existing.name || newParentId !== existing.parent_id)

    if (needsPathUpdate) {
      const newPath = computePath(newParentId, newName)
      sets.push('path = ?'); values.push(newPath)
    }

    if (sets.length === 0) {
      res.json(failed('没有需要更新的字段'))
      return
    }

    values.push(id)
    db.prepare(`UPDATE za_menu SET ${sets.join(', ')} WHERE id = ?`).run(...values)

    // 如果 path 变了，级联更新所有子孙菜单的 path
    if (needsPathUpdate) {
      updateDescendantPaths(id)
    }

    const updated = db.prepare('SELECT * FROM za_menu WHERE id = ?').get(id)
    res.json(success(mapMenu(updated)))
  }
  catch (e: any) {
    res.json(failed(e.message || '更新菜单失败'))
  }
})

router.post('/menu/delete/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = db.prepare('SELECT id FROM za_menu WHERE id = ?').get(id)
    if (!existing) {
      res.json(failed('菜单不存在'))
      return
    }

    const childCount = (db.prepare('SELECT COUNT(*) AS count FROM za_menu WHERE parent_id = ?').get(id) as any).count
    if (childCount > 0) {
      res.json(failed('存在子菜单，无法删除'))
      return
    }

    db.prepare('DELETE FROM za_role_menu_relation WHERE menu_id = ?').run(id)
    db.prepare('DELETE FROM za_menu WHERE id = ?').run(id)

    res.json(success(null, '删除成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '删除菜单失败'))
  }
})

export default router
