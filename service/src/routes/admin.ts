import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { getDb } from '../db'
import { now } from '../lib/date'
import { signToken } from '../lib/jwt'
import { failed, success } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const db = getDb()

router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.json(failed('用户名或密码不能为空'))
      return
    }

    const admin = db.prepare('SELECT * FROM za_admin WHERE username = ?').get(username) as any
    if (!admin) {
      res.json(failed('用户名或密码错误'))
      return
    }

    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) {
      res.json(failed('用户名或密码错误'))
      return
    }

    db.prepare('UPDATE za_admin SET login_time = ? WHERE id = ?').run(now(), admin.id)

    const token = await signToken({ sub: admin.username })
    res.json(success({ tokenHead: 'Bearer ', token }))
  }
  catch (e: any) {
    res.json(failed(e.message || '登录失败'))
  }
})

router.use(authMiddleware)

router.post('/admin/register', async (req, res) => {
  try {
    const { username, password, icon, email, nickName, note } = req.body

    if (!username || !password) {
      res.json(failed('用户名和密码不能为空'))
      return
    }

    const existing = db.prepare('SELECT id FROM za_admin WHERE username = ?').get(username)
    if (existing) {
      res.json(failed('用户名已存在'))
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const nowStr = now()

    const result = db.prepare(
      'INSERT INTO za_admin (username, password, icon, email, nick_name, note, create_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(username, hashedPassword, icon || null, email || null, nickName || null, note || null, nowStr, 1)

    const admin = db.prepare(
      'SELECT id, username, icon, email, nick_name AS nickName, note, create_time AS createTime, login_time AS loginTime, status FROM za_admin WHERE id = ?',
    ).get(result.lastInsertRowid)

    res.json(success(admin))
  }
  catch (e: any) {
    res.json(failed(e.message || '注册失败'))
  }
})

router.get('/admin/refreshToken', async (req, res) => {
  try {
    const token = await signToken({ sub: req.username! })
    res.json(success({ tokenHead: 'Bearer ', token }))
  }
  catch (e: any) {
    res.json(failed(e.message || '刷新 Token 失败'))
  }
})

router.get('/admin/info', async (req, res) => {
  try {
    const admin = db.prepare(
      'SELECT id, username, icon, email, nick_name AS nickName, note, create_time AS createTime, login_time AS loginTime, status FROM za_admin WHERE username = ?',
    ).get(req.username!) as any

    if (!admin) {
      res.json(failed('用户不存在'))
      return
    }

    const roleRelations = db.prepare('SELECT role_id FROM za_admin_role_relation WHERE admin_id = ?').all(admin.id) as any[]
    const roleIds = roleRelations.map((r: any) => r.role_id)

    let roles: string[] = []
    let menus: any[] = []

    if (roleIds.length > 0) {
      const placeholders = roleIds.map(() => '?').join(',')
      const roleRows = db.prepare(`SELECT name FROM za_role WHERE id IN (${placeholders})`).all(...roleIds) as any[]
      roles = roleRows.map((r: any) => r.name)

      const menuRelations = db.prepare(`SELECT menu_id FROM za_role_menu_relation WHERE role_id IN (${placeholders})`).all(...roleIds) as any[]
      const menuIds = [...new Set(menuRelations.map((m: any) => m.menu_id))] as number[]

      if (menuIds.length > 0) {
        const mPlaceholders = menuIds.map(() => '?').join(',')
        menus = (db.prepare(`SELECT * FROM za_menu WHERE id IN (${mPlaceholders}) ORDER BY sort`).all(...menuIds) as any[]).map((m: any) => ({
          id: m.id,
          parentId: m.parent_id,
          title: m.title,
          level: m.level,
          sort: m.sort,
          name: m.name,
          icon: m.icon,
          hidden: m.hidden,
          path: m.path,
          createTime: m.create_time,
          activeIcon: m.active_icon || null,
        }))
      }
    }

    res.json(success({ ...admin, menus, roles }))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取用户信息失败'))
  }
})

router.post('/admin/logout', (_req, res) => {
  res.json(success(null, '登出成功'))
})

router.get('/admin/list', (req, res) => {
  try {
    const keyword = (req.query.keyword as string) || ''
    const pageSize = Number(req.query.pageSize) || 5
    const pageNum = Number(req.query.pageNum) || 1
    const offset = (pageNum - 1) * pageSize

    let total: number
    let admins: any[]

    if (keyword) {
      const like = `%${keyword}%`
      total = (db.prepare(
        'SELECT COUNT(*) AS count FROM za_admin WHERE username LIKE ? OR nick_name LIKE ?',
      ).get(like, like) as any).count

      admins = db.prepare(
        'SELECT id, username, icon, email, nick_name AS nickName, note, create_time AS createTime, login_time AS loginTime, status FROM za_admin WHERE username LIKE ? OR nick_name LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?',
      ).all(like, like, pageSize, offset)
    }
    else {
      total = (db.prepare('SELECT COUNT(*) AS count FROM za_admin').get() as any).count
      admins = db.prepare(
        'SELECT id, username, icon, email, nick_name AS nickName, note, create_time AS createTime, login_time AS loginTime, status FROM za_admin ORDER BY id DESC LIMIT ? OFFSET ?',
      ).all(pageSize, offset)
    }

    res.json(success({ list: admins, total, pageSize, pageNum }))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取管理员列表失败'))
  }
})

router.get('/admin/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const admin = db.prepare(
      'SELECT id, username, icon, email, nick_name AS nickName, note, create_time AS createTime, login_time AS loginTime, status FROM za_admin WHERE id = ?',
    ).get(id)

    if (!admin) {
      res.json(failed('管理员不存在'))
      return
    }
    res.json(success(admin))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取管理员失败'))
  }
})

