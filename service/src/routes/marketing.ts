import { Hono } from 'hono'
import { eq, like, sql, inArray, and } from 'drizzle-orm'
import { db } from '../db'
import {
  smsCoupon,
  smsCouponHistory,
  smsCouponProductRelation,
  smsCouponProductCategoryRelation,
  smsFlashPromotion,
  smsFlashPromotionSession,
  smsFlashPromotionProductRelation,
  smsHomeAdvertise,
  smsHomeBrand,
  smsHomeNewProduct,
  smsHomeRecommendProduct,
  smsHomeRecommendSubject,
  cmsSubject,
  cmsPrefrenceArea,
  umsResource,
  umsResourceCategory,
  umsMemberLevel,
  pmsProduct,
} from '../db/schema'
import { success, failed } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = new Hono()

// All routes use authMiddleware
router.use('*', authMiddleware)

// ==================== Coupon ====================

// 1. GET /coupon/list — query: name?, type?, pageSize(5), pageNum(1)
router.get('/coupon/list', async (c) => {
  try {
    const name = c.req.query('name') || ''
    const type = c.req.query('type')
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (name) {
      conditions.push(like(smsCoupon.name, '%' + name + '%'))
    }
    if (type !== undefined && type !== '') {
      conditions.push(eq(smsCoupon.type, Number(type)))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(smsCoupon)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(smsCoupon)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询优惠券列表失败'))
  }
})

// 2. POST /coupon/create — body: {type, name, platform, count, amount, perLimit, minPoint?, startTime?, endTime?, useType, note?, memberLevel?, productRelationList?, productCategoryRelationList?}
router.post('/coupon/create', async (c) => {
  try {
    const body = await c.req.json()
    const [result] = await db.insert(smsCoupon).values({
      type: body.type,
      name: body.name,
      platform: body.platform,
      count: body.count,
      amount: body.amount,
      perLimit: body.perLimit,
      minPoint: body.minPoint,
      startTime: body.startTime,
      endTime: body.endTime,
      useType: body.useType,
      note: body.note,
      memberLevel: body.memberLevel,
    }).returning({ id: smsCoupon.id })

    const couponId = result.id

    if (body.productRelationList && Array.isArray(body.productRelationList) && body.productRelationList.length > 0) {
      const productValues = body.productRelationList.map((item: any) => ({
        couponId,
        productId: item.productId,
        productName: item.productName,
        productSn: item.productSn,
      }))
      await db.insert(smsCouponProductRelation).values(productValues)
    }

    if (body.productCategoryRelationList && Array.isArray(body.productCategoryRelationList) && body.productCategoryRelationList.length > 0) {
      const categoryValues = body.productCategoryRelationList.map((item: any) => ({
        couponId,
        productCategoryId: item.productCategoryId,
        productCategoryName: item.productCategoryName,
        parentCategoryName: item.parentCategoryName,
      }))
      await db.insert(smsCouponProductCategoryRelation).values(categoryValues)
    }

    return c.json(success(null, '创建优惠券成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建优惠券失败'))
  }
})

// 3. GET /coupon/:id — Get coupon + product relations + category relations
router.get('/coupon/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const couponResult = await db.select().from(smsCoupon).where(eq(smsCoupon.id, id)).limit(1)
    if (couponResult.length === 0) {
      return c.json(failed('优惠券不存在'))
    }
    const coupon = couponResult[0]

    const productRelationList = await db.select().from(smsCouponProductRelation)
      .where(eq(smsCouponProductRelation.couponId, id))

    const productCategoryRelationList = await db.select().from(smsCouponProductCategoryRelation)
      .where(eq(smsCouponProductCategoryRelation.couponId, id))

    return c.json(success({ ...coupon, productRelationList, productCategoryRelationList }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询优惠券详情失败'))
  }
})

// 4. POST /coupon/update/:id — Update coupon (similar to create)
router.post('/coupon/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()

    await db.update(smsCoupon).set({
      type: body.type,
      name: body.name,
      platform: body.platform,
      count: body.count,
      amount: body.amount,
      perLimit: body.perLimit,
      minPoint: body.minPoint,
      startTime: body.startTime,
      endTime: body.endTime,
      useType: body.useType,
      note: body.note,
      memberLevel: body.memberLevel,
    }).where(eq(smsCoupon.id, id))

    await db.delete(smsCouponProductRelation).where(eq(smsCouponProductRelation.couponId, id))
    if (body.productRelationList && Array.isArray(body.productRelationList) && body.productRelationList.length > 0) {
      const productValues = body.productRelationList.map((item: any) => ({
        couponId: id,
        productId: item.productId,
        productName: item.productName,
        productSn: item.productSn,
      }))
      await db.insert(smsCouponProductRelation).values(productValues)
    }

    await db.delete(smsCouponProductCategoryRelation).where(eq(smsCouponProductCategoryRelation.couponId, id))
    if (body.productCategoryRelationList && Array.isArray(body.productCategoryRelationList) && body.productCategoryRelationList.length > 0) {
      const categoryValues = body.productCategoryRelationList.map((item: any) => ({
        couponId: id,
        productCategoryId: item.productCategoryId,
        productCategoryName: item.productCategoryName,
        parentCategoryName: item.parentCategoryName,
      }))
      await db.insert(smsCouponProductCategoryRelation).values(categoryValues)
    }

    return c.json(success(null, '更新优惠券成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新优惠券失败'))
  }
})

