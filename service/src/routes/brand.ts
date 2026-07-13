import { Hono } from 'hono'
import { eq, like, sql, inArray, and } from 'drizzle-orm'
import { db } from '../db'
import { pmsBrand } from '../db/schema'
import { success, failed } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = new Hono()

// All routes use authMiddleware
router.use('*', authMiddleware)

// 1. GET /brand/listAll — return all brands
router.get('/brand/listAll', async (c) => {
  try {
    const list = await db.select().from(pmsBrand)
    return c.json(success(list))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询品牌列表失败'))
  }
})

// 2. POST /brand/create — body: {name, firstLetter, sort, factoryStatus, showStatus, logo, bigPic, brandStory}
router.post('/brand/create', async (c) => {
  try {
    const body = await c.req.json()
    await db.insert(pmsBrand).values({
      name: body.name,
      firstLetter: body.firstLetter,
      sort: body.sort,
      factoryStatus: body.factoryStatus,
      showStatus: body.showStatus,
      logo: body.logo,
      bigPic: body.bigPic,
      brandStory: body.brandStory,
    })
    return c.json(success(null, '创建品牌成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建品牌失败'))
  }
})

// 3. POST /brand/update/showStatus — 必须放在 /update/:id 前面避免被 :id 匹配
router.post('/brand/update/showStatus', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const showStatus = Number(c.req.query('showStatus'))
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.update(pmsBrand).set({ showStatus }).where(inArray(pmsBrand.id, ids))
    return c.json(success(null, '批量更新显示状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量更新显示状态失败'))
  }
})

// 4. POST /brand/update/factoryStatus — 必须放在 /update/:id 前面避免被 :id 匹配
router.post('/brand/update/factoryStatus', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const factoryStatus = Number(c.req.query('factoryStatus'))
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.update(pmsBrand).set({ factoryStatus }).where(inArray(pmsBrand.id, ids))
    return c.json(success(null, '批量更新厂家状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量更新厂家状态失败'))
  }
})

// 5. POST /brand/update/:id — 必须放在 showStatus/factoryStatus 后面
router.post('/brand/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(pmsBrand).set({
      name: body.name,
      firstLetter: body.firstLetter,
      sort: body.sort,
      factoryStatus: body.factoryStatus,
      showStatus: body.showStatus,
      logo: body.logo,
      bigPic: body.bigPic,
      brandStory: body.brandStory,
    }).where(eq(pmsBrand.id, id))
    return c.json(success(null, '更新品牌成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新品牌失败'))
  }
})

// 6. GET /brand/delete/:id — delete brand
router.get('/brand/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    await db.delete(pmsBrand).where(eq(pmsBrand.id, id))
    return c.json(success(null, '删除品牌成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除品牌失败'))
  }
})

// 7. GET /brand/list — query: keyword, showStatus, pageSize(5), pageNum(1)
router.get('/brand/list', async (c) => {
  try {
    const keyword = c.req.query('keyword') || ''
    const showStatus = c.req.query('showStatus')
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (keyword) {
      conditions.push(like(pmsBrand.name, '%' + keyword + '%'))
    }
    if (showStatus !== undefined && showStatus !== '') {
      conditions.push(eq(pmsBrand.showStatus, Number(showStatus)))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(pmsBrand)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(pmsBrand)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询品牌列表失败'))
  }
})

// 8. GET /brand/:id — get brand by id (必须放在 /brand/list 后面)
router.get('/brand/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const result = await db.select().from(pmsBrand).where(eq(pmsBrand.id, id)).limit(1)
    if (result.length === 0) {
      return c.json(failed('品牌不存在'))
    }
    return c.json(success(result[0]))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询品牌失败'))
  }
})

// 9. POST /brand/delete/batch — query: ids (comma-separated string)
router.post('/brand/delete/batch', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.delete(pmsBrand).where(inArray(pmsBrand.id, ids))
    return c.json(success(null, '批量删除品牌成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量删除品牌失败'))
  }
})

export default router
