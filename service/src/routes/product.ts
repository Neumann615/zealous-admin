import { Hono } from 'hono'
import { eq, like, or, sql, inArray, and } from 'drizzle-orm'
import { db } from '../db'
import {
  pmsProduct,
  pmsProductAttributeValue,
  pmsMemberPrice,
  pmsProductLadder,
  pmsProductFullReduction,
  pmsSkuStock,
  cmsSubjectProductRelation,
  cmsPrefrenceAreaProductRelation,
} from '../db/schema'
import { success, failed } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const app = new Hono()

// All routes require authentication
app.use('*', authMiddleware)

// ==================== POST /create ====================
app.post('/create', async (c) => {
  try {
    const body = await c.req.json()

    const {
      brandId,
      productCategoryId,
      feightTemplateId,
      productAttributeCategoryId,
      name,
      pic,
      productSn,
      deleteStatus,
      publishStatus,
      newStatus,
      recommandStatus,
      verifyStatus,
      sort,
      sale,
      price,
      promotionPrice,
      giftGrowth,
      giftPoint,
      usePointLimit,
      subTitle,
      description,
      originalPrice,
      stock,
      lowStock,
      unit,
      weight,
      previewStatus,
      serviceIds,
      keywords,
      note,
      albumPics,
      detailTitle,
      detailDesc,
      detailHtml,
      detailMobileHtml,
      promotionStartTime,
      promotionEndTime,
      promotionPerLimit,
      promotionType,
      brandName,
      productCategoryName,
      productAttributeValueList = [],
      memberPriceList = [],
      productLadderList = [],
      productFullReductionList = [],
      skuStockList = [],
      subjectProductRelationList = [],
      prefrenceAreaProductRelationList = [],
    } = body

    if (!name || !productSn) {
      return c.json(failed('商品名称和货号不能为空'), 400)
    }

    const product = await db.transaction(async (tx) => {
      const insertResult = await tx
        .insert(pmsProduct)
        .values({
          brandId,
          productCategoryId,
          feightTemplateId,
          productAttributeCategoryId,
          name,
          pic,
          productSn,
          deleteStatus: deleteStatus ?? 0,
          publishStatus: publishStatus ?? 0,
          newStatus: newStatus ?? 0,
          recommandStatus: recommandStatus ?? 0,
          verifyStatus: verifyStatus ?? 0,
          sort: sort ?? 0,
          sale: sale ?? 0,
          price,
          promotionPrice,
          giftGrowth: giftGrowth ?? 0,
          giftPoint: giftPoint ?? 0,
          usePointLimit,
          subTitle,
          description,
          originalPrice,
          stock,
          lowStock,
          unit,
          weight,
          previewStatus,
          serviceIds,
          keywords,
          note,
          albumPics,
          detailTitle,
          detailDesc,
          detailHtml,
          detailMobileHtml,
          promotionStartTime,
          promotionEndTime,
          promotionPerLimit,
          promotionType: promotionType ?? 0,
          brandName,
          productCategoryName,
        })

      // mysql2 驱动的 insert 返回 [ResultSetHeader, ...] 元组
      const productId = Number(insertResult[0].insertId)

      // Insert product attribute values
      if (productAttributeValueList.length > 0) {
        await tx.insert(pmsProductAttributeValue).values(
          productAttributeValueList.map((item: any) => ({
            productId,
            productAttributeId: item.productAttributeId,
            value: item.value,
          })),
        )
      }

      // Insert member prices
      if (memberPriceList.length > 0) {
        await tx.insert(pmsMemberPrice).values(
          memberPriceList.map((item: any) => ({
            productId,
            memberLevelId: item.memberLevelId,
            memberPrice: item.memberPrice,
            memberLevelName: item.memberLevelName,
          })),
        )
      }

      // Insert product ladder prices
      if (productLadderList.length > 0) {
        await tx.insert(pmsProductLadder).values(
          productLadderList.map((item: any) => ({
            productId,
            count: item.count,
            discount: item.discount,
            price: item.price,
          })),
        )
      }

      // Insert product full reductions
      if (productFullReductionList.length > 0) {
        await tx.insert(pmsProductFullReduction).values(
          productFullReductionList.map((item: any) => ({
            productId,
            fullPrice: item.fullPrice,
            reducePrice: item.reducePrice,
          })),
        )
      }

      // Insert SKU stocks
      if (skuStockList.length > 0) {
        await tx.insert(pmsSkuStock).values(
          skuStockList.map((item: any) => ({
            productId,
            skuCode: item.skuCode,
            price: item.price,
            stock: item.stock ?? 0,
            lowStock: item.lowStock,
            pic: item.pic,
            sale: item.sale ?? 0,
            promotionPrice: item.promotionPrice,
            lockStock: item.lockStock ?? 0,
            spData: item.spData,
          })),
        )
      }

      // Insert subject product relations
      if (subjectProductRelationList.length > 0) {
        await tx.insert(cmsSubjectProductRelation).values(
          subjectProductRelationList.map((item: any) => ({
            subjectId: item.subjectId,
            productId,
          })),
        )
      }

      // Insert prefrence area product relations
      if (prefrenceAreaProductRelationList.length > 0) {
        await tx.insert(cmsPrefrenceAreaProductRelation).values(
          prefrenceAreaProductRelationList.map((item: any) => ({
            prefrenceAreaId: item.prefrenceAreaId,
            productId,
          })),
        )
      }

      return newProduct
    })

    return c.json(success({ id: product.id }, '创建成功'), 200)
  }
  catch (err: any) {
    console.error('create product error:', err)
    return c.json(failed(err.message || '创建商品失败'), 500)
  }
})

