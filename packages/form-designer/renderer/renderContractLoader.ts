import type { FieldPermission, FormSchema, RenderContract } from '../types/schema'
import { parseSchema } from '../utils/parseSchema'

export interface ResolvedRenderContract {
  schema: FormSchema
  data?: Record<string, any>
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function cloneSchema(schema: FormSchema): FormSchema {
  return JSON.parse(JSON.stringify(schema))
}

function assertContractShape(contract: RenderContract): void {
  if (!isRecord(contract))
    throw new Error('渲染契约应为对象')
  if (!contract.schema)
    throw new Error('渲染契约缺少 schema')
  if (contract.data !== undefined && !isRecord(contract.data))
    throw new Error('渲染契约的 data 应为对象')
  if (contract.permissions !== undefined && !isRecord(contract.permissions))
    throw new Error('渲染契约的 permissions 应为对象')
}

export function applyContractPermissions(
  children: FormSchema['children'],
  permissions: Record<string, FieldPermission> | undefined,
  prefixes: string[][] = [[]],
): void {
  if (!permissions)
    return

  for (const node of children) {
    const paths = prefixes.map(prefix => node.field ? [...prefix, node.field] : prefix)
    const keys = [...new Set(paths.map(path => path.join('.')))]
    const permission = keys.length ? keys.map(key => permissions[key]).find(Boolean) : undefined

    if (permission?.visible === false)
      node.formItem = { ...node.formItem, hidden: true }
    if (permission?.editable === false)
      node.props = { ...node.props, disabled: true }
    if (permission?.required === true)
      node.formItem = { ...node.formItem, required: true }

    if (node.children?.length) {
      applyContractPermissions(
        node.children,
        permissions,
        paths.flatMap((path) => {
          if (!path.length)
            return [path]
          return [path, [...path, '*']]
        }),
      )
    }
  }
}

export function resolveSchemaContract(
  schema: FormSchema,
  data?: Record<string, any>,
): ResolvedRenderContract {
  if (!isRecord(schema))
    throw new Error('表单结构解析失败：应为对象')
  const cloned = cloneSchema(schema)
  applyContractPermissions(cloned.children, cloned.permissions)
  return { schema: cloned, data }
}

export function resolveSchemaJsonContract(
  schemaJson: string,
  data?: Record<string, any>,
): ResolvedRenderContract {
  return { schema: parseSchema(schemaJson), data }
}

export function resolveRenderContract(
  contract: RenderContract,
  fallbackData?: Record<string, any>,
): ResolvedRenderContract {
  assertContractShape(contract)
  const parsed = parseSchema(contract.schema)
  const cloned = cloneSchema(parsed)
  applyContractPermissions(cloned.children, {
    ...parsed.permissions,
    ...contract.permissions,
  })

  return {
    schema: cloned,
    data: contract.data === undefined ? fallbackData : contract.data,
  }
}
