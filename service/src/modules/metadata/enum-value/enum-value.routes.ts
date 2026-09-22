import { Router } from 'express'
import {
  appendMetadataQuery,
  asyncMetadataHandler,
  METADATA_BIZ_BASE_PATH,
  METADATA_INNER_BASE_PATH,
  proxyMetadataJson,
} from '../shared/upstream'
import { parseEnabledParam, parseIdBody, parseIdParam } from '../shared/validation'

const router = Router()

router.post('/enum-values/page', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${METADATA_BIZ_BASE_PATH}/enum-value/page`, 'POST', req.body)
}))

router.get('/enum-values/code/:enumCode', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(
    req,
    res,
    appendMetadataQuery(req, `${METADATA_BIZ_BASE_PATH}/enum-value/detail/code/${encodeURIComponent(String(req.params.enumCode))}`, [
      'systemName',
      'onlyValid',
    ]),
    'GET',
    undefined,
  )
}))

router.post('/enum-values/batch', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${METADATA_INNER_BASE_PATH}/enum-value/batch-detail`, 'POST', req.body)
}))

router.post('/enum-values/add', asyncMetadataHandler(async (req, res) => {
  await proxyMetadataJson(req, res, `${METADATA_BIZ_BASE_PATH}/enum-value/add`, 'POST', req.body)
}))

router.get('/enum-values/:id', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${METADATA_BIZ_BASE_PATH}/enum-value/detail/${id}`)
}))

router.post('/enum-values/:id/update', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${METADATA_BIZ_BASE_PATH}/enum-value/update/${id}`, 'POST', req.body)
}))

for (const action of ['online', 'offline'] as const) {
  router.post(`/enum-values/:id/${action}`, asyncMetadataHandler(async (req, res) => {
    const id = parseIdParam(req, res)
    if (id === undefined)
      return
    await proxyMetadataJson(req, res, `${METADATA_BIZ_BASE_PATH}/enum-value/${action}/${id}`, 'POST')
  }))
}

router.post('/enum-values/:id/delete', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  if (id === undefined)
    return
  await proxyMetadataJson(req, res, `${METADATA_BIZ_BASE_PATH}/enum-value/delete/${id}`, 'POST')
}))

router.post('/enum-values/batch-delete', asyncMetadataHandler(async (req, res) => {
  const ids = parseIdBody(req, res)
  if (!ids)
    return
  await proxyMetadataJson(req, res, `${METADATA_BIZ_BASE_PATH}/enum-value/batch-delete`, 'POST', ids)
}))

router.post('/enum-value-items/:id/enable', asyncMetadataHandler(async (req, res) => {
  const id = parseIdParam(req, res)
  const enabled = parseEnabledParam(req, res)
  if (id === undefined || enabled === undefined)
    return
  await proxyMetadataJson(
    req,
    res,
    `${METADATA_BIZ_BASE_PATH}/enum-value/sub-type/enable/${id}?enabled=${enabled}`,
    'POST',
  )
}))

router.post('/enum-values/:enumValueId/items/:id/delete', asyncMetadataHandler(async (req, res) => {
  const enumValueId = parseIdParam(req, res, 'enumValueId')
  const id = parseIdParam(req, res, 'id')
  if (enumValueId === undefined || id === undefined)
    return
  await proxyMetadataJson(req, res, `${METADATA_BIZ_BASE_PATH}/enum-value/sub-type/delete/${enumValueId}/${id}`, 'POST')
}))

export default router
