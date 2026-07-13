import { Hono } from 'hono'
import { eq, like, sql, inArray, and } from 'drizzle-orm'
import { db } from '../db'
import {
  pmsProductCategory,
  pmsProductAttributeCategory,
  pmsProductAttribute,
  pmsProductAttributeValue,
  pmsProductCategoryAttributeRelation,
  pmsSkuStock,
} from '../db/schema'
import { success, failed } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = new Hono()

// All routes use authMiddleware
router.use('*', authMiddleware)

// ==================== productCategory ====================

// 1. POST /productCategory/create — body: {parentId, name, level, navStatus, showStatus, sort, icon?, keywords?, description?, productUnit?}
router.post('/productCategory/create', async (c) => {
  try {
    const body = await c.req.json()
    await db.insert(pmsProductCategory).values({
      parentId: body.parentId,
      name: body.name,
      level: body.level,
      navStatus: body.navStatus,
      showStatus: body.showStatus,
      sort: body.sort,
      icon: body.icon,
      keywords: body.keywords,
      description: body.description,
      productUnit: body.productUnit,
    })
    return c.json(success(null, '创建分类成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建分类失败'))
  }
})

// 2. POST /productCategory/update/navStatus — 必须放在 /update/:id 前面避免被 :id 匹配
router.post('/productCategory/update/navStatus', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const navStatus = Number(c.req.query('navStatus'))
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.update(pmsProductCategory).set({ navStatus }).where(inArray(pmsProductCategory.id, ids))
    return c.json(success(null, '批量更新导航状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量更新导航状态失败'))
  }
})

// 3. POST /productCategory/update/showStatus — 必须放在 /update/:id 前面避免被 :id 匹配
router.post('/productCategory/update/showStatus', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const showStatus = Number(c.req.query('showStatus'))
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.update(pmsProductCategory).set({ showStatus }).where(inArray(pmsProductCategory.id, ids))
    return c.json(success(null, '批量更新显示状态成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量更新显示状态失败'))
  }
})

// 4. POST /productCategory/update/:id — 必须放在 navStatus/showStatus 后面
router.post('/productCategory/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(pmsProductCategory).set({
      parentId: body.parentId,
      name: body.name,
      level: body.level,
      navStatus: body.navStatus,
      showStatus: body.showStatus,
      sort: body.sort,
      icon: body.icon,
      keywords: body.keywords,
      description: body.description,
      productUnit: body.productUnit,
    }).where(eq(pmsProductCategory.id, id))
    return c.json(success(null, '更新分类成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新分类失败'))
  }
})

// 5. GET /productCategory/:id — get by id
router.get('/productCategory/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const result = await db.select().from(pmsProductCategory).where(eq(pmsProductCategory.id, id)).limit(1)
    if (result.length === 0) {
      return c.json(failed('分类不存在'))
    }
    return c.json(success(result[0]))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询分类失败'))
  }
})

// 6. POST /productCategory/delete/:id — delete
router.post('/productCategory/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    await db.delete(pmsProductCategory).where(eq(pmsProductCategory.id, id))
    return c.json(success(null, '删除分类成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除分类失败'))
  }
})

// 8. GET /productCategory/list/withChildren — Return tree: root categories (parentId=0) with nested children.
router.get('/productCategory/list/withChildren', async (c) => {
  try {
    const allCategories = await db.select().from(pmsProductCategory)

    // 安全的非递归构建树，防止循环引用导致栈溢出
    const map = new Map<number, any>()
    const roots: any[] = []

    for (const cat of allCategories) {
      map.set(cat.id, { ...cat, children: [] })
    }

    for (const cat of allCategories) {
      const node = map.get(cat.id)
      if (!node) continue
      if (cat.parentId == null || cat.parentId === 0) {
        roots.push(node)
      } else {
        const parent = map.get(cat.parentId)
        if (parent && parent !== node) {
          parent.children.push(node)
        } else {
          // 父节点不存在或自引用，当作根节点处理
          roots.push(node)
        }
      }
    }

    return c.json(success(roots))
  } catch (e: any) {
    console.error('list/withChildren error:', e)
    return c.json(failed(e?.message || '查询分类树失败'))
  }
})

// 8b. GET /productCategory/list/:parentId — 分页查询子分类，必须放在 /list/withChildren 后面
router.get('/productCategory/list/:parentId', async (c) => {
  try {
    const parentId = Number(c.req.param('parentId'))
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const where = eq(pmsProductCategory.parentId, parentId)

    const list = await db.select().from(pmsProductCategory)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(pmsProductCategory)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询分类列表失败'))
  }
})

