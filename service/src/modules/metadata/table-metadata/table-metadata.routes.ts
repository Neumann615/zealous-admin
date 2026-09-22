import { Router } from 'express'
import { asyncMetadataHandler, METADATA_BIZ_BASE_PATH, proxyMetadataJson } from '../shared/upstream'
import { parseIdBody, parseIdParam } from '../shared/validation'

const router = Router()
const resource = `${METADATA_BIZ_BASE_PATH}/table-metadata`

router.post('/table-metadata/page', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${resource}/page`, 'POST', req.body)
}))

router.post('/table-metadata/add', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${resource}/add`, 'POST', req.body)
}))

router.post('/table-metadata/generate-scripts', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${resource}/generate-script-and-upload`, 'POST', req.body)
}))

router.get('/table-metadata/:id', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/detail/${id}`)
}))

router.post('/table-metadata/:id/update', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/update/${id}`, 'POST', req.body)
}))

router.post('/table-metadata/:id/generate-script', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/generate-script/${id}`, 'POST', req.body)
}))

router.post('/table-metadata/:id/delete', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${resource}/delete/${id}`, 'POST')
}))

router.post('/table-metadata/batch-delete', asyncMetadataHandler(async (req, res) => {
  const ids = parseIdBody(req, res)
  if (!ids)
    return
  await proxyMetadataJson(req, res, `${resource}/batch-delete`, 'POST', ids)
}))

export default router
