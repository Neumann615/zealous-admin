export interface MetadataPageRequest {
  pageNum?: number
  pageSize?: number
}

export interface MetadataPageResponse<T> {
  list: T[]
  total: number
  pageNum?: number
  pageSize?: number
  pages?: number
  current?: number
  size?: number
}

export type MetadataEnabledStatus = 0 | 1

export interface MetadataAuditedRecord {
  id: number
  updater?: string
  updatedAt?: string
  createdAt?: string
}
