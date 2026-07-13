import { Hono } from 'hono'
import { eq, like, sql, inArray, and, or } from 'drizzle-orm'
import { db } from '../db'
import {
  omsOrder,
  omsOrderItem,
  omsOrderOperateHistory,
  omsOrderReturnApply,
  omsOrderReturnReason,
  omsOrderSetting,
  omsCompanyAddress,
} from '../db/schema'
import { success, failed } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = new Hono()

// All routes use authMiddleware
router.use('*', authMiddleware)

// ==================== Order ====================

// 1. GET /order/list — query: orderSn?, receiverKeyword?, status?, orderType?, sourceType?, createTime?, pageSize(5), pageNum(1)
router.get('/order/list', async (c) => {
  try {
    const orderSn = c.req.query('orderSn') || ''
    const receiverKeyword = c.req.query('receiverKeyword') || ''
    const status = c.req.query('status')
    const orderType = c.req.query('orderType')
    const sourceType = c.req.query('sourceType')
    const createTime = c.req.query('createTime') || ''
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (orderSn) {
      conditions.push(like(omsOrder.orderSn, '%' + orderSn + '%'))
    }
    if (receiverKeyword) {
      conditions.push(
        or(
          like(omsOrder.receiverName, '%' + receiverKeyword + '%'),
          like(omsOrder.receiverPhone, '%' + receiverKeyword + '%'),
        )
      )
    }
    if (status !== undefined && status !== '') {
      conditions.push(eq(omsOrder.status, Number(status)))
    }
    if (orderType !== undefined && orderType !== '') {
      conditions.push(eq(omsOrder.orderType, Number(orderType)))
    }
    if (sourceType !== undefined && sourceType !== '') {
      conditions.push(eq(omsOrder.sourceType, Number(sourceType)))
    }
    if (createTime) {
      conditions.push(like(omsOrder.createTime, '%' + createTime + '%'))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(omsOrder)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(omsOrder)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询订单列表失败'))
  }
})

// 2. POST /order/update/delivery — body: [{orderId, deliveryCompany, deliverySn}]. Batch update delivery info, set status to 2 (delivered)
router.post('/order/update/delivery', async (c) => {
  try {
    const body = await c.req.json()
    const items: any[] = Array.isArray(body) ? body : []
    for (const item of items) {
      await db.update(omsOrder).set({
        deliveryCompany: item.deliveryCompany,
        deliverySn: item.deliverySn,
        status: 2,
      }).where(eq(omsOrder.id, item.orderId))
    }
    return c.json(success(null, '发货成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '发货失败'))
  }
})

// 3. POST /order/update/close — query: ids, note. Batch close orders.
router.post('/order/update/close', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const note = c.req.query('note') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.update(omsOrder).set({ status: 4, note }).where(inArray(omsOrder.id, ids))
    return c.json(success(null, '关闭订单成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '关闭订单失败'))
  }
})

// 4. POST /order/delete — query: ids. Batch delete.
router.post('/order/delete', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.delete(omsOrder).where(inArray(omsOrder.id, ids))
    return c.json(success(null, '删除订单成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除订单失败'))
  }
})

// 5. GET /order/:id — Get order detail with order items AND operate history
router.get('/order/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const orderResult = await db.select().from(omsOrder).where(eq(omsOrder.id, id)).limit(1)
    if (orderResult.length === 0) {
      return c.json(failed('订单不存在'))
    }
    const order = orderResult[0]

    const orderItemList = await db.select().from(omsOrderItem)
      .where(eq(omsOrderItem.orderId, id))

    const historyList = await db.select().from(omsOrderOperateHistory)
      .where(eq(omsOrderOperateHistory.orderId, id))

    return c.json(success({ ...order, orderItemList, historyList }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询订单详情失败'))
  }
})

// 6. POST /order/update/receiverInfo — body: {orderId, receiverName, receiverPhone, receiverPostCode, receiverDetailAddress, receiverProvince, receiverCity, receiverRegion, status}
router.post('/order/update/receiverInfo', async (c) => {
  try {
    const body = await c.req.json()
    await db.update(omsOrder).set({
      receiverName: body.receiverName,
      receiverPhone: body.receiverPhone,
      receiverPostCode: body.receiverPostCode,
      receiverDetailAddress: body.receiverDetailAddress,
      receiverProvince: body.receiverProvince,
      receiverCity: body.receiverCity,
      receiverRegion: body.receiverRegion,
      status: body.status,
    }).where(eq(omsOrder.id, body.orderId))
    return c.json(success(null, '更新收货人信息成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新收货人信息失败'))
  }
})

// 7. POST /order/update/moneyInfo — body: {orderId, freightAmount, discountAmount, status}
router.post('/order/update/moneyInfo', async (c) => {
  try {
    const body = await c.req.json()
    await db.update(omsOrder).set({
      freightAmount: body.freightAmount,
      discountAmount: body.discountAmount,
      status: body.status,
    }).where(eq(omsOrder.id, body.orderId))
    return c.json(success(null, '更新费用信息成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新费用信息失败'))
  }
})

// 8. POST /order/update/note — query: id, note, status
router.post('/order/update/note', async (c) => {
  try {
    const id = Number(c.req.query('id'))
    const note = c.req.query('note') || ''
    const status = Number(c.req.query('status'))
    await db.update(omsOrder).set({ note, status }).where(eq(omsOrder.id, id))
    return c.json(success(null, '更新订单备注成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新订单备注失败'))
  }
})

// ==================== ReturnApply ====================

// 9. GET /returnApply/list — query: id?, receiverKeyword?, status?, createTime?, handleMan?, handleTime?, pageSize(5), pageNum(1)
router.get('/returnApply/list', async (c) => {
  try {
    const id = c.req.query('id')
    const receiverKeyword = c.req.query('receiverKeyword') || ''
    const status = c.req.query('status')
    const createTime = c.req.query('createTime') || ''
    const handleMan = c.req.query('handleMan') || ''
    const handleTime = c.req.query('handleTime') || ''
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = []
    if (id !== undefined && id !== '') {
      conditions.push(eq(omsOrderReturnApply.id, Number(id)))
    }
    if (receiverKeyword) {
      conditions.push(
        or(
          like(omsOrderReturnApply.returnName, '%' + receiverKeyword + '%'),
          like(omsOrderReturnApply.returnPhone, '%' + receiverKeyword + '%'),
        )
      )
    }
    if (status !== undefined && status !== '') {
      conditions.push(eq(omsOrderReturnApply.status, Number(status)))
    }
    if (createTime) {
      conditions.push(like(omsOrderReturnApply.createTime, '%' + createTime + '%'))
    }
    if (handleMan) {
      conditions.push(like(omsOrderReturnApply.handleMan, '%' + handleMan + '%'))
    }
    if (handleTime) {
      conditions.push(like(omsOrderReturnApply.handleTime, '%' + handleTime + '%'))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const list = await db.select().from(omsOrderReturnApply)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(omsOrderReturnApply)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询退货申请列表失败'))
  }
})

// 10. POST /returnApply/delete — query: ids. Batch delete.
router.post('/returnApply/delete', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.delete(omsOrderReturnApply).where(inArray(omsOrderReturnApply.id, ids))
    return c.json(success(null, '删除退货申请成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除退货申请失败'))
  }
})