// 5. POST /coupon/delete/:id — Delete
router.post('/coupon/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    await db.delete(smsCouponProductRelation).where(eq(smsCouponProductRelation.couponId, id))
    await db.delete(smsCouponProductCategoryRelation).where(eq(smsCouponProductCategoryRelation.couponId, id))
    await db.delete(smsCoupon).where(eq(smsCoupon.id, id))
    return c.json(success(null, '删除优惠券成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除优惠券失败'))
  }
})

// 6. GET /couponHistory/list — query: couponId?, useStatus?, orderSn?, pageSize(5), pageNum(1)
router.get('/couponHistory/list', async (c) => {
  try {
    const couponId = c.req.query('couponId')
    const useStatus = c.req.query('useStatus')
    const orderSn = c.req.query('orderSn') || ''
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (couponId !== undefined && couponId !== '') {
      conditions.push(eq(smsCouponHistory.couponId, Number(couponId)))
    }
    if (useStatus !== undefined && useStatus !== '') {
      conditions.push(eq(smsCouponHistory.useStatus, Number(useStatus)))
    }
    if (orderSn) {
      conditions.push(like(smsCouponHistory.orderSn, '%' + orderSn + '%'))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(smsCouponHistory)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(smsCouponHistory)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询优惠券使用历史失败'))
  }
})

// ==================== Flash ====================

// 7. GET /flash/list — query: pageSize(5), pageNum(1)
router.get('/flash/list', async (c) => {
  try {
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const list = await db.select().from(smsFlashPromotion)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(smsFlashPromotion)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询限时购活动列表失败'))
  }
})

// 8. POST /flash/update/status/:id — query: status
router.post('/flash/update/status/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const status = Number(c.req.query('status'))
    await db.update(smsFlashPromotion).set({ status }).where(eq(smsFlashPromotion.id, id))
    return c.json(success(null, '更新限时购活动状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新限时购活动状态失败'))
  }
})

// 9. POST /flash/delete/:id — Delete
router.post('/flash/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    await db.delete(smsFlashPromotion).where(eq(smsFlashPromotion.id, id))
    return c.json(success(null, '删除限时购活动成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除限时购活动失败'))
  }
})

// 10. POST /flash/create — body: {title, startDate?, endDate?, status}
router.post('/flash/create', async (c) => {
  try {
    const body = await c.req.json()
    await db.insert(smsFlashPromotion).values({
      title: body.title,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
    })
    return c.json(success(null, '创建限时购活动成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建限时购活动失败'))
  }
})

