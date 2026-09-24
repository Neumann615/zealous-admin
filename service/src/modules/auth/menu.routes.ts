import { Router } from 'express'
import { success } from '../../lib/response'
import { authMiddleware } from '../../middleware/auth'
import { asyncHandler } from '../../middleware/error'
import { getPermissionCodes, permissionMiddleware } from '../../middleware/permission'
import { validate } from '../../middleware/validate'
import { createMenuSchema, updateMenuSchema } from './menu.schema'
import {
  createMenu,
  deleteMenu,
  getAllMenus,
  getMenuById,
  getMenuList,
  getMenuTree,
  updateMenu,
} from './menu.service'

const router = Router()

router.use(authMiddleware, permissionMiddleware)

router.get('/menu/list', asyncHandler(async (req, res) => {
  const parentId = Number(req.query.parentId) || 0
  const menus = getMenuList(parentId)
  res.json(success(menus))
}))

router.get('/menu/tree', asyncHandler(async (_req, res) => {
  const tree = getMenuTree()
  res.json(success(tree))
}))

router.get('/menu/all', asyncHandler(async (_req, res) => {
  const menus = getAllMenus()
  res.json(success(menus))
}))

router.get('/menu/permissions', asyncHandler(async (_req, res) => {
  res.json(success(getPermissionCodes()))
}))

router.post('/menu/create', validate(createMenuSchema), asyncHandler(async (req, res) => {
  const menu = createMenu(req.body)
  res.json(success(menu))
}))

router.get('/menu/:id', asyncHandler(async (req, res) => {
  const menu = getMenuById(Number(req.params.id))
  res.json(success(menu))
}))

router.post('/menu/update/:id', validate(updateMenuSchema), asyncHandler(async (req, res) => {
  const menu = updateMenu(Number(req.params.id), req.body)
  res.json(success(menu))
}))

router.post('/menu/delete/:id', asyncHandler(async (req, res) => {
  deleteMenu(Number(req.params.id))
  res.json(success(null, '删除成功'))
}))

export default router
