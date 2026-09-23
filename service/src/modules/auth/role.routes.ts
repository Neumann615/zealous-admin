import { Router } from 'express'
import { asyncHandler } from '../../middleware/error'
import { authMiddleware } from '../../middleware/auth'
import { permissionMiddleware } from '../../middleware/permission'
import { validate } from '../../middleware/validate'
import { success } from '../../lib/response'
import {
  getRoleList, createRole, getAllRoles, getRoleById,
  updateRole, deleteRole, getRoleMenus, assignMenus,
} from './role.service'
import {
  createRoleSchema, updateRoleSchema, rolePageQuerySchema, assignMenusSchema,
} from './role.schema'

const router = Router()

router.use(authMiddleware, permissionMiddleware)

router.get('/role/list', validate(rolePageQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const result = getRoleList(req.query as any)
  res.json(success(result))
}))

router.post('/role/create', validate(createRoleSchema), asyncHandler(async (req, res) => {
  const role = await createRole(req.body)
  res.json(success(role))
}))

router.get('/role/all', asyncHandler(async (_req, res) => {
  const roles = getAllRoles()
  res.json(success(roles))
}))

router.get('/role/menu/:roleId', asyncHandler(async (req, res) => {
  const menus = getRoleMenus(Number(req.params.roleId))
  res.json(success(menus))
}))

router.post('/role/menu/update', validate(assignMenusSchema, 'query'), asyncHandler(async (req, res) => {
  assignMenus(Number(req.query.roleId), (req.query.menuIds as string) || '')
  res.json(success(null, '菜单分配成功'))
}))

router.get('/role/:id', asyncHandler(async (req, res) => {
  const role = getRoleById(Number(req.params.id))
  res.json(success(role))
}))

router.post('/role/update/:id', validate(updateRoleSchema), asyncHandler(async (req, res) => {
  const role = updateRole(Number(req.params.id), req.body)
  res.json(success(role))
}))

router.post('/role/delete/:id', asyncHandler(async (req, res) => {
  deleteRole(Number(req.params.id))
  res.json(success(null, '删除成功'))
}))

export default router