// ==================== productAttributeCategory ====================

// 9. POST /productAttribute/category/create — query: name
router.post('/productAttribute/category/create', async (c) => {
  try {
    const name = c.req.query('name') || ''
    if (!name) {
      return c.json(failed('name参数不能为空'))
    }
    await db.insert(pmsProductAttributeCategory).values({ name })
    return c.json(success(null, '创建属性分类成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建属性分类失败'))
  }
})

// 10. POST /productAttribute/category/update/:id — query: name
router.post('/productAttribute/category/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const name = c.req.query('name') || ''
    if (!name) {
      return c.json(failed('name参数不能为空'))
    }
    await db.update(pmsProductAttributeCategory).set({ name }).where(eq(pmsProductAttributeCategory.id, id))
    return c.json(success(null, '更新属性分类成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新属性分类失败'))
  }
})

// 11. GET /productAttribute/category/delete/:id — delete
router.get('/productAttribute/category/delete/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    await db.delete(pmsProductAttributeCategory).where(eq(pmsProductAttributeCategory.id, id))
    return c.json(success(null, '删除属性分类成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '删除属性分类失败'))
  }
})


// 13. GET /productAttribute/category/list — query: pageSize(5), pageNum(1)
router.get('/productAttribute/category/list', async (c) => {
  try {
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const list = await db.select().from(pmsProductAttributeCategory)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(pmsProductAttributeCategory)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询属性分类列表失败'))
  }
})

// 14. GET /productAttribute/category/list/withAttr — Each category with its attributes: [{...category, productAttributeList: [...]}]
router.get('/productAttribute/category/list/withAttr', async (c) => {
  try {
    const categories = await db.select().from(pmsProductAttributeCategory)
    const allAttrs = await db.select().from(pmsProductAttribute)

    const list = categories.map(cat => ({
      ...cat,
      productAttributeList: allAttrs.filter(
        attr => attr.productAttributeCategoryId === cat.id
      ),
    }))

    return c.json(success(list))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询属性分类及属性列表失败'))
  }
})

// 12b. GET /productAttribute/category/:id — 必须放在 /list 和 /list/withAttr 后面
router.get('/productAttribute/category/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const result = await db.select().from(pmsProductAttributeCategory)
      .where(eq(pmsProductAttributeCategory.id, id))
      .limit(1)
    if (result.length === 0) {
      return c.json(failed('属性分类不存在'))
    }
    return c.json(success(result[0]))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询属性分类失败'))
  }
})

// ==================== productAttribute ====================

// 15. GET /productAttribute/list/:cid — query: type, pageSize(5), pageNum(1). WHERE productAttributeCategoryId = cid AND type = type.
router.get('/productAttribute/list/:cid', async (c) => {
  try {
    const cid = Number(c.req.param('cid'))
    const type = c.req.query('type')
    const pageSize = Number(c.req.query('pageSize')) || 5
    const pageNum = Number(c.req.query('pageNum')) || 1
    const offset = (pageNum - 1) * pageSize

    const conditions = [eq(pmsProductAttribute.productAttributeCategoryId, cid)]
    if (type !== undefined && type !== '') {
      conditions.push(eq(pmsProductAttribute.type, Number(type)))
    }
    const where = and(...conditions)

    const list = await db.select().from(pmsProductAttribute)
      .where(where)
      .limit(pageSize)
      .offset(offset)

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(pmsProductAttribute)
      .where(where)
    const total = Number(totalResult[0]?.count) || 0

    return c.json(success({ pageNum, pageSize, total, list }))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询属性列表失败'))
  }
})

// 16. POST /productAttribute/create — body: {name, productAttributeCategoryId, selectType, inputType, inputList?, sort?, filterType?, searchType?, relatedStatus?, handAddStatus?, type?}
router.post('/productAttribute/create', async (c) => {
  try {
    const body = await c.req.json()
    await db.insert(pmsProductAttribute).values({
      name: body.name,
      productAttributeCategoryId: body.productAttributeCategoryId,
      selectType: body.selectType,
      inputType: body.inputType,
      inputList: body.inputList,
      sort: body.sort,
      filterType: body.filterType,
      searchType: body.searchType,
      relatedStatus: body.relatedStatus,
      handAddStatus: body.handAddStatus,
      type: body.type,
    })
    return c.json(success(null, '创建属性成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '创建属性失败'))
  }
})

// 17. POST /productAttribute/update/:id — body like create
router.post('/productAttribute/update/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    await db.update(pmsProductAttribute).set({
      name: body.name,
      productAttributeCategoryId: body.productAttributeCategoryId,
      selectType: body.selectType,
      inputType: body.inputType,
      inputList: body.inputList,
      sort: body.sort,
      filterType: body.filterType,
      searchType: body.searchType,
      relatedStatus: body.relatedStatus,
      handAddStatus: body.handAddStatus,
      type: body.type,
    }).where(eq(pmsProductAttribute.id, id))
    return c.json(success(null, '更新属性成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新属性失败'))
  }
})

