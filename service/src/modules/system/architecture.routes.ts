import { Router } from 'express'
import { success } from '../../lib/response'
import { asyncHandler } from '../../middleware/error'
import { authMiddleware } from '../../middleware/auth'
import { permissionMiddleware } from '../../middleware/permission'
import { getArchitecture } from './architecture.service'

const router = Router()

router.use(authMiddleware, permissionMiddleware)

router.get('/system/architecture', asyncHandler(async (_req, res) => {
  res.json(success(getArchitecture()))
}))

export default router