// 11. POST /returnApply/update/status/:id — body: {companyAddressId, returnAmount, handleNote, handleMan, receiveNote, receiveMan, status}
router.post('/returnApply/update/status/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(omsOrderReturnApply).set({
      companyAddressId: body.companyAddressId,
      returnAmount: body.returnAmount,
      handleNote: body.handleNote,
      handleMan: body.handleMan,
      receiveNote: body.receiveNote,
      receiveMan: body.receiveMan,
      status: body.status,
    }).where(eq(omsOrderReturnApply.id, id))
    return c.json(success(null, '更新退货申请状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新退货申请状态失败'))
  }
})

// 12. GET /returnApply/:id — Get by id
router.get('/returnApply/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const result = await db.select().from(omsOrderReturnApply)
      .where(eq(omsOrderReturnApply.id, id))
      .limit(1)
    if (result.length === 0) {
      return c.json(failed('退货申请不存在'))
    }
    return c.json(success(result[0]))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询退货申请失败'))
  }
})

// ==================== ReturnReason ====================

// 13. GET /returnReason/list — query: pageSize(5), pageNum(1)
router.get('/returnReason/list', async (c) => {
  try {
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const list = await db.select().from(omsOrderReturnReason)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(omsOrderReturnReason)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询退货原因列表失败'))
  }
})

