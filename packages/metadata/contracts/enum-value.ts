import type { MetadataAuditedRecord, MetadataEnabledStatus, MetadataPageRequest } from './common'

export type EnumValueType = '一般维表' | '层次维表' | '父子维表'

export interface EnumValue extends MetadataAuditedRecord {
  enumName: string
  enumCode: string
  source?: string
  description?: string
  systemName: string
  systemNameDesc?: string
  type: EnumValueType
  status: MetadataEnabledStatus
}

export interface EnumValueGeneralItem {
  id?: number
  value: string
  valueAbbr?: string
  valueName: string
  description?: string
  enabled?: MetadataEnabledStatus
  sortOrder?: number
  updatedAt?: string
  createdAt?: string
}

export interface EnumValueHierarchyItem {
  id?: number
  level1Code: string
  level1Name: string
  level2Code: string
  level2Name: string
  level3Code?: string
  level3Name?: string
  description?: string
  enabled?: MetadataEnabledStatus
  sortOrder?: number
  updatedAt?: string
  createdAt?: string
}

export interface EnumValueParentChildItem {
  id?: number
  code: string
  name: string
  parentCode?: string
  parentName?: string
  level?: number
  isLeaf?: 'Y' | 'N'
  description?: string
  enabled?: MetadataEnabledStatus
  sortOrder?: number
  updatedAt?: string
  createdAt?: string
}

export interface EnumValueDetail {
  enumValue: EnumValue
  generalList?: EnumValueGeneralItem[]
  hierarchyList?: EnumValueHierarchyItem[]
  parentChildList?: EnumValueParentChildItem[]
}

export interface EnumValueBatchDetail {
  enumCode: string
  systemName: string
  type: EnumValueType
  status: MetadataEnabledStatus
  generalList?: EnumValueGeneralItem[]
  hierarchyList?: EnumValueHierarchyItem[]
  parentChildList?: EnumValueParentChildItem[]
}

export interface EnumValuePageRequest extends MetadataPageRequest {
  enumName?: string
  enumCode?: string
  systemName?: string[]
  type?: EnumValueType[]
  status?: MetadataEnabledStatus
  updater?: string
  subEnumCode?: string
  subEnumName?: string
}

export interface EnumValueCreateRequest {
  enumName: string
  enumCode: string
  source?: string
  description?: string
  systemName: string
  type: EnumValueType
  generalList?: EnumValueGeneralItem[]
  hierarchyList?: EnumValueHierarchyItem[]
  parentChildList?: EnumValueParentChildItem[]
}

export interface EnumValueUpdateRequest {
  enumName: string
  enumCode: string
  source?: string
  description?: string
  systemName: string
  generalList?: EnumValueGeneralItem[]
  hierarchyList?: EnumValueHierarchyItem[]
  parentChildList?: EnumValueParentChildItem[]
}

export interface EnumValueQueryRequest {
  enumCode: string
  systemName: string
  onlyValid?: boolean
}

export interface EnumValueBatchQueryRequest {
  enumCodes: string[]
  systemName: string
  onlyValid?: boolean
}
