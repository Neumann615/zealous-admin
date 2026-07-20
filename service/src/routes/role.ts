import { Router } from 'express'
import { getDb } from '../db'
import { failed, success } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const db = getDb()

router.use(authMiddleware)

router.get('/role/list', (req, res) => {
  try {
    const keyword = (req.query.keyword as string) || ''
    const pageSize = Number(req.query.pageSize) || 5
    const pageNum = Number(req.query.pageNum) || 1
    const offset = (pageNum - 1) * pageSize

    let total: number
    let roles: any[]

    if (keyword) {
      const like = `%${keyword}%`
      total = (db.prepare(
        'SELECT COUNT(*) AS count FROM za_role WHERE name LIKE ? OR description LIKE ?',
      ).get(like, like) as any).count

      roles = db.prepare(
        'SELECT * FROM za_role WHERE name LIKE ? OR description LIKE ? ORDER BY sort LIMIT ? OFFSET ?',
      ).all(like, like, pageSize, offset)
    }
    else {
      total = (db.prepare('SELECT COUNT(*) AS count FROM za_role').get() as any).count
      roles = db.prepare('SELECT * FROM za_role ORDER BY sort LIMIT ? OFFSET ?').all(pageSize, offset)
    }

    res.json(success({ list: roles, total, pageSize, pageNum }))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取角色列表失败'))
  }
})

router.post('/role/create', async (req, res) => {
  try {
    const { name, description, sort } = req.body

    if (!name) {
      res.json(failed('角色名称不能为空'))
      return
    }

    const existing = db.prepare('SELECT id FROM za_role WHERE name = ?').get(name)
    if (existing) {
      res.json(failed('角色名称已存在'))
      return
    }

    const result = db.prepare(
      'INSERT INTO za_role (name, description, sort, create_time, status, admin_count) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(name, description || null, sort || 0, new Date().toISOString(), 1, 0)

    const role = db.prepare('SELECT * FROM za_role WHERE id = ?').get(result.lastInsertRowid)
    res.json(success(role))
  }
  catch (e: any) {
    res.json(failed(e.message || '创建角色失败'))
  }
})

router.get('/role/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const role = db.prepare('SELECT * FROM za_role WHERE id = ?').get(id)

    if (!role) {
      res.json(failed('角色不存在'))
      return
    }
    res.json(success(role))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取角色失败'))
  }
})

router.post('/role/update/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { name, description, sort, status } = req.body

    const existing = db.prepare('SELECT id FROM za_role WHERE id = ?').get(id)
    if (!existing) {
      res.json(failed('角色不存在'))
      return
    }

    if (name) {
      const conflict = db.prepare('SELECT id FROM za_role WHERE name = ? AND id != ?').get(name, id)
      if (conflict) {
        res.json(failed('角色名称已存在'))
        return
      }
    }

    const sets: string[] = []
    const values: any[] = []

    if (name !== undefined) { sets.push('name = ?'); values.push(name) }
    if (description !== undefined) { sets.push('description = ?'); values.push(description) }
    if (sort !== undefined) { sets.push('sort = ?'); values.push(sort) }
    if (status !== undefined) { sets.push('status = ?'); values.push(status) }

    if (sets.length === 0) {
      res.json(failed('没有需要更新的字段'))
      return
    }

    values.push(id)
    db.prepare(`UPDATE za_role SET ${sets.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare('SELECT * FROM za_role WHERE id = ?').get(id)
    res.json(success(updated))
  }
  catch (e: any) {
    res.json(failed(e.message || '更新角色失败'))
  }
})

router.post('/role/delete/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = db.prepare('SELECT id FROM za_role WHERE id = ?').get(id)
    if (!existing) {
      res.json(failed('角色不存在'))
      return
    }

    db.prepare('DELETE FROM za_admin_role_relation WHERE role_id = ?').run(id)
    db.prepare('DELETE FROM za_role_menu_relation WHERE role_id = ?').run(id)
    db.prepare('DELETE FROM za_role WHERE id = ?').run(id)

    res.json(success(null, '删除成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '删除角色失败'))
  }
})

router.get('/role/menu/:roleId', (req, res) => {
  try {
    const roleId = Number(req.params.roleId)
    const relations = db.prepare('SELECT menu_id FROM za_role_menu_relation WHERE role_id = ?').all(roleId) as any[]

    const menuIds = relations.map((r: any) => r.menu_id)
    if (menuIds.length === 0) {
      res.json(success([]))
      return
    }

    const placeholders = menuIds.map(() => '?').join(',')
    const menus = db.prepare(`SELECT * FROM za_menu WHERE id IN (${placeholders})`).all(...menuIds)

    res.json(success(menus))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取角色菜单失败'))
  }
})

router.post('/role/menu/update', (req, res) => {
  try {
    const roleId = Number(req.query.roleId)
    const menuIdsStr = (req.query.menuIds as string) || ''

    if (!roleId) {
      res.json(failed('roleId 不能为空'))
      return
    }

    db.prepare('DELETE FROM za_role_menu_relation WHERE role_id = ?').run(roleId)

    if (menuIdsStr) {
      const menuIds = menuIdsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
      if (menuIds.length > 0) {
        const stmt = db.prepare('INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)')
        for (const menuId of menuIds) stmt.run(roleId, menuId)
      }
    }

    res.json(success(null, '菜单分配成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '菜单分配失败'))
  }
})

router.get('/role/all', (_req, res) => {
  try {
    const roles = db.prepare('SELECT * FROM za_role ORDER BY sort').all()
    res.json(success(roles))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取所有角色失败'))
  }
})

export default router
