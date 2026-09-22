import type { MetadataAuditedRecord, MetadataPageRequest } from './common'

export interface WordRoot extends MetadataAuditedRecord {
  rootAbbr: string
  rootFull: string
  rootCnName: string
  description?: string
}

export interface WordRootPageRequest extends MetadataPageRequest {
  keyword?: string
  rootCnName?: string
  updater?: string
}

export interface WordRootSaveRequest {
  rootAbbr: string
  rootFull: string
  rootCnName: string
  description?: string
}
