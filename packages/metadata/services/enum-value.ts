import type { MetadataPageResponse } from '../contracts/common'
import type {
  EnumValueBatchDetail,
  EnumValueBatchQueryRequest,
  EnumValueCreateRequest,
  EnumValueDetail,
  EnumValuePageRequest,
  EnumValueUpdateRequest,
} from '../contracts/enum-value'
import { metadataRequest } from '../runtime/client'

export function getEnumValuePageAPI(params: EnumValuePageRequest) {
  return metadataRequest<MetadataPageResponse<EnumValueDetail['enumValue']>>({ url: '/metadata/enum-values/page', method: 'POST', data: params })
}

export function getEnumValueDetailAPI(id: number) {
  return metadataRequest<EnumValueDetail>({ url: `/metadata/enum-values/${id}`, method: 'GET' })
}

export function getEnumValueByCodeAPI(enumCode: string, systemName: string, onlyValid = false, signal?: AbortSignal) {
  return metadataRequest<EnumValueDetail>({
    url: `/metadata/enum-values/code/${encodeURIComponent(enumCode)}`,
    method: 'GET',
    params: { systemName, onlyValid },
    signal,
  })
}

export function getEnumValueBatchAPI(params: EnumValueBatchQueryRequest, signal?: AbortSignal) {
  return metadataRequest<EnumValueBatchDetail[]>({ url: '/metadata/enum-values/batch', method: 'POST', data: params, signal })
}

export function createEnumValueAPI(data: EnumValueCreateRequest) {
  return metadataRequest<void>({ url: '/metadata/enum-values/add', method: 'POST', data })
}

export function updateEnumValueAPI(id: number, data: EnumValueUpdateRequest) {
  return metadataRequest<void>({ url: `/metadata/enum-values/${id}/update`, method: 'POST', data })
}

export function changeEnumValueStatusAPI(id: number, action: 'online' | 'offline') {
  return metadataRequest<void>({ url: `/metadata/enum-values/${id}/${action}`, method: 'POST' })
}

export function deleteEnumValueAPI(id: number) {
  return metadataRequest<void>({ url: `/metadata/enum-values/${id}/delete`, method: 'POST' })
}

export function batchDeleteEnumValuesAPI(ids: number[]) {
  return metadataRequest<void>({ url: '/metadata/enum-values/batch-delete', method: 'POST', data: ids })
}

export function changeEnumValueItemStatusAPI(id: number, enabled: 0 | 1) {
  return metadataRequest<void>({ url: `/metadata/enum-value-items/${id}/enable`, method: 'POST', params: { enabled } })
}

export function deleteEnumValueItemAPI(enumValueId: number, id: number) {
  return metadataRequest<void>({ url: `/metadata/enum-values/${enumValueId}/items/${id}/delete`, method: 'POST' })
}

export type { EnumValue, EnumValueDetail } from '../contracts/enum-value'
