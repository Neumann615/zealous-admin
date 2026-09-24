import type { CommonPage, PageParam } from '@zealous-admin/layout/index'
import { http } from '@zealous-admin/layout/index'

export interface FormRecord {
  id: number
  formKey: string
  name: string
  description: string
  schema: string
  permissions?: string
  status: number
  version: number
  currentVersion?: number
  currentVersionId?: number
  versionId?: number
  lockVersion: number
  versionStatus?: number
  hasDraft: boolean
  draftVersionId?: number
  draftLockVersion?: number
  fieldCount: number
  versionCount: number
  versions?: FormVersionRecord[]
  createTime: string
  updateTime: string
  /** 已收集的填写数据条数 */
  dataCount: number
}

export interface FormVersionRecord {
  id: number
  schemaVersion: number
  status: number
  isCurrent: boolean
  lockVersion: number
  createTime?: string
  updateTime?: string
}

/** 表单填写数据记录 */
export interface FormDataRecord {
  id: number
  formId: number
  /** 提交时的表单版本号 */
  formVersion: number
  formVersionId?: number
  submitter: string
  /** 1 有效，0 已作废 */
  status: number
  /** 整份填写值的 JSON 字符串 */
  data: string
  createTime: string
}

/** 分页获取表单列表 */
export function getFormListAPI(params: PageParam) {
  return http<CommonPage<FormRecord>>({
    url: '/form/list',
    method: 'get',
    params,
  })
}

/** 获取表单详情（含 schema 字符串） */
export function getFormDetailAPI(id: number, versionId?: number) {
  return http<FormRecord>({
    url: '/form/detail',
    method: 'get',
    params: { id, versionId },
  })
}

/** 新建表单 */
export function createFormAPI(data: { name: string, description?: string }) {
  return http<{ id: number, formKey: string, versionId: number, schemaVersion: number, lockVersion: number }>({
    url: '/form/create',
    method: 'post',
    data,
  })
}

/** 更新表单（名称/描述/schema/权限/状态） */
export function updateFormAPI(data: { id: number, name?: string, description?: string, schema?: string, lockVersion?: number }) {
  return http<{ id: number, versionId?: number, lockVersion: number }>({
    url: '/form/update',
    method: 'post',
    data,
  })
}

/** 已发布表单派生新草稿 */
export function createFormDraftAPI(id: number) {
  return http<{ id: number, versionId: number, schemaVersion: number, lockVersion: number }>({
    url: '/form/draft',
    method: 'post',
    data: { id },
  })
}

/** 发布当前草稿 */
export function publishFormAPI(id: number) {
  return http<{ id: number, versionId: number, schemaVersion: number }>({
    url: '/form/publish',
    method: 'post',
    data: { id },
  })
}

/** 退役当前生效版本，保留历史数据 */
export function retireFormAPI(id: number) {
  return http<{ id: number, retiredVersionId: number }>({
    url: '/form/retire',
    method: 'post',
    data: { id },
  })
}

/** 恢复已退役表单 */
export function reviveFormAPI(id: number) {
  return http<{ id: number, versionId: number, schemaVersion: number }>({
    url: '/form/revive',
    method: 'post',
    data: { id },
  })
}

/** 查询表单版本历史 */
export function getFormVersionsAPI(id: number) {
  return http<FormVersionRecord[]>({
    url: '/form/versions',
    method: 'get',
    params: { id },
  })
}

/** 删除表单（后端级联清理该表单的填写数据） */
export function deleteFormAPI(id: number) {
  return http({
    url: '/form/delete',
    method: 'post',
    data: { id },
  })
}

/** 提交表单填写数据 */
export function submitFormDataAPI(data: { formId: number, data: Record<string, any> }) {
  return http<{ id: number }>({
    url: '/form/data/submit',
    method: 'post',
    data,
  })
}

/** 分页获取表单填写数据 */
export function getFormDataListAPI(params: PageParam & { formId: number, versionId?: number, submitter?: string, status?: number }) {
  return http<CommonPage<FormDataRecord>>({
    url: '/form/data/list',
    method: 'get',
    params,
  })
}

export interface RenderContract {
  schema: string
  fieldContract?: Record<string, any>
  data: Record<string, unknown>
  permissions?: Record<string, { visible?: boolean, editable?: boolean, required?: boolean }>
  formVersion?: number
  versionId?: number
}

/** 运行时统一渲染：传 formId，服务端合并 schema + 回显数据 + 权限后返回契约 */
export function renderFormAPI(data: Record<string, any>, signal?: AbortSignal) {
  return http<{ name: string, renderContract: RenderContract }>({
    url: '/form/render',
    method: 'post',
    data,
    signal,
  })
}

/** 获取单条填写数据详情 */
export function getFormDataDetailAPI(id: number) {
  return http<FormDataRecord>({
    url: '/form/data/detail',
    method: 'get',
    params: { id },
  })
}

/** 作废 / 恢复填写数据 */
export function updateFormDataStatusAPI(data: { id: number, status: number }) {
  return http({
    url: '/form/data/updateStatus',
    method: 'post',
    data,
  })
}

/** 删除填写数据 */
export function deleteFormDataAPI(id: number) {
  return http({
    url: '/form/data/delete',
    method: 'post',
    data: { id },
  })
}
