import { Router } from 'express'
import { asyncHandler } from '../../middleware/error'
import { authMiddleware } from '../../middleware/auth'
import { permissionMiddleware } from '../../middleware/permission'
import { validate } from '../../middleware/validate'
import { success } from '../../lib/response'
import {
  submitFormData, getFormDataList, getFormDataDetail,
  updateFormDataStatus, deleteFormData,
} from './formData.service'
import {
  submitFormDataSchema, updateStatusSchema,
  deleteFormDataSchema, formDataDetailQuerySchema, formDataPageQuerySchema,
} from './formData.schema'

const router = Router()

router.use(authMiddleware, permissionMiddleware)

router.post('/form/data/submit', validate(submitFormDataSchema), asyncHandler(async (req, res) => {
  const { formId, data } = req.body
  const result = submitFormData(formId, data, req.username || '')
  res.json(success(result, '提交成功'))
}))

router.get('/form/data/list', validate(formDataPageQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const result = getFormDataList(req.query as any)
  res.json(success(result))
}))

router.get('/form/data/detail', validate(formDataDetailQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const detail = getFormDataDetail((req.query as any).id)
  res.json(success(detail))
}))

router.post('/form/data/updateStatus', validate(updateStatusSchema), asyncHandler(async (req, res) => {
  const { id, status } = req.body
  const message = updateFormDataStatus(id, status)
  res.json(success(null, message))
}))

router.post('/form/data/delete', validate(deleteFormDataSchema), asyncHandler(async (req, res) => {
  deleteFormData(req.body.id)
  res.json(success(null, '删除成功'))
}))

export default router
