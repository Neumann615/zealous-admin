import { Hono } from 'hono'
import { eq, like, sql, inArray } from 'drizzle-orm'
import { db } from '../db'
import { umsRole, umsRoleMenuRelation, umsRoleResourceRelation, umsMenu, umsResource } from '../db/schema'
import { success, failed } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = new Hono()

// All routes protected
router.use('/role/*', authMiddleware)

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** POST /role/create */
router.post('/role/create', async (c) => {
  try {
    const body = await c.req.json()
    const { name, description, status, sort } = body

    if (!name) {
      return c.json(failed('角色名称不能为空'))
    }

    const now = new Date()

    const insertResult = await db
      .insert(umsRole)
      .values({
        name,
        description: description || null,
        status: status !== undefined ? status : 1,
        sort: sort !== undefined ? sort : 0,
        adminCount: 0,
        createTime: now,
      })

    // mysql2 驱动的 insert 返回 [ResultSetHeader, ...] 元组
    const insertId = Number(insertResult[0].insertId)

    const [role] = await db
      .select()
      .from(umsRole)
      .where(eq(umsRole.id, insertId))

    return c.json(success(role, '创建成功'))
  } catch (e: any) {
    return c.json(failed(e.message || '创建角色失败'))
  }
})

/** POST /role/update/:id */
router.post('/role/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const { name, description, status, sort } = body

    const existing = await db
      .select()
      .from(umsRole)
      .where(eq(umsRole.id, id))
      .limit(1)

    if (existing.length === 0) {
      return c.json(failed('角色不存在'))
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (sort !== undefined) updateData.sort = sort

    if (Object.keys(updateData).length === 0) {
      return c.json(failed('没有需要更新的字段'))
    }

    await db.update(umsRole).set(updateData).where(eq(umsRole.id, id))

    const updated = await db
      .select()
      .from(umsRole)
      .where(eq(umsRole.id, id))
      .limit(1)

    return c.json(success(updated[0], '更新成功'))
  } catch (e: any) {
    return c.json(failed(e.message || '更新角色失败'))
  }
})

/** POST /role/delete — query: ids (comma-separated), batch delete */
router.post('/role/delete', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''

    if (!idsStr) {
      return c.json(failed('ids 不能为空'))
    }

    const ids = idsStr
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0)

    if (ids.length === 0) {
      return c.json(failed('没有有效的 ID'))
    }

    // 批量删除角色关联
    await db.delete(umsRoleMenuRelation).where(inArray(umsRoleMenuRelation.roleId, ids))
    await db.delete(umsRoleResourceRelation).where(inArray(umsRoleResourceRelation.roleId, ids))

    // 批量删除角色
    await db.delete(umsRole).where(inArray(umsRole.id, ids))

    return c.json(success(null, '删除成功'))
  } catch (e: any) {
    return c.json(failed(e.message || '删除角色失败'))
  }
})

/** GET /role/listAll — 返回所有角色 */
router.get('/role/listAll', async (c) => {
  try {
    const roles = await db
      .select()
      .from(umsRole)
      .orderBy(umsRole.sort)

    return c.json(success(roles))
  } catch (e: any) {
    return c.json(failed(e.message || '获取角色列表失败'))
  }
})

/** GET /role/list — 分页搜索 */
router.get('/role/list', async (c) => {
  try {
    const keyword = c.req.query('keyword') || ''
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    let whereClause: ReturnType<typeof sql> | undefined

    if (keyword) {
      whereClause = sql`${umsRole.name} LIKE ${'%' + keyword + '%'}`
    }

    // 总数
    const countResult = whereClause
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(umsRole)
          .where(whereClause)
      : await db.select({ count: sql<number>`count(*)` }).from(umsRole)

    const total = Number(countResult[0].count)

    // 分页
    const roles = whereClause
      ? await db
          .select()
          .from(umsRole)
          .where(whereClause)
          .orderBy(umsRole.sort)
          .limit(pageSize)
          .offset(offset)
      : await db
          .select()
          .from(umsRole)
          .orderBy(umsRole.sort)
          .limit(pageSize)
          .offset(offset)

    return c.json(
      success({
        list: roles,
        total,
        pageSize,
        pageNum,
      }),
    )
  } catch (e: any) {
    return c.json(failed(e.message || '获取角色列表失败'))
  }
})