// ==================== GET /updateInfo/:id ====================
app.get('/updateInfo/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))

    if (!id || Number.isNaN(id)) {
      return c.json(failed('商品ID无效'), 400)
    }

    const [product] = await db
      .select()
      .from(pmsProduct)
      .where(eq(pmsProduct.id, id))
      .limit(1)

    if (!product) {
      return c.json(failed('商品不存在'), 404)
    }

    const [
      productAttributeValueList,
      memberPriceList,
      productLadderList,
      productFullReductionList,
      skuStockList,
      subjectProductRelationList,
      prefrenceAreaProductRelationList,
    ] = await Promise.all([
      db
        .select()
        .from(pmsProductAttributeValue)
        .where(eq(pmsProductAttributeValue.productId, id)),
      db
        .select()
        .from(pmsMemberPrice)
        .where(eq(pmsMemberPrice.productId, id)),
      db
        .select()
        .from(pmsProductLadder)
        .where(eq(pmsProductLadder.productId, id)),
      db
        .select()
        .from(pmsProductFullReduction)
        .where(eq(pmsProductFullReduction.productId, id)),
      db
        .select()
        .from(pmsSkuStock)
        .where(eq(pmsSkuStock.productId, id)),
      db
        .select()
        .from(cmsSubjectProductRelation)
        .where(eq(cmsSubjectProductRelation.productId, id)),
      db
        .select()
        .from(cmsPrefrenceAreaProductRelation)
        .where(eq(cmsPrefrenceAreaProductRelation.productId, id)),
    ])

    return c.json(
      success({
        ...product,
        productAttributeValueList,
        memberPriceList,
        productLadderList,
        productFullReductionList,
        skuStockList,
        subjectProductRelationList,
        prefrenceAreaProductRelationList,
      }),
      200,
    )
  }
  catch (err: any) {
    console.error('get product updateInfo error:', err)
    return c.json(failed(err.message || '获取商品信息失败'), 500)
  }
})

