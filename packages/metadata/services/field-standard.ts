import type { MetadataPageResponse } from '../contracts/common'
import type {
  FieldStandard,
  FieldStandardBatchStatusRequest,
  FieldStandardPageRequest,
  FieldStandardSaveRequest,
} from '../contracts/field-standard'
import { metadataRequest } from '../runtime/client'

export function getFieldStandardPageAPI(params: FieldStandardPageRequest) {
  return metadataRequest<MetadataPageResponse<FieldStandard>>({ url: '/metadata/field-standards/page', method: 'POST', data: params })
}

export function getFieldStandardDetailAPI(id: number) {
  return metadataRequest<FieldStandard>({ url: `/metadata/field-standards/${id}`, method: 'GET' })
}

export function createFieldStandardAPI(data: FieldStandardSaveRequest) {
  return metadataRequest<void>({ url: '/metadata/field-standards/add', method: 'POST', data })
}

export function updateFieldStandardAPI(id: number, data: FieldStandardSaveRequest) {
  return metadataRequest<void>({ url: `/metadata/field-standards/${id}/update`, method: 'POST', data })
}

export function changeFieldStandardStatusAPI(id: number, action: 'online' | 'offline') {
  return metadataRequest<void>({ url: `/metadata/field-standards/${id}/${action}`, method: 'POST' })
}

export function batchChangeFieldStandardStatusAPI(data: FieldStandardBatchStatusRequest) {
  return metadataRequest<void>({ url: '/metadata/field-standards/batch-status', method: 'POST', data })
}

export function deleteFieldStandardAPI(id: number) {
  return metadataRequest<void>({ url: `/metadata/field-standards/${id}/delete`, method: 'POST' })
}

export function batchDeleteFieldStandardsAPI(ids: number[]) {
  return metadataRequest<void>({ url: '/metadata/field-standards/batch-delete', method: 'POST', data: ids })
}
