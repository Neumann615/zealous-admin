import { Router } from 'express'
import { success } from '../../lib/response'
import { authMiddleware } from '../../middleware/auth'
import { asyncHandler } from '../../middleware/error'
import { validate } from '../../middleware/validate'
import {
  changeMetadataItemStatus,
  changeMetadataSetStatus,
  createMetadataItem,
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
  metadataItemBatchSchema,
  metadataItemCreateSchema,
  metadataItemStatusSchema,
  metadataItemUpdateSchema,
  metadataSetCreateSchema,
  metadataSetPageSchema,
  metadataSetStatusSchema,
  metadataSetUpdateSchema,
  positiveIdSchema,
} from './validation'

const router = Router()

router.use(authMiddleware)

function getPositiveId(req: any, res: any): number | undefined {
  const result = positiveIdSchema.safeParse(req.params.id)
  if (!result.success) {
    res.status(400).json({ code: 400, message: 'id 必须是正整数', data: null })
    return undefined
  }
  return result.data
}

router.get('/sets/page', validate(metadataSetPageSchema, 'query'), asyncHandler(async (req, res) => {
  const result = getMetadataSetPage(req.query as any)
  res.json(success(result))
}))

router.get('/sets/code/:setCode/items', asyncHandler(async (req, res) => {
  const result = getOptionSet(req.params.setCode, req.query.onlyValid === 'true')
  res.json(success(result))
}))

router.get('/sets/:id', asyncHandler(async (req, res) => {
  const id = getPositiveId(req, res)
  if (id === undefined)
    return

  res.json(success(getMetadataSet(id)))
}))

router.post('/sets/add', validate(metadataSetCreateSchema), asyncHandler(async (req, res) => {
  res.json(success(createMetadataSet(req.body), '创建成功'))
}))

router.post('/sets/:id/update', validate(metadataSetUpdateSchema), asyncHandler(async (req, res) => {
  const id = getPositiveId(req, res)
  if (id === undefined)
    return

  updateMetadataSet(id, req.body)
  res.json(success(null, '更新成功'))
}))

router.post('/sets/:id/status', validate(metadataSetStatusSchema), asyncHandler(async (req, res) => {
  const id = getPositiveId(req, res)
  if (id === undefined)
    return

  changeMetadataSetStatus(id, req.body.status)
  res.json(success(null, '状态更新成功'))
}))

router.post('/sets/:id/delete', asyncHandler(async (req, res) => {
  const id = getPositiveId(req, res)
  if (id === undefined)
    return

  deleteMetadataSet(id)
  res.json(success(null, '删除成功'))
}))

router.post('/items/add', validate(metadataItemCreateSchema), asyncHandler(async (req, res) => {
  res.json(success(createMetadataItem(req.body), '创建成功'))
}))

router.post('/items/batch', validate(metadataItemBatchSchema), asyncHandler(async (req, res) => {
  const ids = req.body.items.map((item: any) => createMetadataItem({ ...item, setCode: req.body.setCode }).id)
  res.json(success({ ids }, '批量创建成功'))
}))

router.post('/items/:id/update', validate(metadataItemUpdateSchema), asyncHandler(async (req, res) => {
  const id = getPositiveId(req, res)
  if (id === undefined)
    return

  updateMetadataItem(id, req.body)
  res.json(success(null, '更新成功'))
}))

router.post('/items/:id/status', validate(metadataItemStatusSchema), asyncHandler(async (req, res) => {
  const id = getPositiveId(req, res)
  if (id === undefined)
    return

  changeMetadataItemStatus(id, req.body.status)
  res.json(success(null, '状态更新成功'))
}))

router.post('/items/:id/delete', asyncHandler(async (req, res) => {
  const id = getPositiveId(req, res)
  if (id === undefined)
    return

  deleteMetadataItem(id)
  res.json(success(null, '删除成功'))
}))

export default router
