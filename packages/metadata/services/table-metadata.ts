import type { MetadataPageResponse } from '../contracts/common'
import type {
  TableMetadata,
  TableMetadataDetail,
  TableMetadataPageRequest,
  TableMetadataScriptRequest,
} from '../contracts/table-metadata'
import { metadataRequest } from '../runtime/client'

export function getTableMetadataPageAPI(params: TableMetadataPageRequest) {
  return metadataRequest<MetadataPageResponse<TableMetadata>>({ url: '/metadata/table-metadata/page', method: 'POST', data: params })
}

export function getTableMetadataDetailAPI(id: number) {
  return metadataRequest<TableMetadataDetail>({ url: `/metadata/table-metadata/${id}`, method: 'GET' })
}

export function createTableMetadataAPI(data: TableMetadataDetail) {
  return metadataRequest<void>({ url: '/metadata/table-metadata/add', method: 'POST', data })
}

export function updateTableMetadataAPI(id: number, data: TableMetadataDetail) {
  return metadataRequest<void>({ url: `/metadata/table-metadata/${id}/update`, method: 'POST', data })
}

export function deleteTableMetadataAPI(id: number) {
  return metadataRequest<void>({ url: `/metadata/table-metadata/${id}/delete`, method: 'POST' })
}

export function batchDeleteTableMetadataAPI(ids: number[]) {
  return metadataRequest<void>({ url: '/metadata/table-metadata/batch-delete', method: 'POST', data: ids })
}

export function generateTableMetadataScriptAPI(id: number, data: TableMetadataScriptRequest) {
  return metadataRequest<string>({ url: `/metadata/table-metadata/${id}/generate-script`, method: 'POST', data })
}

export function batchGenerateTableMetadataScriptsAPI() {
  return metadataRequest<void>({ url: '/metadata/table-metadata/generate-scripts', method: 'POST' })
}
