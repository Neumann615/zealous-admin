import { Router } from 'express'
import { asyncHandler } from '../../middleware/error'
import { authMiddleware } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { success } from '../../lib/response'
import {
  getDictTypeList, createDictType, getAllDictTypes, getDictTypeById,
  updateDictType, deleteDictType,
  getDictDataList, createDictData, getDictDataById,
  updateDictData, deleteDictData, getDictDataByType,
} from './dict.service'
import {
  createDictTypeSchema, updateDictTypeSchema,
  createDictDataSchema, updateDictDataSchema,
  dictPageQuerySchema, dictDataPageQuerySchema,
} from './dict.schema'

const router = Router()

router.use(authMiddleware)

// ===== Dict Type =====
router.get('/dict/type/list', validate(dictPageQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const result = getDictTypeList(req.query as any)
  res.json(success(result))
}))

router.post('/dict/type/create', validate(createDictTypeSchema), asyncHandler(async (req, res) => {
  const type = createDictType(req.body)
  res.json(success(type))
}))

router.get('/dict/type/all', asyncHandler(async (_req, res) => {
  const types = getAllDictTypes()
  res.json(success(types))
}))

router.get('/dict/type/:id', asyncHandler(async (req, res) => {
  const type = getDictTypeById(Number(req.params.id))
  res.json(success(type))
}))

router.post('/dict/type/update/:id', validate(updateDictTypeSchema), asyncHandler(async (req, res) => {
  const type = updateDictType(Number(req.params.id), req.body)
  res.json(success(type))
}))

router.post('/dict/type/delete/:id', asyncHandler(async (req, res) => {
  deleteDictType(Number(req.params.id))
  res.json(success(null, '删除成功'))
}))

// ===== Dict Data =====
router.get('/dict/data/list', validate(dictDataPageQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const result = getDictDataList(req.query as any)
  res.json(success(result))
}))

router.post('/dict/data/create', validate(createDictDataSchema), asyncHandler(async (req, res) => {
  const data = createDictData(req.body)
  res.json(success(data))
}))

router.get('/dict/data/type/:dictType', asyncHandler(async (req, res) => {
  const datas = getDictDataByType(req.params.dictType)
  res.json(success(datas))
}))

router.get('/dict/data/:id', asyncHandler(async (req, res) => {
  const data = getDictDataById(Number(req.params.id))
  res.json(success(data))
}))

router.post('/dict/data/update/:id', validate(updateDictDataSchema), asyncHandler(async (req, res) => {
  const data = updateDictData(Number(req.params.id), req.body)
  res.json(success(data))
}))

router.post('/dict/data/delete/:id', asyncHandler(async (req, res) => {
  deleteDictData(Number(req.params.id))
  res.json(success(null, '删除成功'))
}))

export default router
