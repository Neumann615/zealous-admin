import { Router } from 'express'
import { asyncHandler } from '../../middleware/error'
import { authMiddleware } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { success } from '../../lib/response'
import {
  getFormList, getFormDetail, createForm,
  updateForm, deleteForm, renderForm,
} from './form.service'
import {
  createFormSchema, updateFormSchema, deleteFormSchema,
  renderFormSchema, formPageQuerySchema,
} from './form.schema'

const router = Router()

router.use(authMiddleware)

router.get('/form/list', validate(formPageQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const result = getFormList(req.query as any)
  res.json(success(result))
}))

router.get('/form/detail', asyncHandler(async (req, res) => {
  const detail = getFormDetail(Number(req.query.id))
  res.json(success(detail))
}))

router.post('/form/create', validate(createFormSchema), asyncHandler(async (req, res) => {
  const form = createForm(req.body)
  res.json(success(form, '创建成功'))
}))

router.post('/form/update', validate(updateFormSchema), asyncHandler(async (req, res) => {
  updateForm(req.body)
  res.json(success(null, '更新成功'))
}))

router.post('/form/delete', validate(deleteFormSchema), asyncHandler(async (req, res) => {
  deleteForm(req.body.id)
  res.json(success(null, '删除成功'))
}))

router.post('/form/render', validate(renderFormSchema), asyncHandler(async (req, res) => {
  const { formId, data, dataId } = req.body
  const result = renderForm(formId, data, dataId)
  res.json(success(result))
}))

export default router
