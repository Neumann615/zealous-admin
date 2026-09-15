import type { FieldSchema, FormSchema } from '../types/schema'
import { getComponent } from '../registry/registry'
import { findNode } from './schemaTree'

/**
 * 字段名校验。
 *
 * 重名判定按「命名作用域」而非直接父节点：渲染器里只有 nestObject / nestList 容器
 * 会把自己的 field 作为名路径前缀下发（ContainerField / ListField），布局容器
 * （card / row / col / tabs / descriptions …）不产生新作用域，其子字段与容器自身
 * 处于同一层级。因此 row > col > input 这种常见写法里的两个输入框是同级字段，
 * 重名必须能被查出来。
 */

export interface DuplicateFieldName {
  /** 冲突的字段名 */
  name: string
  /** 同一作用域内重名的节点，至少两个 */
  nodes: FieldSchema[]
}

/** 该节点是否占用一个表单字段名（与属性面板「字段名」项的出现条件一致） */
export function nodeBindsField(node: FieldSchema): boolean {
  const def = getComponent(node.type)
  if (!def || def.noFormItem)
    return false
  return !def.isContainer || !!def.nestObject || !!def.nestList
}

/**
 * 容器是否开启新的命名作用域。
 * 无 field 的值绑定容器不会下发前缀（nestList 无 field 时子节点甚至不渲染），
 * 此时按同作用域继续下探——该状态本身已被「字段名不能为空」拦下。
 */
function opensNameScope(node: FieldSchema): boolean {
  const def = getComponent(node.type)
  if (!def?.isContainer || (!def.nestObject && !def.nestList))
    return false
  return !!node.field
}

/** 字段名格式校验，通过返回 null（不含重名判断，重名取决于所处作用域） */
export function validateFieldNameFormat(name: unknown): string | null {
  if (typeof name !== 'string' || !name.trim())
    return '字段名不能为空'
  if (/\s/.test(name))
    return '字段名不能包含空格'
  if (name.includes('.'))
    return '字段名不能包含点号（嵌套请改用子表单）'
  return null
}

/** 收集整棵树中绑定字段的节点 */
function listBindingNodes(nodes: FieldSchema[], out: FieldSchema[] = []): FieldSchema[] {
  for (const node of nodes) {
    if (nodeBindsField(node))
      out.push(node)
    if (node.children?.length)
      listBindingNodes(node.children, out)
  }
  return out
}

/** 找出各命名作用域内重名的字段（跨作用域同名合法） */
export function findDuplicateFieldNames(children: FieldSchema[], out: DuplicateFieldName[] = []): DuplicateFieldName[] {
  const scope: FieldSchema[] = []
  const nestedScopes: FieldSchema[][] = []

  const collect = (nodes: FieldSchema[]) => {
    for (const node of nodes) {
      if (opensNameScope(node))
        nestedScopes.push(node.children ?? [])
      else if (node.children?.length)
        collect(node.children) // 布局容器不产生作用域，子字段与容器同级
      if (nodeBindsField(node))
        scope.push(node)
    }
  }
  collect(children)

  const grouped = new Map<string, FieldSchema[]>()
  for (const node of scope) {
    const name = node.field
    if (!name)
      continue
    const list = grouped.get(name)
    if (list)
      list.push(node)
    else
      grouped.set(name, [node])
  }
  for (const [name, nodes] of grouped) {
    if (nodes.length > 1)
      out.push({ name, nodes })
  }

  for (const nested of nestedScopes)
    findDuplicateFieldNames(nested, out)

  return out
}

/** 指定节点的字段名问题描述，合法返回 null（属性面板内联提示用） */
export function getFieldNameIssue(schema: FormSchema, nodeId: string): string | null {
  const located = findNode(schema.children, nodeId)
  if (!located || !nodeBindsField(located.node))
    return null
  const formatIssue = validateFieldNameFormat(located.node.field)
  if (formatIssue)
    return formatIssue
  const duplicate = findDuplicateFieldNames(schema.children).find(g => g.nodes.some(n => n.id === nodeId))
  return duplicate ? `字段名「${duplicate.name}」已被同级字段占用` : null
}

/** 整份 schema 的字段名问题列表，空数组表示通过（保存与导入的拦截依据） */
export function validateSchemaFieldNames(schema: FormSchema): string[] {
  const issues: string[] = []
  for (const node of listBindingNodes(schema.children)) {
    const formatIssue = validateFieldNameFormat(node.field)
    if (formatIssue)
      issues.push(`字段「${node.label || node.type}」：${formatIssue}`)
  }
  for (const group of findDuplicateFieldNames(schema.children)) {
    const labels = group.nodes.map(n => n.label || n.type).join('、')
    issues.push(`字段名「${group.name}」在同一层级重复：${labels}`)
  }
  return issues
}