/** POST /role/updateStatus/:id — query: status */
router.post('/role/updateStatus/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const status = Number(c.req.query('status'))

    const existing = await db
      .select()
      .from(umsRole)
      .where(eq(umsRole.id, id))
      .limit(1)

    if (existing.length === 0) {
      return c.json(failed('角色不存在'))
    }

    await db.update(umsRole).set({ status }).where(eq(umsRole.id, id))

    return c.json(success(null, '状态更新成功'))
  } catch (e: any) {
    return c.json(failed(e.message || '更新状态失败'))
  }
})

/** GET /role/listMenu/:roleId — 返回角色已分配的菜单 */
router.get('/role/listMenu/:roleId', async (c) => {
  try {
    const roleId = Number(c.req.param('roleId'))

    const relations = await db
      .select()
      .from(umsRoleMenuRelation)
      .where(eq(umsRoleMenuRelation.roleId, roleId))

    const menuIds = relations.map((r) => r.menuId)

    if (menuIds.length === 0) {
      return c.json(success([]))
    }

    const menus = await db
      .select()
      .from(umsMenu)
      .where(inArray(umsMenu.id, menuIds))
      .orderBy(umsMenu.sort)

    return c.json(success(menus))
  } catch (e: any) {
    return c.json(failed(e.message || '获取角色菜单失败'))
  }
})

/** GET /role/listResource/:roleId — 返回角色已分配的资源 */
router.get('/role/listResource/:roleId', async (c) => {
  try {
    const roleId = Number(c.req.param('roleId'))

    const relations = await db
      .select()
      .from(umsRoleResourceRelation)
      .where(eq(umsRoleResourceRelation.roleId, roleId))

    const resourceIds = relations.map((r) => r.resourceId)

    if (resourceIds.length === 0) {
      return c.json(success([]))
    }

    const resources = await db
      .select()
      .from(umsResource)
      .where(inArray(umsResource.id, resourceIds))

    return c.json(success(resources))
  } catch (e: any) {
    return c.json(failed(e.message || '获取角色资源失败'))
  }
})

/** POST /role/allocMenu — query: roleId, menuIds (comma-separated) */
router.post('/role/allocMenu', async (c) => {
  try {
    const roleId = Number(c.req.query('roleId'))
    const menuIdsStr = c.req.query('menuIds') || ''

    if (!roleId) {
      return c.json(failed('roleId 不能为空'))
    }

    // 删除旧关联
    await db
      .delete(umsRoleMenuRelation)
      .where(eq(umsRoleMenuRelation.roleId, roleId))

    // 插入新关联
    if (menuIdsStr) {
      const menuIds = menuIdsStr
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0)

      if (menuIds.length > 0) {
        await db.insert(umsRoleMenuRelation).values(
          menuIds.map((menuId) => ({
            roleId,
            menuId,
          })),
        )
      }
    }

    return c.json(success(null, '菜单分配成功'))
  } catch (e: any) {
    return c.json(failed(e.message || '菜单分配失败'))
  }
})

/** POST /role/allocResource — query: roleId, resourceIds (comma-separated) */
router.post('/role/allocResource', async (c) => {
  try {
    const roleId = Number(c.req.query('roleId'))
    const resourceIdsStr = c.req.query('resourceIds') || ''

    if (!roleId) {
      return c.json(failed('roleId 不能为空'))
    }

    // 删除旧关联
    await db
      .delete(umsRoleResourceRelation)
      .where(eq(umsRoleResourceRelation.roleId, roleId))

    // 插入新关联
    if (resourceIdsStr) {
      const resourceIds = resourceIdsStr
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0)

      if (resourceIds.length > 0) {
        await db.insert(umsRoleResourceRelation).values(
          resourceIds.map((resourceId) => ({
            roleId,
            resourceId,
          })),
        )
      }
    }

    return c.json(success(null, '资源分配成功'))
  } catch (e: any) {
    return c.json(failed(e.message || '资源分配失败'))
  }
})

export default router