// ==================== POST /update/:id ====================
app.post('/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))

    if (!id || Number.isNaN(id)) {
      return c.json(failed('商品ID无效'), 400)
    }

    // Check if product exists
    const [existing] = await db
      .select()
      .from(pmsProduct)
      .where(eq(pmsProduct.id, id))
      .limit(1)

    if (!existing) {
      return c.json(failed('商品不存在'), 404)
    }

    const body = await c.req.json()

    const {
      brandId,
      productCategoryId,
      feightTemplateId,
      productAttributeCategoryId,
      name,
      pic,
      productSn,
      deleteStatus,
      publishStatus,
      newStatus,
      recommandStatus,
      verifyStatus,
      sort,
      sale,
      price,
      promotionPrice,
      giftGrowth,
      giftPoint,
      usePointLimit,
      subTitle,
      description,
      originalPrice,
      stock,
      lowStock,
      unit,
      weight,
      previewStatus,
      serviceIds,
      keywords,
      note,
      albumPics,
      detailTitle,
      detailDesc,
      detailHtml,
      detailMobileHtml,
      promotionStartTime,
      promotionEndTime,
      promotionPerLimit,
      promotionType,
      brandName,
      productCategoryName,
      productAttributeValueList = [],
      memberPriceList = [],
      productLadderList = [],
      productFullReductionList = [],
      skuStockList = [],
      subjectProductRelationList = [],
      prefrenceAreaProductRelationList = [],
    } = body

    await db.transaction(async (tx) => {
      // Update product
      await tx
        .update(pmsProduct)
        .set({
          brandId,
          productCategoryId,
          feightTemplateId,
          productAttributeCategoryId,
          name,
          pic,
          productSn,
          deleteStatus: deleteStatus ?? 0,
          publishStatus: publishStatus ?? 0,
          newStatus: newStatus ?? 0,
          recommandStatus: recommandStatus ?? 0,
          verifyStatus: verifyStatus ?? 0,
          sort: sort ?? 0,
          sale: sale ?? 0,
          price,
          promotionPrice,
          giftGrowth: giftGrowth ?? 0,
          giftPoint: giftPoint ?? 0,
          usePointLimit,
          subTitle,
          description,
          originalPrice,
          stock,
          lowStock,
          unit,
          weight,
          previewStatus,
          serviceIds,
          keywords,
          note,
          albumPics,
          detailTitle,
          detailDesc,
          detailHtml,
          detailMobileHtml,
          promotionStartTime,
          promotionEndTime,
          promotionPerLimit,
          promotionType: promotionType ?? 0,
          brandName,
          productCategoryName,
        })
        .where(eq(pmsProduct.id, id))

      // Delete old related data
      await tx
        .delete(pmsProductAttributeValue)
        .where(eq(pmsProductAttributeValue.productId, id))
      await tx
        .delete(pmsMemberPrice)
        .where(eq(pmsMemberPrice.productId, id))
      await tx
        .delete(pmsProductLadder)
        .where(eq(pmsProductLadder.productId, id))
      await tx
        .delete(pmsProductFullReduction)
        .where(eq(pmsProductFullReduction.productId, id))
      await tx
        .delete(pmsSkuStock)
        .where(eq(pmsSkuStock.productId, id))
      await tx
        .delete(cmsSubjectProductRelation)
        .where(eq(cmsSubjectProductRelation.productId, id))
      await tx
        .delete(cmsPrefrenceAreaProductRelation)
        .where(eq(cmsPrefrenceAreaProductRelation.productId, id))

      // Re-insert product attribute values
      if (productAttributeValueList.length > 0) {
        await tx.insert(pmsProductAttributeValue).values(
          productAttributeValueList.map((item: any) => ({
            productId: id,
            productAttributeId: item.productAttributeId,
            value: item.value,
          })),
        )
      }

      // Re-insert member prices
      if (memberPriceList.length > 0) {
        await tx.insert(pmsMemberPrice).values(
          memberPriceList.map((item: any) => ({
            productId: id,
            memberLevelId: item.memberLevelId,
            memberPrice: item.memberPrice,
            memberLevelName: item.memberLevelName,
          })),
        )
      }

      // Re-insert product ladder prices
      if (productLadderList.length > 0) {
        await tx.insert(pmsProductLadder).values(
          productLadderList.map((item: any) => ({
            productId: id,
            count: item.count,
            discount: item.discount,
            price: item.price,
          })),
        )
      }

      // Re-insert product full reductions
      if (productFullReductionList.length > 0) {
        await tx.insert(pmsProductFullReduction).values(
          productFullReductionList.map((item: any) => ({
            productId: id,
            fullPrice: item.fullPrice,
            reducePrice: item.reducePrice,
          })),
        )
      }

      // Re-insert SKU stocks
      if (skuStockList.length > 0) {
        await tx.insert(pmsSkuStock).values(
          skuStockList.map((item: any) => ({
            productId: id,
            skuCode: item.skuCode,
            price: item.price,
            stock: item.stock ?? 0,
            lowStock: item.lowStock,
            pic: item.pic,
            sale: item.sale ?? 0,
            promotionPrice: item.promotionPrice,
            lockStock: item.lockStock ?? 0,
            spData: item.spData,
          })),
        )
      }

      // Re-insert subject product relations
      if (subjectProductRelationList.length > 0) {
        await tx.insert(cmsSubjectProductRelation).values(
          subjectProductRelationList.map((item: any) => ({
            subjectId: item.subjectId,
            productId: id,
          })),
        )
      }

      // Re-insert prefrence area product relations
      if (prefrenceAreaProductRelationList.length > 0) {
        await tx.insert(cmsPrefrenceAreaProductRelation).values(
          prefrenceAreaProductRelationList.map((item: any) => ({
            prefrenceAreaId: item.prefrenceAreaId,
            productId: id,
          })),
        )
      }
    })

    return c.json(success(null, '更新成功'), 200)
  }
  catch (err: any) {
    console.error('update product error:', err)
    return c.json(failed(err.message || '更新商品失败'), 500)
  }
})