router.post('/admin/updatePassword', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body

    if (!username || !oldPassword || !newPassword) {
      res.json({ code: -1, message: '参数不合法', data: null })
      return
    }

    const admin = db.prepare('SELECT * FROM za_admin WHERE username = ?').get(username) as any
    if (!admin) {
      res.json({ code: -2, message: '用户不存在', data: null })
      return
    }

    const valid = await bcrypt.compare(oldPassword, admin.password)
    if (!valid) {
      res.json({ code: -3, message: '旧密码错误', data: null })
      return
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    db.prepare('UPDATE za_admin SET password = ? WHERE id = ?').run(hashedPassword, admin.id)

    res.json({ code: 1, message: '密码修改成功', data: null })
  }
  catch (e: any) {
    res.json({ code: -1, message: e.message || '密码修改失败', data: null })
  }
})

router.post('/admin/update/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { username, password, icon, email, nickName, note, status } = req.body

    const existing = db.prepare('SELECT id FROM za_admin WHERE id = ?').get(id)
    if (!existing) {
      res.json(failed('管理员不存在'))
      return
    }

    if (username) {
      const conflict = db.prepare('SELECT id FROM za_admin WHERE username = ? AND id != ?').get(username, id)
      if (conflict) {
        res.json(failed('用户名已被占用'))
        return
      }
    }

    const sets: string[] = []
    const values: any[] = []

    if (username !== undefined) { sets.push('username = ?'); values.push(username) }
    if (icon !== undefined) { sets.push('icon = ?'); values.push(icon) }
    if (email !== undefined) { sets.push('email = ?'); values.push(email) }
    if (nickName !== undefined) { sets.push('nick_name = ?'); values.push(nickName) }
    if (note !== undefined) { sets.push('note = ?'); values.push(note) }
    if (status !== undefined) { sets.push('status = ?'); values.push(status) }
    if (password) {
      sets.push('password = ?')
      values.push(await bcrypt.hash(password, 10))
    }

    if (sets.length === 0) {
      res.json(failed('没有需要更新的字段'))
      return
    }

    values.push(id)
    db.prepare(`UPDATE za_admin SET ${sets.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare(
      'SELECT id, username, icon, email, nick_name AS nickName, note, create_time AS createTime, login_time AS loginTime, status FROM za_admin WHERE id = ?',
    ).get(id)

    res.json(success(updated))
  }
  catch (e: any) {
    res.json(failed(e.message || '更新管理员失败'))
  }
})

router.post('/admin/delete/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = db.prepare('SELECT id FROM za_admin WHERE id = ?').get(id)
    if (!existing) {
      res.json(failed('管理员不存在'))
      return
    }

    db.prepare('DELETE FROM za_admin_role_relation WHERE admin_id = ?').run(id)
    db.prepare('DELETE FROM za_admin WHERE id = ?').run(id)

    res.json(success(null, '删除成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '删除管理员失败'))
  }
})

router.post('/admin/updateStatus/:id', (req, res) => {
  try {
    const id = Number(req.params.id)
    const status = Number(req.query.status)

    const existing = db.prepare('SELECT id FROM za_admin WHERE id = ?').get(id)
    if (!existing) {
      res.json(failed('管理员不存在'))
      return
    }

    db.prepare('UPDATE za_admin SET status = ? WHERE id = ?').run(status, id)
    res.json(success(null, '状态更新成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '更新状态失败'))
  }
})

router.post('/admin/role/update', (req, res) => {
  try {
    const adminId = Number(req.query.adminId)
    const roleIdsStr = (req.query.roleIds as string) || ''

    if (!adminId) {
      res.json(failed('adminId 不能为空'))
      return
    }

    db.prepare('DELETE FROM za_admin_role_relation WHERE admin_id = ?').run(adminId)

    if (roleIdsStr) {
      const roleIds = roleIdsStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
      if (roleIds.length > 0) {
        const stmt = db.prepare('INSERT INTO za_admin_role_relation (admin_id, role_id) VALUES (?, ?)')
        for (const roleId of roleIds) stmt.run(adminId, roleId)
      }
    }

    res.json(success(null, '角色分配成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '角色分配失败'))
  }
})

router.get('/admin/role/:adminId', (req, res) => {
  try {
    const adminId = Number(req.params.adminId)

    const relations = db.prepare('SELECT role_id FROM za_admin_role_relation WHERE admin_id = ?').all(adminId) as any[]
    const roleIds = relations.map((r: any) => r.role_id)

    if (roleIds.length === 0) {
      res.json(success([]))
      return
    }

    const placeholders = roleIds.map(() => '?').join(',')
    const roles = db.prepare(`SELECT * FROM za_role WHERE id IN (${placeholders})`).all(...roleIds)

    res.json(success(roles))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取管理员角色失败'))
  }
})

export default router
