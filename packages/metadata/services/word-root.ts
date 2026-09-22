import type { MetadataPageResponse } from '../contracts/common'
import type { WordRoot, WordRootPageRequest, WordRootSaveRequest } from '../contracts/word-root'
import { metadataRequest } from '../runtime/client'

export function getWordRootPageAPI(params: WordRootPageRequest) {
  return metadataRequest<MetadataPageResponse<WordRoot>>({ url: '/metadata/word-roots/page', method: 'POST', data: params })
}

export function getWordRootDetailAPI(id: number) {
  return metadataRequest<WordRoot>({ url: `/metadata/word-roots/${id}`, method: 'GET' })
}

export function createWordRootAPI(data: WordRootSaveRequest) {
  return metadataRequest<void>({ url: '/metadata/word-roots/add', method: 'POST', data })
}

export function updateWordRootAPI(id: number, data: WordRootSaveRequest) {
  return metadataRequest<void>({ url: `/metadata/word-roots/${id}/update`, method: 'POST', data })
}

export function deleteWordRootAPI(id: number) {
  return metadataRequest<void>({ url: `/metadata/word-roots/${id}/delete`, method: 'POST' })
}

export function batchDeleteWordRootsAPI(ids: number[]) {
  return metadataRequest<void>({ url: '/metadata/word-roots/batch-delete', method: 'POST', data: ids })
}
