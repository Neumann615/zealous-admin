import { BadRequestError } from '../../lib/errors'

export type FormFieldValueType = 'unknown' | 'number' | 'boolean' | 'array' | 'object'

export interface FormFieldContract {
  path: string
  field: string
  label: string
  componentType: string
  required: boolean
  valueType: FormFieldValueType
  children: FormFieldContract[]
}

export interface FormContract {
  schemaVersion: number
  fieldCount: number
  fields: FormFieldContract[]
  permissions: Record<string, any> | undefined
  diagnostics: string[]
}

interface ParsedFormSchema {
  version?: number
  form?: unknown
  children?: unknown
  permissions?: unknown
  [key: string]: unknown
}

interface ParsedFieldSchema {
  id?: unknown
  type?: unknown
  field?: unknown
  label?: unknown
  props?: unknown
  formItem?: unknown
  children?: unknown
  [key: string]: unknown
}

const blockedPathSegments = new Set(['__proto__', 'prototype', 'constructor'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isFieldVisible(path: string, permissions: Record<string, any> | undefined): boolean {
  return permissions?.[path]?.visible !== false
}

function inferValueType(node: ParsedFieldSchema): FormFieldValueType {
  if (node.type === 'number')
    return 'number'
  if (node.type === 'switch')
    return 'boolean'
  if (node.type === 'checkbox')
    return 'array'
  if (node.type === 'tableForm')
    return 'array'
  if (node.type === 'subForm')
    return 'object'
  if (node.type === 'select') {
    const mode = isRecord(node.props) ? node.props.mode : undefined
    return mode === 'multiple' || mode === 'tags' ? 'array' : 'unknown'
  }
  return 'unknown'
}

function isRequired(node: ParsedFieldSchema): boolean {
  const formItem = node.formItem
  if (!isRecord(formItem))
    return false
  if (formItem.required === true)
    return true
  return Array.isArray(formItem.rules) && formItem.rules.some(rule => isRecord(rule) && rule.type === 'required')
}

function collectFields(
  nodes: unknown,
  parentPath: string,
  permissions: Record<string, any> | undefined,
  diagnostics: string[],
  seenIds: Set<string>,
  seenPaths: Set<string>,
): FormFieldContract[] {
  if (!Array.isArray(nodes))
    return []

  const fields: FormFieldContract[] = []
  nodes.forEach((rawNode, index) => {
    if (!isRecord(rawNode)) {
      diagnostics.push(`字段节点 ${parentPath || 'root'}[${index}] 应为对象`)
      return
    }
    const node = rawNode as ParsedFieldSchema
    const nodeId = typeof node.id === 'string' ? node.id.trim() : ''
    const componentType = typeof node.type === 'string' ? node.type : ''
    if (!nodeId) {
      diagnostics.push(`字段节点 ${parentPath || 'root'}[${index}] 缺少 id`)
      return
    }
    if (seenIds.has(nodeId)) {
      throw new BadRequestError(`字段 id 重复：${nodeId}`)
    }
    seenIds.add(nodeId)
    if (!componentType) {
      diagnostics.push(`字段 ${nodeId} 缺少组件类型`)
    }
    if (node.props !== undefined && !isRecord(node.props))
      diagnostics.push(`字段 ${node.label || nodeId} 的 props 应为对象，已保留原值`)

    if (node.field === undefined || node.field === null || node.field === '')
      return
    if (typeof node.field !== 'string' || !node.field.trim()) {
      throw new BadRequestError(`字段 ${nodeId} 的字段名必须是非空字符串`)
    }
    const field = node.field.trim()
    if (field.split('.').some(segment => !segment || blockedPathSegments.has(segment))) {
      throw new BadRequestError(`字段 ${nodeId} 的字段名不合法：${field}`)
    }
    const path = parentPath ? `${parentPath}.${field}` : field
    if (seenPaths.has(path)) {
      throw new BadRequestError(`字段路径重复：${path}`)
    }
    seenPaths.add(path)

    const childrenPath = node.type === 'tableForm' ? `${path}.*` : path
    fields.push({
      path,
      field,
      label: typeof node.label === 'string' && node.label ? node.label : field,
      componentType,
      required: isRequired(node) && isFieldVisible(path, permissions),
      valueType: inferValueType(node),
      children: collectFields(node.children, childrenPath, permissions, diagnostics, seenIds, seenPaths),
    })
  })
  return fields
}

export function parseFormContract(schemaText: string): { schema: ParsedFormSchema, contract: FormContract } {
  let schema: unknown
  try {
    schema = JSON.parse(schemaText)
  }
  catch (error) {
    throw new BadRequestError(`表单 Schema 不是合法 JSON：${(error as Error).message}`)
  }
  if (!isRecord(schema))
    throw new BadRequestError('表单 Schema 应为 JSON 对象')

  const parsedSchema = schema as ParsedFormSchema
  const diagnostics: string[] = []
  if (parsedSchema.children === undefined)
    diagnostics.push('Schema 缺少 children，发布前需要保存设计')
  else if (!Array.isArray(parsedSchema.children))
    throw new BadRequestError('表单 Schema 的 children 应为数组')
  if (parsedSchema.form !== undefined && !isRecord(parsedSchema.form))
    diagnostics.push('表单全局配置 form 应为对象，已保留原值')
  if (parsedSchema.permissions !== undefined && !isRecord(parsedSchema.permissions))
    diagnostics.push('字段权限 permissions 应为对象，已忽略该配置')

  const permissions = isRecord(parsedSchema.permissions) ? parsedSchema.permissions as Record<string, any> : undefined
  const fields = collectFields(parsedSchema.children, '', permissions, diagnostics, new Set(), new Set())
  return {
    schema: parsedSchema,
    contract: {
      schemaVersion: typeof parsedSchema.version === 'number' ? parsedSchema.version : 1,
      fieldCount: fields.length,
      fields,
      permissions,
      diagnostics,
    },
  }
}

export function createEmptyFormContract(): FormContract {
  return {
    schemaVersion: 1,
    fieldCount: 0,
    fields: [],
    permissions: undefined,
    diagnostics: [],
  }
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '')
    return false
  if (Array.isArray(value) && value.length === 0)
    return false
  return true
}

function validateValue(field: FormFieldContract, value: unknown, issues: string[]): boolean {
  if (!hasValue(value))
    return false
  if (field.valueType === 'number' && typeof value !== 'number') {
    issues.push(`${field.label} 必须是数字`)
    return false
  }
  if (field.valueType === 'boolean' && typeof value !== 'boolean') {
    issues.push(`${field.label} 必须是布尔值`)
    return false
  }
  if (field.valueType === 'array' && !Array.isArray(value)) {
    issues.push(`${field.label} 必须是数组`)
    return false
  }
  if (field.valueType === 'object' && !isRecord(value)) {
    issues.push(`${field.label} 必须是对象`)
    return false
  }
  return true
}

function validateFields(
  fields: FormFieldContract[],
  value: Record<string, unknown>,
  issues: string[],
) {
  for (const field of fields) {
    const fieldValue = value[field.field]
    const validValue = validateValue(field, fieldValue, issues)
    if (field.required && !hasValue(fieldValue)) {
      issues.push(`${field.label} 不能为空`)
      continue
    }
    if (!validValue)
      continue
    if (field.valueType === 'object' && isRecord(fieldValue)) {
      validateFields(field.children, fieldValue, issues)
    }
    else if (field.valueType === 'array' && Array.isArray(fieldValue)) {
      fieldValue.forEach((row, index) => {
        if (!isRecord(row)) {
          issues.push(`${field.label} 第 ${index + 1} 行必须是对象`)
          return
        }
        validateFields(field.children, row, issues)
      })
    }
  }
}

export function validateFormData(contract: FormContract, data: Record<string, unknown>): string[] {
  const issues: string[] = []
  validateFields(contract.fields, data, issues)
  return issues
}
