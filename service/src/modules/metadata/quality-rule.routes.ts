import { Router } from 'express'
import { asyncMetadataHandler, METADATA_BIZ_BASE_PATH, proxyMetadataJson } from './upstream'
import { parseIdBody, parseIdParam } from './validation'

const router = Router()
const resource = `${METADATA_BIZ_BASE_PATH}/quality-rule`

router.post('/quality-rules/page', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${resource}/page`, 'POST', req.body)
}))

router.post('/quality-rules/add', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${resource}/add`, 'POST', req.body)
}))

router.get('/quality-rules/:id', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/detail/${id}`)
}))

for (const action of ['online', 'offline'] as const) {
  router.post(`/quality-rules/:id/${action}`, asyncMetadataHandler(async (req, res) => {
    const id = parseIdParam(req, res)
    if (id === undefined)
      return
    await proxyMetadataJson(req, res, `${resource}/${action}/${id}`, 'POST')
  }))
}

router.post('/quality-rules/:id/update', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/update/${id}`, 'POST', req.body)
}))

router.post('/quality-rules/:id/delete', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/delete/${id}`, 'POST')
}))

router.post('/quality-rules/batch-delete', asyncMetadataHandler(async (req, res) => {
  const ids = parseIdBody(req, res)
  if (!ids)
    return
  await proxyMetadataJson(req, res, `${resource}/batch-delete`, 'POST', ids)
}))

export default router