// 11. POST /flash/update/:id — body like create
router.post('/flash/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(smsFlashPromotion).set({
      title: body.title,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
    }).where(eq(smsFlashPromotion.id, id))
    return c.json(success(null, '更新限时购活动成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新限时购活动失败'))
  }
})

// ==================== FlashSession ====================

// 12. GET /flashSession/selectList — query: flashPromotionId. Return all sessions with productCount
router.get('/flashSession/selectList', async (c) => {
  try {
    const flashPromotionId = Number(c.req.query('flashPromotionId'))

    const allSessions = await db.select().from(smsFlashPromotionSession)

    const sessionsWithCount = await Promise.all(
      allSessions.map(async (session) => {
        const countResult = await db.select({ count: sql<number>`count(*)` })
          .from(smsFlashPromotionProductRelation)
          .where(and(
            eq(smsFlashPromotionProductRelation.flashPromotionId, flashPromotionId),
            eq(smsFlashPromotionProductRelation.flashPromotionSessionId, session.id),
          ))
        return {
          ...session,
          productCount: Number(countResult[0]?.count) || 0,
        }
      })
    )

    return c.json(success(sessionsWithCount))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询秒杀场次列表失败'))
  }
})

// 13. GET /flashSession/list — All sessions
router.get('/flashSession/list', async (c) => {
  try {
    const list = await db.select().from(smsFlashPromotionSession)
    return c.json(success(list))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询秒杀场次列表失败'))
  }
})

// 14. POST /flashSession/update/status/:id — query: status
router.post('/flashSession/update/status/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const status = Number(c.req.query('status'))
    await db.update(smsFlashPromotionSession).set({ status }).where(eq(smsFlashPromotionSession.id, id))
    return c.json(success(null, '更新秒杀场次状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新秒杀场次状态失败'))
  }
})

// 15. POST /flashSession/delete/:id — Delete
router.post('/flashSession/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    await db.delete(smsFlashPromotionSession).where(eq(smsFlashPromotionSession.id, id))
    return c.json(success(null, '删除秒杀场次成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除秒杀场次失败'))
  }
})

// 16. POST /flashSession/create — body: {name, startTime?, endTime?, status}
router.post('/flashSession/create', async (c) => {
  try {
    const body = await c.req.json()
    await db.insert(smsFlashPromotionSession).values({
      name: body.name,
      startTime: body.startTime,
      endTime: body.endTime,
      status: body.status,
    })
    return c.json(success(null, '创建秒杀场次成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建秒杀场次失败'))
  }
})

// 17. POST /flashSession/update/:id — body like create
router.post('/flashSession/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(smsFlashPromotionSession).set({
      name: body.name,
      startTime: body.startTime,
      endTime: body.endTime,
      status: body.status,
    }).where(eq(smsFlashPromotionSession.id, id))
    return c.json(success(null, '更新秒杀场次成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新秒杀场次失败'))
  }
})

// ==================== FlashProductRelation ====================

