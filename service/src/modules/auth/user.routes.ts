import { Router } from 'express'
import { asyncHandler } from '../../middleware/error'
import { authMiddleware } from '../../middleware/auth'
import { permissionMiddleware } from '../../middleware/permission'
import { validate } from '../../middleware/validate'
import { success } from '../../lib/response'
import {
  register, getUserList, getUserById, updateUser, deleteUser,
  updateUserStatus, assignRoles, getUserRoles,
} from './user.service'
import { registerSchema, updateUserSchema, pageQuerySchema, assignRolesSchema } from './user.schema'

const router = Router()

router.use(authMiddleware, permissionMiddleware)

router.post('/admin/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const admin = await register(req.body)
  res.json(success(admin))
}))

router.get('/admin/list', validate(pageQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const result = getUserList(req.query as any)
  res.json(success(result))
}))

router.get('/admin/:id', asyncHandler(async (req, res) => {
  const admin = getUserById(Number(req.params.id))
  res.json(success(admin))
}))

router.post('/admin/update/:id', validate(updateUserSchema), asyncHandler(async (req, res) => {
  const admin = await updateUser(Number(req.params.id), req.body)
  res.json(success(admin))
}))

router.post('/admin/delete/:id', asyncHandler(async (req, res) => {
  deleteUser(Number(req.params.id))
  res.json(success(null, '删除成功'))
}))

router.post('/admin/updateStatus/:id', asyncHandler(async (req, res) => {
  const status = Number(req.query.status) || 1
  updateUserStatus(Number(req.params.id), status)
  res.json(success(null, '状态更新成功'))
}))

router.post('/admin/role/update', validate(assignRolesSchema, 'query'), asyncHandler(async (req, res) => {
  assignRoles(Number(req.query.adminId), (req.query.roleIds as string) || '')
  res.json(success(null, '角色分配成功'))
}))

router.get('/admin/role/:adminId', asyncHandler(async (req, res) => {
  const roles = getUserRoles(Number(req.params.adminId))
  res.json(success(roles))
}))

export default router
