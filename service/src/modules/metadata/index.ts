import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth'
import enumValueRoutes from './enum-value/enum-value.routes'
import fieldStandardRoutes from './field-standard/field-standard.routes'
import qualityRuleRoutes from './quality-rule/quality-rule.routes'
import tableMetadataRoutes from './table-metadata/table-metadata.routes'
import wordRootRoutes from './word-root/word-root.routes'

const router = Router()

router.use(authMiddleware)
router.use(enumValueRoutes)
router.use(wordRootRoutes)
router.use(tableMetadataRoutes)
router.use(fieldStandardRoutes)
router.use(qualityRuleRoutes)

export default router