// 18. GET /flashProductRelation/list — query: flashPromotionId?, flashPromotionSessionId?, pageSize(5), pageNum(1)
router.get('/flashProductRelation/list', async (c) => {
  try {
    const flashPromotionId = c.req.query('flashPromotionId')
    const flashPromotionSessionId = c.req.query('flashPromotionSessionId')
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (flashPromotionId !== undefined && flashPromotionId !== '') {
      conditions.push(eq(smsFlashPromotionProductRelation.flashPromotionId, Number(flashPromotionId)))
    }
    if (flashPromotionSessionId !== undefined && flashPromotionSessionId !== '') {
      conditions.push(eq(smsFlashPromotionProductRelation.flashPromotionSessionId, Number(flashPromotionSessionId)))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const relations = await db.select().from(smsFlashPromotionProductRelation)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(smsFlashPromotionProductRelation)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    // Enrich with product info
    const list = await Promise.all(
      relations.map(async (rel) => {
        const productResult = await db.select().from(pmsProduct)
          .where(eq(pmsProduct.id, rel.productId))
          .limit(1)
        return {
          ...rel,
          product: productResult[0] || null,
        }
      })
    )

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询秒杀商品关联列表失败'))
  }
})

// 19. POST /flashProductRelation/create — body: array of {flashPromotionId, flashPromotionSessionId, productId, flashPromotionPrice?, flashPromotionCount?, flashPromotionLimit?, sort?}
router.post('/flashProductRelation/create', async (c) => {
  try {
    const body = await c.req.json()
    const items: any[] = Array.isArray(body) ? body : []
    if (items.length > 0) {
      const values = items.map(item => ({
        flashPromotionId: item.flashPromotionId,
        flashPromotionSessionId: item.flashPromotionSessionId,
        productId: item.productId,
        flashPromotionPrice: item.flashPromotionPrice,
        flashPromotionCount: item.flashPromotionCount,
        flashPromotionLimit: item.flashPromotionLimit,
        sort: item.sort,
      }))
      await db.insert(smsFlashPromotionProductRelation).values(values)
    }
    return c.json(success(null, '创建秒杀商品关联成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建秒杀商品关联失败'))
  }
})

// 20. POST /flashProductRelation/delete/:id — Delete
router.post('/flashProductRelation/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    await db.delete(smsFlashPromotionProductRelation).where(eq(smsFlashPromotionProductRelation.id, id))
    return c.json(success(null, '删除秒杀商品关联成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除秒杀商品关联失败'))
  }
})

// 21. POST /flashProductRelation/update/:id — body: {flashPromotionPrice?, flashPromotionCount?, flashPromotionLimit?, sort?}
router.post('/flashProductRelation/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const setData: Record<string, any> = {}
    if (body.flashPromotionPrice !== undefined) setData.flashPromotionPrice = body.flashPromotionPrice
    if (body.flashPromotionCount !== undefined) setData.flashPromotionCount = body.flashPromotionCount
    if (body.flashPromotionLimit !== undefined) setData.flashPromotionLimit = body.flashPromotionLimit
    if (body.sort !== undefined) setData.sort = body.sort
    await db.update(smsFlashPromotionProductRelation).set(setData).where(eq(smsFlashPromotionProductRelation.id, id))
    return c.json(success(null, '更新秒杀商品关联成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新秒杀商品关联失败'))
  }
})

// ==================== HomeAdvertise ====================

// 22. GET /home/advertise/list — query: name?, type?, endTime?, pageSize(5), pageNum(1)
router.get('/home/advertise/list', async (c) => {
  try {
    const name = c.req.query('name') || ''
    const type = c.req.query('type')
    const endTime = c.req.query('endTime') || ''
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (name) {
      conditions.push(like(smsHomeAdvertise.name, '%' + name + '%'))
    }
    if (type !== undefined && type !== '') {
      conditions.push(eq(smsHomeAdvertise.type, Number(type)))
    }
    if (endTime) {
      conditions.push(like(smsHomeAdvertise.endTime, '%' + endTime + '%'))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(smsHomeAdvertise)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(smsHomeAdvertise)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询首页广告列表失败'))
  }
})

// 23. POST /home/advertise/update/status/:id — query: status
router.post('/home/advertise/update/status/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const status = Number(c.req.query('status'))
    await db.update(smsHomeAdvertise).set({ status }).where(eq(smsHomeAdvertise.id, id))
    return c.json(success(null, '更新广告状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新广告状态失败'))
  }
})

// 24. POST /home/advertise/delete — query: ids. Batch delete.
router.post('/home/advertise/delete', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.delete(smsHomeAdvertise).where(inArray(smsHomeAdvertise.id, ids))
    return c.json(success(null, '删除广告成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除广告失败'))
  }
})

