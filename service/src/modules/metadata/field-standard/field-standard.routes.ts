import { Router } from 'express'
import { asyncMetadataHandler, METADATA_BIZ_BASE_PATH, proxyMetadataJson } from '../shared/upstream'
import { parseIdBody, parseIdParam } from '../shared/validation'

const router = Router()
const resource = `${METADATA_BIZ_BASE_PATH}/field-standard`

router.post('/field-standards/page', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${resource}/page`, 'POST', req.body)
}))

router.post('/field-standards/add', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${resource}/add`, 'POST', req.body)
}))

router.post('/field-standards/batch-status', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${resource}/batch-online-offline`, 'POST', req.body)
}))

router.get('/field-standards/:id', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/detail/${id}`)
}))

for (const action of ['online', 'offline'] as const) {
  router.post(`/field-standards/:id/${action}`, asyncMetadataHandler(async (req, res) => {
    const id = parseIdParam(req, res)
    if (id === undefined)
      return
    await proxyMetadataJson(req, res, `${resource}/${action}/${id}`, 'POST')
  }))
}

router.post('/field-standards/:id/update', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/update/${id}`, 'POST', req.body)
}))

router.post('/field-standards/:id/delete', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/delete/${id}`, 'POST')
}))

router.post('/field-standards/batch-delete', asyncMetadataHandler(async (req, res) => {
  const ids = parseIdBody(req, res)
  if (!ids)
    return
  await proxyMetadataJson(req, res, `${resource}/batch-delete`, 'POST', ids)
}))

export default router
