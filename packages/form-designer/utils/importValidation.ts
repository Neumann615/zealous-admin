import type { FieldSchema, FormSchema } from '../types/schema'
import { validateEvents } from '../events/validateEvents'
import { getComponent } from '../registry/registry'
import { validateSchemaFieldNames } from './fieldName'
import { validateFieldRules } from './parseSchema'

const DATA_SOURCE_TYPES = new Set(['static', 'dict', 'api'])

export function validateRuleImport(value: unknown): string[] {
  if (!Array.isArray(value))
    return ['渲染规则应为字段树数组']

  const issues: string[] = []
  const seenIds = new Set<string>()

  const walk = (children: unknown, path: string) => {
    if (!Array.isArray(children)) {
      issues.push(`${path} 的 children 应为数组`)
      return
    }
    children.forEach((raw, index) => {
      const nodePath = path ? `${path}.${index + 1}` : String(index + 1)
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        issues.push(`第 ${nodePath} 项应为对象`)
        return
      }
      const node = raw as Record<string, any>
      if (typeof node.id !== 'string' || !node.id.trim()) {
        issues.push(`第 ${nodePath} 项缺少有效 id`)
        return
      }
      if (typeof node.type !== 'string' || !getComponent(node.type))
        issues.push(`第 ${nodePath} 项使用了未注册组件类型「${node.type ?? ''}」`)
      if (seenIds.has(node.id))
        issues.push(`字段 id「${node.id}」重复`)
      seenIds.add(node.id)
      if (node.field !== undefined && typeof node.field !== 'string')
        issues.push(`第 ${nodePath} 项 field 应为字符串`)
      if (node.props !== undefined && (!node.props || typeof node.props !== 'object' || Array.isArray(node.props)))
        issues.push(`字段「${node.label || node.type || node.id}」的 props 应为对象`)
      if (node.children !== undefined)
        walk(node.children, nodePath)
    })
  }

  walk(value, '')
  issues.push(...validateSchemaFieldNames({
    version: 2,
    form: {},
    children: value as FieldSchema[],
  }).map(issue => `渲染规则：${issue}`))
  return [...new Set(issues)]
}

export function validateOptionsImport(value: unknown, currentSchema: FormSchema): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return ['表单配置应为对象']

  const issues: string[] = []
  const options = value as Record<string, any>
  const unknownKeys = Object.keys(options).filter(
    key => !['form', 'events', 'dataSources', 'permissions'].includes(key),
  )
  if (unknownKeys.length)
    issues.push(`表单配置包含未知配置：${unknownKeys.join('、')}`)

  if (options.form !== undefined && (!options.form || typeof options.form !== 'object' || Array.isArray(options.form)))
    issues.push('form 应为对象')

  if (options.events !== undefined)
    issues.push(...validateEvents(options.events as FormSchema['events']).map(issue => `事件配置：${issue}`))

  if (options.dataSources !== undefined) {
    if (!options.dataSources || typeof options.dataSources !== 'object' || Array.isArray(options.dataSources)) {
      issues.push('dataSources 应为对象')
    }
    else {
      Object.entries(options.dataSources as Record<string, any>).forEach(([name, definition]) => {
        if (!definition || typeof definition !== 'object' || !DATA_SOURCE_TYPES.has(definition.type)) {
          issues.push(`数据源「${name}」类型必须是 static / dict / api`)
          return
        }
        if (definition.type === 'static' && !Array.isArray(definition.options))
          issues.push(`数据源「${name}」的 options 应为数组`)
        if (definition.type === 'dict' && typeof definition.dictType !== 'string')
          issues.push(`数据源「${name}」缺少 dictType`)
        if (definition.type === 'api' && typeof definition.api !== 'string')
          issues.push(`数据源「${name}」缺少注册的 api 名称`)
      })
    }
  }

  if (options.permissions !== undefined) {
    if (!options.permissions || typeof options.permissions !== 'object' || Array.isArray(options.permissions)) {
      issues.push('permissions 应为对象')
    }
    else {
      Object.entries(options.permissions as Record<string, any>).forEach(([name, permission]) => {
        if (!permission || typeof permission !== 'object' || Array.isArray(permission)) {
          issues.push(`权限「${name}」应为对象`)
          return
        }
        const hasVisible = permission.visible === undefined || typeof permission.visible === 'boolean'
        const hasEditable = permission.editable === undefined || typeof permission.editable === 'boolean'
        const hasRequired = permission.required === undefined || typeof permission.required === 'boolean'
        if (!hasVisible || !hasEditable || !hasRequired)
          issues.push(`权限「${name}」只能包含 boolean 的 visible / editable / required`)
      })
    }
  }

  const merged: FormSchema = {
    ...currentSchema,
    ...(options.events !== undefined ? { events: options.events } : {}),
    ...(options.dataSources !== undefined ? { dataSources: options.dataSources } : {}),
  }
  issues.push(...validateFieldRules(merged.children, merged.dataSources).map(issue => `合并当前渲染规则：${issue}`))
  return [...new Set(issues)]
}