// 25. POST /home/advertise/create — body: {name, type, pic?, startTime?, endTime?, status?, url?, note?, sort?}
router.post('/home/advertise/create', async (c) => {
  try {
    const body = await c.req.json()
    await db.insert(smsHomeAdvertise).values({
      name: body.name,
      type: body.type,
      pic: body.pic,
      startTime: body.startTime,
      endTime: body.endTime,
      status: body.status,
      url: body.url,
      note: body.note,
      sort: body.sort,
    })
    return c.json(success(null, '创建广告成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建广告失败'))
  }
})

// 26. GET /home/advertise/:id — Get
router.get('/home/advertise/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const result = await db.select().from(smsHomeAdvertise).where(eq(smsHomeAdvertise.id, id)).limit(1)
    if (result.length === 0) {
      return c.json(failed('广告不存在'))
    }
    return c.json(success(result[0]))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询广告失败'))
  }
})

// 27. POST /home/advertise/update/:id — body like create
router.post('/home/advertise/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(smsHomeAdvertise).set({
      name: body.name,
      type: body.type,
      pic: body.pic,
      startTime: body.startTime,
      endTime: body.endTime,
      status: body.status,
      url: body.url,
      note: body.note,
      sort: body.sort,
    }).where(eq(smsHomeAdvertise.id, id))
    return c.json(success(null, '更新广告成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新广告失败'))
  }
})

// ==================== HomeBrand ====================

// 28. GET /home/brand/list — query: brandName?, recommendStatus?, pageSize(5), pageNum(1)
router.get('/home/brand/list', async (c) => {
  try {
    const brandName = c.req.query('brandName') || ''
    const recommendStatus = c.req.query('recommendStatus')
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (brandName) {
      conditions.push(like(smsHomeBrand.brandName, '%' + brandName + '%'))
    }
    if (recommendStatus !== undefined && recommendStatus !== '') {
      conditions.push(eq(smsHomeBrand.recommendStatus, Number(recommendStatus)))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(smsHomeBrand)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(smsHomeBrand)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询首页品牌列表失败'))
  }
})

// 29. POST /home/brand/update/recommendStatus — query: ids, recommendStatus
router.post('/home/brand/update/recommendStatus', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const recommendStatus = Number(c.req.query('recommendStatus'))
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.update(smsHomeBrand).set({ recommendStatus }).where(inArray(smsHomeBrand.id, ids))
    return c.json(success(null, '批量更新品牌推荐状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量更新品牌推荐状态失败'))
  }
})

// 30. POST /home/brand/delete — query: ids
router.post('/home/brand/delete', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.delete(smsHomeBrand).where(inArray(smsHomeBrand.id, ids))
    return c.json(success(null, '删除首页品牌成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除首页品牌失败'))
  }
})

// 31. POST /home/brand/create — body: array of {brandId, brandName, recommendStatus?, sort?}
router.post('/home/brand/create', async (c) => {
  try {
    const body = await c.req.json()
    const items: any[] = Array.isArray(body) ? body : []
    if (items.length > 0) {
      const values = items.map(item => ({
        brandId: item.brandId,
        brandName: item.brandName,
        recommendStatus: item.recommendStatus,
        sort: item.sort,
      }))
      await db.insert(smsHomeBrand).values(values)
    }
    return c.json(success(null, '添加首页品牌成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '添加首页品牌失败'))
  }
})

// 32. POST /home/brand/update/sort/:id — query: sort
router.post('/home/brand/update/sort/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sort = Number(c.req.query('sort'))
    await db.update(smsHomeBrand).set({ sort }).where(eq(smsHomeBrand.id, id))
    return c.json(success(null, '更新品牌排序成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新品牌排序失败'))
  }
})

// ==================== HomeNewProduct ====================

