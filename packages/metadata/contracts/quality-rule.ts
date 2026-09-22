import type { MetadataAuditedRecord, MetadataEnabledStatus, MetadataPageRequest } from './common'

export interface QualityRule extends MetadataAuditedRecord {
  taskName: string
  tableCnName?: string
  tableEnName: string
  fieldName?: string
  fieldCode?: string
  checkType: string
  checkTypeName?: string
  checkTypeDesc?: string
  ruleDesc?: string
  checkSql: string
  checkDatabase?: string
  checkDatasource?: string
  cronExpression: string
  status: MetadataEnabledStatus
}

export interface QualityRulePageRequest extends MetadataPageRequest {
  taskName?: string
  tableName?: string
  updater?: string
  status?: MetadataEnabledStatus
  checkType?: string[]
}

export interface QualityRuleSaveRequest {
  taskName: string
  tableCnName?: string
  tableEnName: string
  fieldName?: string
  fieldCode?: string
  checkType: string
  ruleDesc?: string
  checkSql: string
  checkDatabase?: string
  checkDatasource?: string
  cronExpression: string
}
