import { Router } from 'express'
import { asyncMetadataHandler, METADATA_BIZ_BASE_PATH, proxyMetadataJson } from './upstream'
import { parseIdBody, parseIdParam } from './validation'

const router = Router()
const resource = `${METADATA_BIZ_BASE_PATH}/word-root`

router.post('/word-roots/page', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${resource}/page`, 'POST', req.body)
}))

router.post('/word-roots/add', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${resource}/add`, 'POST', req.body)
}))

router.get('/word-roots/:id', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/detail/${id}`)
}))

router.post('/word-roots/:id/update', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/update/${id}`, 'POST', req.body)
}))

router.post('/word-roots/:id/delete', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/delete/${id}`, 'POST')
}))

router.post('/word-roots/batch-delete', asyncMetadataHandler(async (req, res) => {
  const ids = parseIdBody(req, res)
  if (!ids)
    return
  await proxyMetadataJson(req, res, `${resource}/batch-delete`, 'POST', ids)
}))

export default router