// 33. GET /home/newProduct/list — query: productName?, recommendStatus?, pageSize(5), pageNum(1)
router.get('/home/newProduct/list', async (c) => {
  try {
    const productName = c.req.query('productName') || ''
    const recommendStatus = c.req.query('recommendStatus')
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (productName) {
      conditions.push(like(smsHomeNewProduct.productName, '%' + productName + '%'))
    }
    if (recommendStatus !== undefined && recommendStatus !== '') {
      conditions.push(eq(smsHomeNewProduct.recommendStatus, Number(recommendStatus)))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(smsHomeNewProduct)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(smsHomeNewProduct)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询首页新品列表失败'))
  }
})

// 34. POST /home/newProduct/update/recommendStatus — query: ids, recommendStatus
router.post('/home/newProduct/update/recommendStatus', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const recommendStatus = Number(c.req.query('recommendStatus'))
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.update(smsHomeNewProduct).set({ recommendStatus }).where(inArray(smsHomeNewProduct.id, ids))
    return c.json(success(null, '批量更新新品推荐状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量更新新品推荐状态失败'))
  }
})

// 35. POST /home/newProduct/delete — query: ids
router.post('/home/newProduct/delete', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.delete(smsHomeNewProduct).where(inArray(smsHomeNewProduct.id, ids))
    return c.json(success(null, '删除首页新品成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除首页新品失败'))
  }
})

// 36. POST /home/newProduct/create — body: array of {productId, productName, recommendStatus?, sort?}
router.post('/home/newProduct/create', async (c) => {
  try {
    const body = await c.req.json()
    const items: any[] = Array.isArray(body) ? body : []
    if (items.length > 0) {
      const values = items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        recommendStatus: item.recommendStatus,
        sort: item.sort,
      }))
      await db.insert(smsHomeNewProduct).values(values)
    }
    return c.json(success(null, '添加首页新品成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '添加首页新品失败'))
  }
})

// 37. POST /home/newProduct/update/sort/:id — query: sort
router.post('/home/newProduct/update/sort/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sort = Number(c.req.query('sort'))
    await db.update(smsHomeNewProduct).set({ sort }).where(eq(smsHomeNewProduct.id, id))
    return c.json(success(null, '更新新品排序成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新新品排序失败'))
  }
})

// ==================== HomeRecommendProduct ====================

// 38. GET /home/recommendProduct/list — query: productName?, recommendStatus?, pageSize(5), pageNum(1)
router.get('/home/recommendProduct/list', async (c) => {
  try {
    const productName = c.req.query('productName') || ''
    const recommendStatus = c.req.query('recommendStatus')
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (productName) {
      conditions.push(like(smsHomeRecommendProduct.productName, '%' + productName + '%'))
    }
    if (recommendStatus !== undefined && recommendStatus !== '') {
      conditions.push(eq(smsHomeRecommendProduct.recommendStatus, Number(recommendStatus)))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(smsHomeRecommendProduct)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(smsHomeRecommendProduct)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询人气推荐列表失败'))
  }
})

// 39. POST /home/recommendProduct/update/recommendStatus — query: ids, recommendStatus
router.post('/home/recommendProduct/update/recommendStatus', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const recommendStatus = Number(c.req.query('recommendStatus'))
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.update(smsHomeRecommendProduct).set({ recommendStatus }).where(inArray(smsHomeRecommendProduct.id, ids))
    return c.json(success(null, '批量更新人气推荐状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量更新人气推荐状态失败'))
  }
})

// 40. POST /home/recommendProduct/delete — query: ids
router.post('/home/recommendProduct/delete', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.delete(smsHomeRecommendProduct).where(inArray(smsHomeRecommendProduct.id, ids))
    return c.json(success(null, '删除人气推荐成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除人气推荐失败'))
  }
})

// 41. POST /home/recommendProduct/create — body: array of {productId, productName, recommendStatus?, sort?}
router.post('/home/recommendProduct/create', async (c) => {
  try {
    const body = await c.req.json()
    const items: any[] = Array.isArray(body) ? body : []
    if (items.length > 0) {
      const values = items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        recommendStatus: item.recommendStatus,
        sort: item.sort,
      }))
      await db.insert(smsHomeRecommendProduct).values(values)
    }
    return c.json(success(null, '添加人气推荐成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '添加人气推荐失败'))
  }
})