// 18. GET /productAttribute/:id — get by id
router.get('/productAttribute/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const result = await db.select().from(pmsProductAttribute)
      .where(eq(pmsProductAttribute.id, id))
      .limit(1)
    if (result.length === 0) {
      return c.json(failed('属性不存在'))
    }
    return c.json(success(result[0]))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询属性失败'))
  }
})

// 19. POST /productAttribute/delete — query: ids (comma-separated). Batch delete via inArray.
router.post('/productAttribute/delete', async (c) => {
  try {
    const idsStr = c.req.query('ids') || ''
    const ids = idsStr.split(',').map(Number).filter(Boolean)
    if (ids.length === 0) {
      return c.json(failed('ids参数不能为空'))
    }
    await db.delete(pmsProductAttribute).where(inArray(pmsProductAttribute.id, ids))
    return c.json(success(null, '批量删除属性成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '批量删除属性失败'))
  }
})

// 20. GET /productAttribute/attrInfo/:productCategoryId — Join pmsProductCategoryAttributeRelation with pmsProductAttribute to return all attributes for this category.
router.get('/productAttribute/attrInfo/:productCategoryId', async (c) => {
  try {
    const productCategoryId = Number(c.req.param('productCategoryId'))

    // Get relation records for this category
    const relations = await db.select().from(pmsProductCategoryAttributeRelation)
      .where(eq(pmsProductCategoryAttributeRelation.productCategoryId, productCategoryId))

    if (relations.length === 0) {
      return c.json(success([]))
    }

    const attributeIds = relations.map(r => r.productAttributeId)
    const attributes = await db.select().from(pmsProductAttribute)
      .where(inArray(pmsProductAttribute.id, attributeIds))

    return c.json(success(attributes))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询分类属性失败'))
  }
})

// ==================== sku ====================

// 21. GET /sku/:pid — query: keyword? Optional. Get SKU list for product ID. If keyword, add WHERE skuCode LIKE keyword.
router.get('/sku/:pid', async (c) => {
  try {
    const pid = Number(c.req.param('pid'))
    const keyword = c.req.query('keyword') || ''

    const list = await db.select().from(pmsSkuStock)
      .where(keyword
        ? and(
            eq(pmsSkuStock.productId, pid),
            like(pmsSkuStock.skuCode, `%${keyword}%`),
          )
        : eq(pmsSkuStock.productId, pid)
      )

    return c.json(success(list))
  } catch (e: any) {
    return c.json(failed(e?.message || '查询SKU列表失败'))
  }
})

// 22. POST /sku/update/:pid — body: array of SKU objects [{skuCode, price, stock, lowStock, pic, sale, promotionPrice, lockStock, spData}]. Use transaction: delete all existing SKUs for this pid, then insert all new ones.
router.post('/sku/update/:pid', async (c) => {
  try {
    const pid = Number(c.req.param('pid'))
    const body = await c.req.json()
    const skuList: any[] = Array.isArray(body) ? body : []

    await db.transaction(async (tx) => {
      // Delete existing SKUs for this product
      await tx.delete(pmsSkuStock).where(eq(pmsSkuStock.productId, pid))

      // Insert all new SKUs
      if (skuList.length > 0) {
        const values = skuList.map(sku => ({
          productId: pid,
          skuCode: sku.skuCode,
          price: sku.price,
          stock: sku.stock,
          lowStock: sku.lowStock,
          pic: sku.pic,
          sale: sku.sale,
          promotionPrice: sku.promotionPrice,
          lockStock: sku.lockStock,
          spData: sku.spData,
        }))
        await tx.insert(pmsSkuStock).values(values)
      }
    })

    return c.json(success(null, '更新SKU成功'))
  } catch (e: any) {
    return c.json(failed(e?.message || '更新SKU失败'))
  }
})

export default router
