import { Router } from 'express'
import { asyncHandler } from '../../middleware/error'
import { authMiddleware } from '../../middleware/auth'
import { permissionMiddleware } from '../../middleware/permission'
import { validate } from '../../middleware/validate'
import { success } from '../../lib/response'
import {
  createDraft,
  createForm,
  deleteForm,
  getFormDetail,
  getFormList,
  getFormVersions,
  publishForm,
  renderForm,
  retireForm,
  reviveForm,
  updateForm,
} from './form.service'
import {
  createCategory,
  deleteCategory,
  getCategoryTree,
  updateCategory,
  updateCategoryStatus,
} from './formCategory.service'
import {
  createFormCategorySchema,
  createFormSchema,
  deleteFormSchema,
  formDetailQuerySchema,
  formIdSchema,
  formPageQuerySchema,
  formCategoryStatusSchema,
  renderFormSchema,
  updateFormSchema,
  updateFormCategorySchema,
} from './form.schema'

const router = Router()

router.use(authMiddleware, permissionMiddleware)

router.get('/form/list', validate(formPageQuerySchema, 'query'), asyncHandler(async (req, res) => {
  res.json(success(getFormList(req.query as any)))
}))

router.get('/form/detail', validate(formDetailQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { id, versionId } = req.query as any
  res.json(success(getFormDetail(id, versionId)))
}))

router.get('/form/versions', validate(formIdSchema, 'query'), asyncHandler(async (req, res) => {
  res.json(success(getFormVersions((req.query as any).id)))
}))

router.get('/form/categories/tree', asyncHandler(async (_req, res) => {
  res.json(success(getCategoryTree()))
}))

router.post('/form/categories/create', validate(createFormCategorySchema), asyncHandler(async (req, res) => {
  res.json(success(createCategory(req.body), '创建成功'))
}))

router.post('/form/categories/:id/update', validate(updateFormCategorySchema), asyncHandler(async (req, res) => {
  res.json(success(updateCategory(Number(req.params.id), req.body), '保存成功'))
}))

router.post('/form/categories/:id/status', validate(formCategoryStatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body
  res.json(success(updateCategoryStatus(Number(req.params.id), status), status === 1 ? '已启用' : '已停用'))
}))

router.post('/form/categories/:id/delete', asyncHandler(async (req, res) => {
  res.json(success(deleteCategory(Number(req.params.id)), '删除成功'))
}))

router.post('/form/create', validate(createFormSchema), asyncHandler(async (req, res) => {
  res.json(success(createForm(req.body), '创建成功'))
}))

router.post('/form/update', validate(updateFormSchema), asyncHandler(async (req, res) => {
  res.json(success(updateForm(req.body), '保存成功'))
}))

router.post('/form/draft', validate(formIdSchema), asyncHandler(async (req, res) => {
  res.json(success(createDraft(req.body.id), '已派生新草稿'))
}))

router.post('/form/publish', validate(formIdSchema), asyncHandler(async (req, res) => {
  res.json(success(publishForm(req.body.id), '发布成功'))
}))

router.post('/form/retire', validate(formIdSchema), asyncHandler(async (req, res) => {
  res.json(success(retireForm(req.body.id), '已退役'))
}))

router.post('/form/revive', validate(formIdSchema), asyncHandler(async (req, res) => {
  res.json(success(reviveForm(req.body.id), '已恢复'))
}))

router.post('/form/delete', validate(deleteFormSchema), asyncHandler(async (req, res) => {
  const result = deleteForm(req.body.id)
  res.json(success(result, result.discardedDraft ? '已放弃草稿' : '删除成功'))
}))

router.post('/form/render', validate(renderFormSchema), asyncHandler(async (req, res) => {
  const { formId, data, dataId, versionId, allowDraft } = req.body
  res.json(success(renderForm(formId, data, dataId, versionId, allowDraft)))
}))

export default router
