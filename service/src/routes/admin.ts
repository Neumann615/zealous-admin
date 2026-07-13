import bcrypt from 'bcryptjs'
import { eq, inArray, like, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db'
import { umsAdmin, umsAdminRoleRelation, umsMenu, umsRole, umsRoleMenuRelation } from '../db/schema'
import { signToken } from '../lib/jwt'
import { failed, success, unauthorized } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = new Hono()

// ---------------------------------------------------------------------------
// Public — 登录, 不受 authMiddleware 保护, 必须放在 .use() 之前
// ---------------------------------------------------------------------------

/** POST /admin/login */
router.post('/admin/login', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password } = body

    if (!username || !password) {
      return c.json(failed('用户名或密码不能为空'))
    }

    const rows = await db
      .select()
      .from(umsAdmin)
      .where(eq(umsAdmin.username, username))
      .limit(1)

    if (rows.length === 0) {
      return c.json(failed('用户名或密码错误'))
    }

    const admin = rows[0]
    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) {
      return c.json(failed('用户名或密码错误'))
    }

    // 更新登录时间
    await db
      .update(umsAdmin)
      .set({ loginTime: new Date() })
      .where(eq(umsAdmin.id, admin.id))

    const token = await signToken({ sub: admin.username })
    return c.json(success({ tokenHead: 'Bearer ', token }))
  }
  catch (e: any) {
    return c.json(failed(e.message || '登录失败'))
  }
})

// ---------------------------------------------------------------------------
// Protected — 之后所有路由都需要 authMiddleware
// ---------------------------------------------------------------------------
router.use('/admin/*', authMiddleware)

/** POST /admin/register */
router.post('/admin/register', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password, icon, email, nickName, note } = body

    if (!username || !password) {
      return c.json(failed('用户名和密码不能为空'))
    }

    // 检查用户名是否已存在
    const existing = await db
      .select()
      .from(umsAdmin)
      .where(eq(umsAdmin.username, username))
      .limit(1)

    if (existing.length > 0) {
      return c.json(failed('用户名已存在'))
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const now = new Date()

    const insertResult = await db
      .insert(umsAdmin)
      .values({
        username,
        password: hashedPassword,
        icon: icon || null,
        email: email || null,
        nickName: nickName || null,
        note: note || null,
        createTime: now,
        loginTime: null as any,
        status: 1,
      })

    // mysql2 驱动的 insert 返回 [ResultSetHeader, ...] 元组
    const insertId = Number(insertResult[0].insertId)

    const [admin] = await db
      .select()
      .from(umsAdmin)
      .where(eq(umsAdmin.id, insertId))
    // 不返回 password
    const { password: _, ...result } = admin
    return c.json(success(result))
  }
  catch (e: any) {
    return c.json(failed(e.message || '注册失败'))
  }
})

/** GET /admin/refreshToken */
router.get('/admin/refreshToken', async (c) => {
  try {
    const username = c.get('username') as string
    const token = await signToken({ sub: username })
    return c.json(success({ tokenHead: 'Bearer ', token }))
  }
  catch (e: any) {
    return c.json(failed(e.message || '刷新 Token 失败'))
  }
})

/** GET /admin/info */
router.get('/admin/info', async (c) => {
  try {
    const username = c.get('username') as string

    const adminRows = await db
      .select()
      .from(umsAdmin)
      .where(eq(umsAdmin.username, username))
      .limit(1)

    if (adminRows.length === 0) {
      return c.json(failed('用户不存在'))
    }

    const admin = adminRows[0]

    // 查询该管理员拥有的角色
    const roleRelations = await db
      .select()
      .from(umsAdminRoleRelation)
      .where(eq(umsAdminRoleRelation.adminId, admin.id))

    const roleIds = roleRelations.map(r => r.roleId)
    let roles: string[] = []
    let menus: any[] = []

    if (roleIds.length > 0) {
      // 角色名称列表
      const roleRecords = await db
        .select()
        .from(umsRole)
        .where(inArray(umsRole.id, roleIds))

      roles = roleRecords.map(r => r.name)

      // 角色对应菜单
      const menuRelations = await db
        .select()
        .from(umsRoleMenuRelation)
        .where(inArray(umsRoleMenuRelation.roleId, roleIds))

      const menuIds = [...new Set(menuRelations.map(m => m.menuId))]

      if (menuIds.length > 0) {
        const menuRecords = await db
          .select()
          .from(umsMenu)
          .where(inArray(umsMenu.id, menuIds))
          .orderBy(umsMenu.sort)

        menus = menuRecords
      }
    }

    const { password: _, ...adminInfo } = admin
    return c.json(
      success({
        ...adminInfo,
        menus,
        roles,
      }),
    )
  }
  catch (e: any) {
    return c.json(failed(e.message || '获取用户信息失败'))
  }
})

