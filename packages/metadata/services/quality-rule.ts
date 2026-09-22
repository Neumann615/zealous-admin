import type { MetadataPageResponse } from '../contracts/common'
import type { QualityRule, QualityRulePageRequest, QualityRuleSaveRequest } from '../contracts/quality-rule'
import { metadataRequest } from '../runtime/client'

export function getQualityRulePageAPI(params: QualityRulePageRequest) {
  return metadataRequest<MetadataPageResponse<QualityRule>>({ url: '/metadata/quality-rules/page', method: 'POST', data: params })
}

export function getQualityRuleDetailAPI(id: number) {
  return metadataRequest<QualityRule>({ url: `/metadata/quality-rules/${id}`, method: 'GET' })
}

export function createQualityRuleAPI(data: QualityRuleSaveRequest) {
  return metadataRequest<void>({ url: '/metadata/quality-rules/add', method: 'POST', data })
}

export function updateQualityRuleAPI(id: number, data: QualityRuleSaveRequest) {
  return metadataRequest<void>({ url: `/metadata/quality-rules/${id}/update`, method: 'POST', data })
}

export function changeQualityRuleStatusAPI(id: number, action: 'online' | 'offline') {
  return metadataRequest<void>({ url: `/metadata/quality-rules/${id}/${action}`, method: 'POST' })
}

export function deleteQualityRuleAPI(id: number) {
  return metadataRequest<void>({ url: `/metadata/quality-rules/${id}/delete`, method: 'POST' })
}

export function batchDeleteQualityRulesAPI(ids: number[]) {
  return metadataRequest<void>({ url: '/metadata/quality-rules/batch-delete', method: 'POST', data: ids })
}
