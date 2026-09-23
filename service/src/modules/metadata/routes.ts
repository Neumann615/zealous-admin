import type { Request } from 'express'
import { Router } from 'express'
import { success } from '../../lib/response'
import { authMiddleware } from '../../middleware/auth'
import { asyncHandler } from '../../middleware/error'
import { validate } from '../../middleware/validate'
import {
  changeMetadataItemStatus,
  changeMetadataSetStatus,
  createMetadataItem,
  createMetadataItems,
  createMetadataSet,
  deleteMetadataItem,
  deleteMetadataSet,
  getMetadataSet,
  getMetadataSetPage,
  getOptionSet,
  updateMetadataItem,
  updateMetadataSet,
} from './service'
import {
  metadataIdParamSchema,
  metadataItemBatchSchema,
  metadataItemCreateSchema,
  metadataItemStatusSchema,
  metadataItemUpdateSchema,
  metadataSetCreateSchema,
  metadataSetPageSchema,
  metadataSetStatusSchema,
  metadataSetUpdateSchema,
} from './validation'

const router = Router()

router.use(authMiddleware)

/** params 已由 validate 中间件 coerce 成正整数 */
function idOf(req: Request): number {
  return (req.params as unknown as { id: number }).id
}

router.get('/sets/page', validate(metadataSetPageSchema, 'query'), asyncHandler(async (req, res) => {
  const result = getMetadataSetPage(req.query as any)
  res.json(success(result))
}))

router.get('/sets/code/:setCode/items', asyncHandler(async (req, res) => {
  const result = getOptionSet(
    req.params.setCode,
    req.query.onlyValid === 'true',
    req.query.includeDisabled === 'true',
  )
  res.json(success(result))
}))

router.get('/sets/:id', validate(metadataIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  res.json(success(getMetadataSet(idOf(req))))
}))

router.post('/sets/add', validate(metadataSetCreateSchema), asyncHandler(async (req, res) => {
  res.json(success(createMetadataSet(req.body), '创建成功'))
}))

router.post('/sets/:id/update', validate(metadataSetUpdateSchema), validate(metadataIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  updateMetadataSet(idOf(req), req.body)
  res.json(success(null, '更新成功'))
}))

router.post('/sets/:id/status', validate(metadataSetStatusSchema), validate(metadataIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  changeMetadataSetStatus(idOf(req), req.body.status)
  res.json(success(null, '状态更新成功'))
}))

router.post('/sets/:id/delete', validate(metadataIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  deleteMetadataSet(idOf(req))
  res.json(success(null, '删除成功'))
}))

router.post('/items/add', validate(metadataItemCreateSchema), asyncHandler(async (req, res) => {
  res.json(success(createMetadataItem(req.body), '创建成功'))
}))

router.post('/items/batch', validate(metadataItemBatchSchema), asyncHandler(async (req, res) => {
  const ids = createMetadataItems(req.body.setCode, req.body.items)
  res.json(success({ ids }, '批量创建成功'))
}))

router.post('/items/:id/update', validate(metadataItemUpdateSchema), validate(metadataIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  updateMetadataItem(idOf(req), req.body)
  res.json(success(null, '更新成功'))
}))

router.post('/items/:id/status', validate(metadataItemStatusSchema), validate(metadataIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  changeMetadataItemStatus(idOf(req), req.body.status)
  res.json(success(null, '状态更新成功'))
}))

router.post('/items/:id/delete', validate(metadataIdParamSchema, 'params'), asyncHandler(async (req, res) => {
  deleteMetadataItem(idOf(req))
  res.json(success(null, '删除成功'))
}))

export default router