/** POST /admin/logout */
router.post('/admin/logout', async (c) => {
  return c.json(success(null, '登出成功'))
})

/** GET /admin/list */
router.get('/admin/list', async (c) => {
  try {
    const keyword = c.req.query('keyword') || ''
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    let whereClause: ReturnType<typeof sql> | undefined

    if (keyword) {
      whereClause = sql`(${umsAdmin.username} LIKE ${`%${keyword}%`} OR ${umsAdmin.nickName} LIKE ${`%${keyword}%`})`
    }

    // 总数
    const countResult = whereClause
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(umsAdmin)
          .where(whereClause)
      : await db.select({ count: sql<number>`count(*)` }).from(umsAdmin)

    const total = Number(countResult[0].count)

    // 分页数据 (排除 password 字段)
    const admins = whereClause
      ? await db
          .select({
            id: umsAdmin.id,
            username: umsAdmin.username,
            icon: umsAdmin.icon,
            email: umsAdmin.email,
            nickName: umsAdmin.nickName,
            note: umsAdmin.note,
            createTime: umsAdmin.createTime,
            loginTime: umsAdmin.loginTime,
            status: umsAdmin.status,
          })
          .from(umsAdmin)
          .where(whereClause)
          .limit(pageSize)
          .offset(offset)
      : await db
          .select({
            id: umsAdmin.id,
            username: umsAdmin.username,
            icon: umsAdmin.icon,
            email: umsAdmin.email,
            nickName: umsAdmin.nickName,
            note: umsAdmin.note,
            createTime: umsAdmin.createTime,
            loginTime: umsAdmin.loginTime,
            status: umsAdmin.status,
          })
          .from(umsAdmin)
          .limit(pageSize)
          .offset(offset)

    return c.json(
      success({
        list: admins,
        total,
        pageSize,
        pageNum,
      }),
    )
  }
  catch (e: any) {
    return c.json(failed(e.message || '获取管理员列表失败'))
  }
})

/** GET /admin/:id */
router.get('/admin/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))

    const rows = await db
      .select({
        id: umsAdmin.id,
        username: umsAdmin.username,
        icon: umsAdmin.icon,
        email: umsAdmin.email,
        nickName: umsAdmin.nickName,
        note: umsAdmin.note,
        createTime: umsAdmin.createTime,
        loginTime: umsAdmin.loginTime,
        status: umsAdmin.status,
      })
      .from(umsAdmin)
      .where(eq(umsAdmin.id, id))
      .limit(1)

    if (rows.length === 0) {
      return c.json(failed('管理员不存在'))
    }

    return c.json(success(rows[0]))
  }
  catch (e: any) {
    return c.json(failed(e.message || '获取管理员失败'))
  }
})

