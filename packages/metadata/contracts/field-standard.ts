import type { MetadataAuditedRecord, MetadataEnabledStatus, MetadataPageRequest } from './common'

export interface FieldStandard extends MetadataAuditedRecord {
  cnName: string
  enName: string
  businessDefinition?: string
  enFullName?: string
  source?: string
  dataType: string
  enumValues?: string
  remark?: string
  status: MetadataEnabledStatus
}

export interface FieldStandardPageRequest extends MetadataPageRequest {
  cnName?: string
  enName?: string
  updater?: string
  status?: MetadataEnabledStatus
}

export interface FieldStandardSaveRequest {
  cnName: string
  enName: string
  businessDefinition?: string
  enFullName?: string
  source?: string
  dataType: string
  enumValues?: string
  remark?: string
}

export interface FieldStandardBatchStatusRequest {
  ids: number[]
  status: MetadataEnabledStatus
}
