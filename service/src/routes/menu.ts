import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { db } from '../db'
import { umsMenu } from '../db/schema'
import { success, failed } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = new Hono()

// All routes protected
router.use('/menu/*', authMiddleware)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 将扁平菜单数组转换为树形结构 (parentId = 0 为根) */
function buildMenuTree(menus: (typeof umsMenu.$inferSelect)[]): any[] {
  const map = new Map<number, any>()
  const tree: any[] = []

  for (const menu of menus) {
    map.set(menu.id, { ...menu, children: [] })
  }

  for (const menu of menus) {
    const node = map.get(menu.id)!
    if (menu.parentId === 0) {
      tree.push(node)
    } else {
      const parent = map.get(menu.parentId)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  return tree
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** POST /menu/create */
router.post('/menu/create', async (c) => {
  try {
    const body = await c.req.json()
    const { title, parentId, level, sort, name, icon, hidden } = body

    if (!title) {
      return c.json(failed('菜单标题不能为空'))
    }

    const now = new Date()

    const insertResult = await db
      .insert(umsMenu)
      .values({
        title,
        parentId: parentId !== undefined ? parentId : 0,
        level: level !== undefined ? level : 0,
        sort: sort !== undefined ? sort : 0,
        name: name || null,
        icon: icon || null,
        hidden: hidden !== undefined ? hidden : 0,
        createTime: now,
      })

    // mysql2 驱动的 insert 返回 [ResultSetHeader, ...] 元组
    const insertId = Number(insertResult[0].insertId)

    const [menu] = await db
      .select()
      .from(umsMenu)
      .where(eq(umsMenu.id, insertId))

    return c.json(success(menu, '创建成功'))
  } catch (e: any) {
    return c.json(failed(e.message || '创建菜单失败'))
  }
})

/** POST /menu/update/:id */
router.post('/menu/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const { title, parentId, level, sort, name, icon, hidden } = body

    const existing = await db
      .select()
      .from(umsMenu)
      .where(eq(umsMenu.id, id))
      .limit(1)

    if (existing.length === 0) {
      return c.json(failed('菜单不存在'))
    }

    const updateData: Record<string, any> = {}
    if (title !== undefined) updateData.title = title
    if (parentId !== undefined) updateData.parentId = parentId
    if (level !== undefined) updateData.level = level
    if (sort !== undefined) updateData.sort = sort
    if (name !== undefined) updateData.name = name
    if (icon !== undefined) updateData.icon = icon
    if (hidden !== undefined) updateData.hidden = hidden

    if (Object.keys(updateData).length === 0) {
      return c.json(failed('没有需要更新的字段'))
    }

    await db.update(umsMenu).set(updateData).where(eq(umsMenu.id, id))

    const updated = await db
      .select()
      .from(umsMenu)
      .where(eq(umsMenu.id, id))
      .limit(1)

    return c.json(success(updated[0], '更新成功'))
  } catch (e: any) {
    return c.json(failed(e.message || '更新菜单失败'))
  }
})

/** POST /menu/delete/:id */
router.post('/menu/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))

    const existing = await db
      .select()
      .from(umsMenu)
      .where(eq(umsMenu.id, id))
      .limit(1)

    if (existing.length === 0) {
      return c.json(failed('菜单不存在'))
    }

    await db.delete(umsMenu).where(eq(umsMenu.id, id))

    return c.json(success(null, '删除成功'))
  } catch (e: any) {
    return c.json(failed(e.message || '删除菜单失败'))
  }
})

/** GET /menu/list/:parentId — 分页按父级查询 */
router.get('/menu/list/:parentId', async (c) => {
  try {
    const parentId = Number(c.req.param('parentId'))
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    // 总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(umsMenu)
      .where(eq(umsMenu.parentId, parentId))

    const total = Number(countResult[0].count)

    // 分页
    const menus = await db
      .select()
      .from(umsMenu)
      .where(eq(umsMenu.parentId, parentId))
      .orderBy(umsMenu.sort)
      .limit(pageSize)
      .offset(offset)

    return c.json(
      success({
        list: menus,
        total,
        pageSize,
        pageNum,
      }),
    )
  } catch (e: any) {
    return c.json(failed(e.message || '获取菜单列表失败'))
  }
})

/** GET /menu/treeList — 返回所有菜单的树形结构 */
router.get('/menu/treeList', async (c) => {
  try {
    const menus = await db
      .select()
      .from(umsMenu)
      .orderBy(umsMenu.sort)

    const tree = buildMenuTree(menus)

    return c.json(success(tree))
  } catch (e: any) {
    return c.json(failed(e.message || '获取菜单树失败'))
  }
})

/** GET /menu/:id — 必须放在 /treeList 后面避免被 :id 匹配 */
router.get('/menu/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))

    const rows = await db
      .select()
      .from(umsMenu)
      .where(eq(umsMenu.id, id))
      .limit(1)

    if (rows.length === 0) {
      return c.json(failed('菜单不存在'))
    }

    return c.json(success(rows[0]))
  } catch (e: any) {
    return c.json(failed(e.message || '获取菜单失败'))
  }
})

/** POST /menu/updateHidden/:id — query: hidden */
router.post('/menu/updateHidden/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const hidden = Number(c.req.query('hidden'))

    const existing = await db
      .select()
      .from(umsMenu)
      .where(eq(umsMenu.id, id))
      .limit(1)

    if (existing.length === 0) {
      return c.json(failed('菜单不存在'))
    }

    await db.update(umsMenu).set({ hidden }).where(eq(umsMenu.id, id))

    return c.json(success(null, '隐藏状态更新成功'))
  } catch (e: any) {
    return c.json(failed(e.message || '更新隐藏状态失败'))
  }
})

export default router