// ==================== GET /list ====================
app.get('/list', async (c) => {
  try {
    const keyword = c.req.query('keyword')
    const publishStatus = c.req.query('publishStatus')
    const verifyStatus = c.req.query('verifyStatus')
    const productSn = c.req.query('productSn')
    const productCategoryId = c.req.query('productCategoryId')
    const brandId = c.req.query('brandId')
    const pageNum = Number(c.req.query('pageNum')) || 1
    const pageSize = Number(c.req.query('pageSize')) || 5

    const conditions: any[] = []

    if (keyword) {
      conditions.push(
        or(
          like(pmsProduct.name, `%${keyword}%`),
          like(pmsProduct.productSn, `%${keyword}%`),
        ),
      )
    }

    if (publishStatus !== undefined && publishStatus !== '') {
      conditions.push(eq(pmsProduct.publishStatus, Number(publishStatus)))
    }

    if (verifyStatus !== undefined && verifyStatus !== '') {
      conditions.push(eq(pmsProduct.verifyStatus, Number(verifyStatus)))
    }

    if (productSn) {
      conditions.push(eq(pmsProduct.productSn, productSn))
    }

    if (productCategoryId !== undefined && productCategoryId !== '') {
      conditions.push(
        eq(pmsProduct.productCategoryId, Number(productCategoryId)),
      )
    }

    if (brandId !== undefined && brandId !== '') {
      conditions.push(eq(pmsProduct.brandId, Number(brandId)))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const offset = (pageNum - 1) * pageSize

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(pmsProduct)
      .where(where)

    const total = Number(countResult.count)

    const list = await db
      .select()
      .from(pmsProduct)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    return c.json(
      success({
        pageNum,
        pageSize,
        total,
        list,
      }),
      200,
    )
  }
  catch (err: any) {
    console.error('list products error:', err)
    return c.json(failed(err.message || '查询商品列表失败'), 500)
  }
})

// ==================== GET /simpleList ====================
app.get('/simpleList', async (c) => {
  try {
    const keyword = c.req.query('keyword')

    if (!keyword) {
      return c.json(success([]), 200)
    }

    const list = await db
      .select()
      .from(pmsProduct)
      .where(
        or(
          like(pmsProduct.name, `%${keyword}%`),
          like(pmsProduct.productSn, `%${keyword}%`),
        ),
      )

    return c.json(success(list), 200)
  }
  catch (err: any) {
    console.error('simpleList products error:', err)
    return c.json(failed(err.message || '查询商品失败'), 500)
  }
})

// ==================== Helper: parse batch update params ====================
async function parseBatchParams(c: any) {
  let ids: number[] = []
  let verifyStatus: number | undefined
  let detail = ''
  let publishStatus: number | undefined
  let recommendStatus: number | undefined
  let newStatus: number | undefined
  let deleteStatus: number | undefined

  // Try to read from JSON body first
  try {
    const body = await c.req.json()
    if (body && Object.keys(body).length > 0) {
      ids = body.ids || []
      verifyStatus = body.verifyStatus !== undefined ? Number(body.verifyStatus) : undefined
      detail = body.detail || ''
      publishStatus = body.publishStatus !== undefined ? Number(body.publishStatus) : undefined
      recommendStatus = body.recommendStatus !== undefined ? Number(body.recommendStatus) : undefined
      newStatus = body.newStatus !== undefined ? Number(body.newStatus) : undefined
      deleteStatus = body.deleteStatus !== undefined ? Number(body.deleteStatus) : undefined
      return { ids, verifyStatus, detail, publishStatus, recommendStatus, newStatus, deleteStatus }
    }
  }
  catch {
    // No JSON body, fall through to query params
  }

  // Read from query params as fallback
  const idsParam = c.req.query('ids')
  if (idsParam) {
    ids = idsParam.split(',').map(Number)
  }
  else {
    const idsArr = c.req.queries('ids')
    if (idsArr) {
      ids = idsArr.map(Number)
    }
  }

  const v = c.req.query('verifyStatus')
  verifyStatus = v !== undefined ? Number(v) : undefined

  detail = c.req.query('detail') || ''

  const p = c.req.query('publishStatus')
  publishStatus = p !== undefined ? Number(p) : undefined

  const r = c.req.query('recommendStatus')
  recommendStatus = r !== undefined ? Number(r) : undefined

  const n = c.req.query('newStatus')
  newStatus = n !== undefined ? Number(n) : undefined

  const d = c.req.query('deleteStatus')
  deleteStatus = d !== undefined ? Number(d) : undefined

  return { ids, verifyStatus, detail, publishStatus, recommendStatus, newStatus, deleteStatus }
}

// ==================== POST /update/verifyStatus ====================
app.post('/update/verifyStatus', async (c) => {
  try {
    const { ids, verifyStatus, detail } = await parseBatchParams(c)

    if (!ids || ids.length === 0) {
      return c.json(failed('请选择要操作的商品'), 400)
    }

    if (verifyStatus === undefined) {
      return c.json(failed('审核状态不能为空'), 400)
    }

    await db
      .update(pmsProduct)
      .set({
        verifyStatus,
        detailDesc: detail || undefined,
      })
      .where(inArray(pmsProduct.id, ids))

    return c.json(success(null, '操作成功'), 200)
  }
  catch (err: any) {
    console.error('batch update verifyStatus error:', err)
    return c.json(failed(err.message || '批量更新审核状态失败'), 500)
  }
})

// ==================== POST /update/publishStatus ====================
app.post('/update/publishStatus', async (c) => {
  try {
    const { ids, publishStatus } = await parseBatchParams(c)

    if (!ids || ids.length === 0) {
      return c.json(failed('请选择要操作的商品'), 400)
    }

    if (publishStatus === undefined) {
      return c.json(failed('上架状态不能为空'), 400)
    }

    await db
      .update(pmsProduct)
      .set({ publishStatus })
      .where(inArray(pmsProduct.id, ids))

    return c.json(success(null, '操作成功'), 200)
  }
  catch (err: any) {
    console.error('batch update publishStatus error:', err)
    return c.json(failed(err.message || '批量更新上架状态失败'), 500)
  }
})

// ==================== POST /update/recommendStatus ====================
app.post('/update/recommendStatus', async (c) => {
  try {
    const { ids, recommendStatus } = await parseBatchParams(c)

    if (!ids || ids.length === 0) {
      return c.json(failed('请选择要操作的商品'), 400)
    }

    if (recommendStatus === undefined) {
      return c.json(failed('推荐状态不能为空'), 400)
    }

    await db
      .update(pmsProduct)
      .set({ recommandStatus: recommendStatus })
      .where(inArray(pmsProduct.id, ids))

    return c.json(success(null, '操作成功'), 200)
  }
  catch (err: any) {
    console.error('batch update recommendStatus error:', err)
    return c.json(failed(err.message || '批量更新推荐状态失败'), 500)
  }
})

// ==================== POST /update/newStatus ====================
app.post('/update/newStatus', async (c) => {
  try {
    const { ids, newStatus } = await parseBatchParams(c)

    if (!ids || ids.length === 0) {
      return c.json(failed('请选择要操作的商品'), 400)
    }

    if (newStatus === undefined) {
      return c.json(failed('新品状态不能为空'), 400)
    }

    await db
      .update(pmsProduct)
      .set({ newStatus })
      .where(inArray(pmsProduct.id, ids))

    return c.json(success(null, '操作成功'), 200)
  }
  catch (err: any) {
    console.error('batch update newStatus error:', err)
    return c.json(failed(err.message || '批量更新新品状态失败'), 500)
  }
})

// ==================== POST /update/deleteStatus ====================
app.post('/update/deleteStatus', async (c) => {
  try {
    const { ids, deleteStatus } = await parseBatchParams(c)

    if (!ids || ids.length === 0) {
      return c.json(failed('请选择要操作的商品'), 400)
    }

    if (deleteStatus === undefined) {
      return c.json(failed('删除状态不能为空'), 400)
    }

    await db
      .update(pmsProduct)
      .set({ deleteStatus })
      .where(inArray(pmsProduct.id, ids))

    return c.json(success(null, '操作成功'), 200)
  }
  catch (err: any) {
    console.error('batch update deleteStatus error:', err)
    return c.json(failed(err.message || '批量更新删除状态失败'), 500)
  }
})

export default app
