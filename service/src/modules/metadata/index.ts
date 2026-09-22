import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth'
import enumValueRoutes from './enum-value.routes'
import fieldStandardRoutes from './field-standard.routes'
import qualityRuleRoutes from './quality-rule.routes'
import tableMetadataRoutes from './table-metadata.routes'
import wordRootRoutes from './word-root.routes'

const router = Router()

router.use(authMiddleware)
router.use(enumValueRoutes)
router.use(wordRootRoutes)
router.use(tableMetadataRoutes)
router.use(fieldStandardRoutes)
router.use(qualityRuleRoutes)

export default router