// 14. POST /returnReason/delete — query: ids. Batch delete.
router.post('/returnReason/delete', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.delete(omsOrderReturnReason).where(inArray(omsOrderReturnReason.id, ids))
    return c.json(success(null, '删除退货原因成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除退货原因失败'))
  }
})

// 15. POST /returnReason/update/status — query: ids, status. Batch update.
router.post('/returnReason/update/status', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const status = Number(c.req.query('status'))
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.update(omsOrderReturnReason).set({ status }).where(inArray(omsOrderReturnReason.id, ids))
    return c.json(success(null, '批量更新退货原因状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量更新退货原因状态失败'))
  }
})

// 16. POST /returnReason/create — body: {name, sort, status}
router.post('/returnReason/create', async (c) => {
  try {
    const body = await c.req.json()
    await db.insert(omsOrderReturnReason).values({
      name: body.name,
      sort: body.sort,
      status: body.status,
    })
    return c.json(success(null, '创建退货原因成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建退货原因失败'))
  }
})

// 17. GET /returnReason/:id — Get by id
router.get('/returnReason/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const result = await db.select().from(omsOrderReturnReason)
      .where(eq(omsOrderReturnReason.id, id))
      .limit(1)
    if (result.length === 0) {
      return c.json(failed('退货原因不存在'))
    }
    return c.json(success(result[0]))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询退货原因失败'))
  }
})

// 18. POST /returnReason/update/:id — body like create
router.post('/returnReason/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(omsOrderReturnReason).set({
      name: body.name,
      sort: body.sort,
      status: body.status,
    }).where(eq(omsOrderReturnReason.id, id))
    return c.json(success(null, '更新退货原因成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新退货原因失败'))
  }
})

// ==================== OrderSetting ====================

// 19. GET /orderSetting/:id — Get by id
router.get('/orderSetting/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const result = await db.select().from(omsOrderSetting)
      .where(eq(omsOrderSetting.id, id))
      .limit(1)
    if (result.length === 0) {
      return c.json(failed('订单设置不存在'))
    }
    return c.json(success(result[0]))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询订单设置失败'))
  }
})

// 20. POST /orderSetting/update/:id — body: {flashOrderOvertime, normalOrderOvertime, confirmOvertime, finishOvertime, commentOvertime}
router.post('/orderSetting/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(omsOrderSetting).set({
      flashOrderOvertime: body.flashOrderOvertime,
      normalOrderOvertime: body.normalOrderOvertime,
      confirmOvertime: body.confirmOvertime,
      finishOvertime: body.finishOvertime,
      commentOvertime: body.commentOvertime,
    }).where(eq(omsOrderSetting.id, id))
    return c.json(success(null, '更新订单设置成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新订单设置失败'))
  }
})

// ==================== CompanyAddress ====================

// 21. GET /companyAddress/list — All addresses
router.get('/companyAddress/list', async (c) => {
  try {
    const list = await db.select().from(omsCompanyAddress)
    return c.json(success(list))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询公司地址列表失败'))
  }
})

export default router
