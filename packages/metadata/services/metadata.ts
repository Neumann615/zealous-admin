import type {
  MetadataItemCreateRequest,
  MetadataItemSaveRequest,
  MetadataSet,
  MetadataSetPageRequest,
  MetadataSetPageResponse,
  MetadataSetSaveRequest,
  OptionSet,
} from '../contracts/metadata'
import { metadataRequest } from '../runtime/client'

export function getOptionSetPageAPI(params: MetadataSetPageRequest) {
  return metadataRequest<MetadataSetPageResponse>({ url: '/metadata/sets/page', params: { ...params } })
}

export function getOptionSetAPI(id: number) {
  return metadataRequest<MetadataSet>({ url: `/metadata/sets/${id}` })
}

export function getOptionSetByCodeAPI(
  setCode: string,
  options: { onlyValid?: boolean, signal?: AbortSignal } = {},
) {
  return metadataRequest<OptionSet>({
    url: `/metadata/sets/code/${encodeURIComponent(setCode)}/items`,
    params: options.onlyValid === undefined ? undefined : { onlyValid: options.onlyValid },
    signal: options.signal,
  })
}

export function createOptionSetAPI(data: MetadataSetSaveRequest & { code: string, name: string }) {
  return metadataRequest<{ id: number }>({ url: '/metadata/sets/add', method: 'POST', data })
}

export function updateOptionSetAPI(id: number, data: MetadataSetSaveRequest) {
  return metadataRequest<null>({ url: `/metadata/sets/${id}/update`, method: 'POST', data })
}

export function changeOptionSetStatusAPI(id: number, status: 0 | 1) {
  return metadataRequest<null>({ url: `/metadata/sets/${id}/status`, method: 'POST', data: { status } })
}

export function deleteOptionSetAPI(id: number) {
  return metadataRequest<null>({ url: `/metadata/sets/${id}/delete`, method: 'POST' })
}

export function createOptionSetItemAPI(data: MetadataItemCreateRequest) {
  return metadataRequest<{ id: number }>({ url: '/metadata/items/add', method: 'POST', data })
}

export function createOptionSetItemsAPI(setCode: string, items: Array<MetadataItemSaveRequest & { code: string, name: string }>) {
  return metadataRequest<{ ids: number[] }>({ url: '/metadata/items/batch', method: 'POST', data: { setCode, items } })
}

export function updateOptionSetItemAPI(id: number, data: MetadataItemSaveRequest) {
  return metadataRequest<null>({ url: `/metadata/items/${id}/update`, method: 'POST', data })
}

export function changeOptionSetItemStatusAPI(id: number, status: 0 | 1) {
  return metadataRequest<null>({ url: `/metadata/items/${id}/status`, method: 'POST', data: { status } })
}

export function deleteOptionSetItemAPI(id: number) {
  return metadataRequest<null>({ url: `/metadata/items/${id}/delete`, method: 'POST' })
}
