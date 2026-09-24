import type { Request } from 'express'
import express from 'express'
import { asyncHandler } from '../../middleware/error'
import { authMiddleware } from '../../middleware/auth'
import { permissionMiddleware } from '../../middleware/permission'
import { validate } from '../../middleware/validate'
import { success } from '../../lib/response'
import { getFormFile, saveFormFile } from './formFile.service'
import { formFileObjectSchema } from './formFile.schema'

const router = express.Router()

function singleHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

router.use(authMiddleware, permissionMiddleware)

router.post('/form/files/upload', express.raw({ type: () => true, limit: '10mb' }), asyncHandler(async (req: Request, res) => {
  let fileName = String(req.headers['x-file-name'] || '')
  try {
    fileName = decodeURIComponent(fileName)
  }
  catch {
    fileName = 'unnamed'
  }
  const record = saveFormFile({
    content: req.body as Buffer,
    fileName,
    fileType: singleHeader(req.headers['x-file-type']),
    uploadedBy: req.username,
  })
  res.json(success(record, '上传成功'))
}))

router.get('/form/files/:objectId', validate(formFileObjectSchema, 'params'), asyncHandler(async (req, res) => {
  const file = getFormFile((req.params as any).objectId)
  const asciiName = file.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'")
  res.setHeader('Content-Type', file.fileType)
  res.setHeader('Content-Length', file.fileSize)
  res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
  res.send(file.content)
}))

export default router
