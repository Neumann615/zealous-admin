import type { MetadataAuditedRecord, MetadataPageRequest } from './common'

export interface TableMetadata extends MetadataAuditedRecord {
  tableName: string
  tableCnName: string
  dbType: string
  dbTypeDesc?: string
  systemType: string
  systemTypeDesc?: string
  systemName: string
  systemNameDesc?: string
  databaseName: string
  databaseNameDesc?: string
  tableType?: '表' | '视图'
}

export interface TableFieldMetadata {
  id?: number
  fieldName: string
  fieldCnName: string
  dataType: string
  defaultValue?: string
  isPrimaryKey?: 'Y' | 'N'
  isNullable?: 'Y' | 'N'
  hasIndex?: 'Y' | 'N'
  isBucketField?: 'Y' | 'N'
  isPartitionField?: 'Y' | 'N'
  isShardingField?: 'Y' | 'N'
  sortOrder?: number
  updatedAt?: string
  createdAt?: string
}

export interface TableMetadataDetail {
  tableMetadata: TableMetadata
  fields: TableFieldMetadata[]
}

export interface TableMetadataPageRequest extends MetadataPageRequest {
  systemTypes?: string[]
  systemNames?: string[]
  databaseNames?: string[]
  tableName?: string
  tableCnName?: string
  updater?: string
}

export interface TableMetadataScriptRequest {
  scriptType?: string
  targetDatabase?: string
}