// 42. POST /home/recommendProduct/update/sort/:id — query: sort
router.post('/home/recommendProduct/update/sort/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sort = Number(c.req.query('sort'))
    await db.update(smsHomeRecommendProduct).set({ sort }).where(eq(smsHomeRecommendProduct.id, id))
    return c.json(success(null, '更新人气推荐排序成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新人气推荐排序失败'))
  }
})

// ==================== HomeRecommendSubject ====================

// 43. GET /home/recommendSubject/list — query: subjectName?, recommendStatus?, pageSize(5), pageNum(1)
router.get('/home/recommendSubject/list', async (c) => {
  try {
    const subjectName = c.req.query('subjectName') || ''
    const recommendStatus = c.req.query('recommendStatus')
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (subjectName) {
      conditions.push(like(smsHomeRecommendSubject.subjectName, '%' + subjectName + '%'))
    }
    if (recommendStatus !== undefined && recommendStatus !== '') {
      conditions.push(eq(smsHomeRecommendSubject.recommendStatus, Number(recommendStatus)))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(smsHomeRecommendSubject)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(smsHomeRecommendSubject)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询首页推荐专题列表失败'))
  }
})

// 44. POST /home/recommendSubject/update/recommendStatus — query: ids, recommendStatus
router.post('/home/recommendSubject/update/recommendStatus', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const recommendStatus = Number(c.req.query('recommendStatus'))
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.update(smsHomeRecommendSubject).set({ recommendStatus }).where(inArray(smsHomeRecommendSubject.id, ids))
    return c.json(success(null, '批量更新专题推荐状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量更新专题推荐状态失败'))
  }
})

// 45. POST /home/recommendSubject/delete — query: ids
router.post('/home/recommendSubject/delete', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.delete(smsHomeRecommendSubject).where(inArray(smsHomeRecommendSubject.id, ids))
    return c.json(success(null, '删除首页推荐专题成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除首页推荐专题失败'))
  }
})

// 46. POST /home/recommendSubject/create — body: array of {subjectId, subjectName, recommendStatus?, sort?}
router.post('/home/recommendSubject/create', async (c) => {
  try {
    const body = await c.req.json()
    const items: any[] = Array.isArray(body) ? body : []
    if (items.length > 0) {
      const values = items.map(item => ({
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        recommendStatus: item.recommendStatus,
        sort: item.sort,
      }))
      await db.insert(smsHomeRecommendSubject).values(values)
    }
    return c.json(success(null, '添加首页推荐专题成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '添加首页推荐专题失败'))
  }
})

// 47. POST /home/recommendSubject/update/sort/:id — query: sort
router.post('/home/recommendSubject/update/sort/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sort = Number(c.req.query('sort'))
    await db.update(smsHomeRecommendSubject).set({ sort }).where(eq(smsHomeRecommendSubject.id, id))
    return c.json(success(null, '更新专题推荐排序成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新专题推荐排序失败'))
  }
})

// ==================== Subject ====================

// 48. GET /subject/listAll — All subjects
router.get('/subject/listAll', async (c) => {
  try {
    const list = await db.select().from(cmsSubject)
    return c.json(success(list))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询专题列表失败'))
  }
})

// 49. GET /subject/list — query: keyword?, pageSize(5), pageNum(1)
router.get('/subject/list', async (c) => {
  try {
    const keyword = c.req.query('keyword') || ''
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const where = keyword ? like(cmsSubject.title, '%' + keyword + '%') : undefined

    const list = await db.select().from(cmsSubject)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(cmsSubject)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询专题列表失败'))
  }
})

// ==================== PrefrenceArea ====================

// 50. GET /prefrenceArea/listAll — All
router.get('/prefrenceArea/listAll', async (c) => {
  try {
    const list = await db.select().from(cmsPrefrenceArea)
    return c.json(success(list))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询优选专区列表失败'))
  }
})

// ==================== Resource ====================