/** POST /admin/updatePassword — 必须放在 /admin/update/:id 前面避免被 :id 匹配 */
router.post('/admin/updatePassword', async (c) => {
  try {
    const body = await c.req.json()
    const { username, oldPassword, newPassword } = body

    if (!username || !oldPassword || !newPassword) {
      return c.json({ code: -1, message: '参数不合法', data: null })
    }

    const rows = await db
      .select()
      .from(umsAdmin)
      .where(eq(umsAdmin.username, username))
      .limit(1)

    if (rows.length === 0) {
      return c.json({ code: -2, message: '用户不存在', data: null })
    }

    const admin = rows[0]

    const valid = await bcrypt.compare(oldPassword, admin.password)
    if (!valid) {
      return c.json({ code: -3, message: '旧密码错误', data: null })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await db
      .update(umsAdmin)
      .set({ password: hashedPassword })
      .where(eq(umsAdmin.id, admin.id))

    return c.json({ code: 1, message: '密码修改成功', data: null })
  }
  catch (e: any) {
    return c.json({ code: -1, message: e.message || '密码修改失败', data: null })
  }
})

/** POST /admin/update/:id — 必须放在 /admin/updatePassword 后面 */
router.post('/admin/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const { username, password, icon, email, nickName, note, status } = body

    // 检查管理员是否存在
    const existing = await db
      .select()
      .from(umsAdmin)
      .where(eq(umsAdmin.id, id))
      .limit(1)

    if (existing.length === 0) {
      return c.json(failed('管理员不存在'))
    }

    // 如果要修改用户名，检查是否与其他人冲突
    if (username) {
      const conflict = await db
        .select()
        .from(umsAdmin)
        .where(eq(umsAdmin.username, username))
        .limit(1)

      if (conflict.length > 0 && conflict[0].id !== id) {
        return c.json(failed('用户名已被占用'))
      }
    }

    const updateData: Record<string, any> = {}
    if (username !== undefined)
      updateData.username = username
    if (icon !== undefined)
      updateData.icon = icon
    if (email !== undefined)
      updateData.email = email
    if (nickName !== undefined)
      updateData.nickName = nickName
    if (note !== undefined)
      updateData.note = note
    if (status !== undefined)
      updateData.status = status

    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    if (Object.keys(updateData).length === 0) {
      return c.json(failed('没有需要更新的字段'))
    }

    await db
      .update(umsAdmin)
      .set(updateData)
      .where(eq(umsAdmin.id, id))

    // 返回更新后的数据
    const updated = await db
      .select({
        id: umsAdmin.id,
        username: umsAdmin.username,
        icon: umsAdmin.icon,
        email: umsAdmin.email,
        nickName: umsAdmin.nickName,
        note: umsAdmin.note,
        createTime: umsAdmin.createTime,
        loginTime: umsAdmin.loginTime,
        status: umsAdmin.status,
      })
      .from(umsAdmin)
      .where(eq(umsAdmin.id, id))
      .limit(1)

    return c.json(success(updated[0]))
  }
  catch (e: any) {
    return c.json(failed(e.message || '更新管理员失败'))
  }
})

/** POST /admin/delete/:id */
router.post('/admin/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))

    const existing = await db
      .select()
      .from(umsAdmin)
      .where(eq(umsAdmin.id, id))
      .limit(1)

    if (existing.length === 0) {
      return c.json(failed('管理员不存在'))
    }

    // 同时删除该管理员的角色关联
    await db
      .delete(umsAdminRoleRelation)
      .where(eq(umsAdminRoleRelation.adminId, id))

    await db.delete(umsAdmin).where(eq(umsAdmin.id, id))

    return c.json(success(null, '删除成功'))
  }
  catch (e: any) {
    return c.json(failed(e.message || '删除管理员失败'))
  }
})

/** POST /admin/updateStatus/:id — query param: status */
router.post('/admin/updateStatus/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const status = Number(c.req.query('status'))

    const existing = await db
      .select()
      .from(umsAdmin)
      .where(eq(umsAdmin.id, id))
      .limit(1)

    if (existing.length === 0) {
      return c.json(failed('管理员不存在'))
    }

    await db.update(umsAdmin).set({ status }).where(eq(umsAdmin.id, id))

    return c.json(success(null, '状态更新成功'))
  }
  catch (e: any) {
    return c.json(failed(e.message || '更新状态失败'))
  }
})

/** POST /admin/role/update — query: adminId, roleIds (comma-separated) */
router.post('/admin/role/update', async (c) => {
  try {
    const adminId = Number(c.req.query('adminId'))
    const roleIdsStr = c.req.query('roleIds') || ''

    if (!adminId) {
      return c.json(failed('adminId 不能为空'))
    }

    // 删除旧的关联
    await db
      .delete(umsAdminRoleRelation)
      .where(eq(umsAdminRoleRelation.adminId, adminId))

    // 插入新的关联
    if (roleIdsStr) {
      const roleIds = roleIdsStr
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => !isNaN(n) && n > 0)

      if (roleIds.length > 0) {
        await db.insert(umsAdminRoleRelation).values(
          roleIds.map(roleId => ({
            adminId,
            roleId,
          })),
        )
      }
    }

    return c.json(success(null, '角色分配成功'))
  }
  catch (e: any) {
    return c.json(failed(e.message || '角色分配失败'))
  }
})

/** GET /admin/role/:adminId — 返回管理员已分配的角色列表 */
router.get('/admin/role/:adminId', async (c) => {
  try {
    const adminId = Number(c.req.param('adminId'))

    const relations = await db
      .select()
      .from(umsAdminRoleRelation)
      .where(eq(umsAdminRoleRelation.adminId, adminId))

    const roleIds = relations.map(r => r.roleId)

    if (roleIds.length === 0) {
      return c.json(success([]))
    }

    const roles = await db
      .select()
      .from(umsRole)
      .where(inArray(umsRole.id, roleIds))

    return c.json(success(roles))
  }
  catch (e: any) {
    return c.json(failed(e.message || '获取管理员角色失败'))
  }
})

export default router