// 51. GET /resource/listAll — All resources
router.get('/resource/listAll', async (c) => {
  try {
    const list = await db.select().from(umsResource)
    return c.json(success(list))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询资源列表失败'))
  }
})

// 52. GET /resource/list — query: categoryId?, nameKeyword?, urlKeyword?, pageSize(5), pageNum(1)
router.get('/resource/list', async (c) => {
  try {
    const categoryId = c.req.query('categoryId')
    const nameKeyword = c.req.query('nameKeyword') || ''
    const urlKeyword = c.req.query('urlKeyword') || ''
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (categoryId !== undefined && categoryId !== '') {
      conditions.push(eq(umsResource.categoryId, Number(categoryId)))
    }
    if (nameKeyword) {
      conditions.push(like(umsResource.name, '%' + nameKeyword + '%'))
    }
    if (urlKeyword) {
      conditions.push(like(umsResource.url, '%' + urlKeyword + '%'))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(umsResource)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(umsResource)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询资源列表失败'))
  }
})

// 53. POST /resource/create — body: {name, url, description?, categoryId}
router.post('/resource/create', async (c) => {
  try {
    const body = await c.req.json()
    await db.insert(umsResource).values({
      name: body.name,
      url: body.url,
      description: body.description,
      categoryId: body.categoryId,
    })
    return c.json(success(null, '创建资源成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建资源失败'))
  }
})

// 54. POST /resource/update/:id — body like create
router.post('/resource/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(umsResource).set({
      name: body.name,
      url: body.url,
      description: body.description,
      categoryId: body.categoryId,
    }).where(eq(umsResource.id, id))
    return c.json(success(null, '更新资源成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新资源失败'))
  }
})

// 55. POST /resource/delete/:id — Delete
router.post('/resource/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    await db.delete(umsResource).where(eq(umsResource.id, id))
    return c.json(success(null, '删除资源成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除资源失败'))
  }
})

// 56. GET /resource/:id — Get
router.get('/resource/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const result = await db.select().from(umsResource).where(eq(umsResource.id, id)).limit(1)
    if (result.length === 0) {
      return c.json(failed('资源不存在'))
    }
    return c.json(success(result[0]))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询资源失败'))
  }
})

// ==================== ResourceCategory ====================

// 57. GET /resourceCategory/listAll — All
router.get('/resourceCategory/listAll', async (c) => {
  try {
    const list = await db.select().from(umsResourceCategory)
    return c.json(success(list))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询资源分类列表失败'))
  }
})

// 58. POST /resourceCategory/create — body: {name, sort?}
router.post('/resourceCategory/create', async (c) => {
  try {
    const body = await c.req.json()
    await db.insert(umsResourceCategory).values({
      name: body.name,
      sort: body.sort,
    })
    return c.json(success(null, '创建资源分类成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建资源分类失败'))
  }
})

// 59. POST /resourceCategory/update/:id — body like create
router.post('/resourceCategory/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(umsResourceCategory).set({
      name: body.name,
      sort: body.sort,
    }).where(eq(umsResourceCategory.id, id))
    return c.json(success(null, '更新资源分类成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新资源分类失败'))
  }
})

// 60. POST /resourceCategory/delete/:id — Delete
router.post('/resourceCategory/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    await db.delete(umsResourceCategory).where(eq(umsResourceCategory.id, id))
    return c.json(success(null, '删除资源分类成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除资源分类失败'))
  }
})

// ==================== MemberLevel ====================

// 61. GET /memberLevel/list — query: defaultStatus
router.get('/memberLevel/list', async (c) => {
  try {
    const defaultStatus = c.req.query('defaultStatus')
    const where = defaultStatus !== undefined && defaultStatus !== ''
      ? eq(umsMemberLevel.defaultStatus, Number(defaultStatus))
      : undefined

    const list = await db.select().from(umsMemberLevel).where(where)
    return c.json(success(list))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询会员等级列表失败'))
  }
})

export default router
