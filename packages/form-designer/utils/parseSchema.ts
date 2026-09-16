import type { FormEventConfig } from '../events/types'
import type { FieldSchema, FormSchema, ValidateRule } from '../types/schema'
import { isFnSource } from '../events/fnSource'
import { validateEvents, validateHookFn } from '../events/validateEvents'
import { createEmptySchema, SCHEMA_VERSION, THRESHOLD_RULE_TYPES, VALIDATE_RULE_TYPES, VALIDATE_TRIGGERS } from '../types/schema'

/**
 * v1 → v2：纯增量（新增 events / dataSources 可选段），只需抬版本号；
 * 保留该函数作为后续结构变更的挂载点
 */
function migrateV1toV2(raw: Record<string, any>): Record<string, any> {
  return { ...raw, version: 2 }
}

const MIGRATIONS: Record<number, (raw: Record<string, any>) => Record<string, any>> = {
  1: migrateV1toV2,
}

/** 规则形状问题的统一文案：where 用字段 label，缺省退回组件 type */
const ruleIssue = (where: string) => `校验规则格式不正确（${where}）`

function validateOneRule(rule: unknown, where: string): string[] {
  const issue = ruleIssue(where)
  if (!rule || typeof rule !== 'object' || Array.isArray(rule))
    return [issue]
  const r = rule as ValidateRule
  if (!VALIDATE_RULE_TYPES.includes(r.type))
    return [issue]
  // 自定义校验的执行结果由钩子运行时决定，因此「有没有可执行来源」必须在这里拦下
  if (r.type === 'validator') {
    if (r.fn !== undefined && !isFnSource(r.fn))
      return [issue]
    if (isFnSource(r.fn)) {
      const fnIssue = validateHookFn(r.fn)
      return fnIssue ? [`${issue}：${fnIssue}`] : []
    }
    if (typeof r.hook !== 'string' || !r.hook)
      return [issue]
    return []
  }
  // 阈值类规则没有 value 就没有可校验的边界，运行时只能跳过 —— 这里直接拦下，避免「存得进、回读不知所谓」
  if (THRESHOLD_RULE_TYPES.includes(r.type) && !(typeof r.value === 'number' && Number.isFinite(r.value)))
    return [`${issue}：${r.type} 需要数字阈值 value`]
  if (r.pattern !== undefined && typeof r.pattern !== 'string')
    return [issue]
  if (r.trigger !== undefined && !VALIDATE_TRIGGERS.includes(r.trigger))
    return [issue]
  return []
}

/**
 * children 树上所有字段的校验规则形状校验（含 formItem.rules 与嵌套子表单）。
 * 与 events 校验并列：保存拦截与解析侧共用同一份口径，避免「保存放行、回读拒绝」。
 * 返回面向用户的问题列表，调用方决定是抛错还是弹提示。
 */
export function validateFieldRules(children: unknown): string[] {
  const issues: string[] = []
  const walk = (nodes: unknown) => {
    if (!Array.isArray(nodes))
      return
    for (const node of nodes as FieldSchema[]) {
      if (!node || typeof node !== 'object')
        continue
      const where = node.label || node.type || '未命名字段'
      const rules = (node.formItem as { rules?: unknown } | undefined)?.rules
      if (rules !== undefined) {
        if (!Array.isArray(rules))
          issues.push(ruleIssue(where))
        else
          rules.forEach(rule => issues.push(...validateOneRule(rule, where)))
      }
      walk(node.children)
    }
  }
  walk(children)
  return issues
}

/**
 * 单一解析入口：字符串或已解析对象 → 当前版本的 FormSchema。
 * 失败一律抛错，消息面向用户可直接展示。
 */
export function parseSchema(input: string | unknown): FormSchema {
  let raw: any
  try {
    raw = typeof input === 'string' ? JSON.parse(input) : input
  }
  catch {
    throw new Error('表单结构解析失败：不是合法的 JSON')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('表单结构解析失败：应为对象')

  const rawVersion = raw.version === undefined ? 1 : raw.version
  if (typeof rawVersion !== 'number' || !Number.isInteger(rawVersion) || rawVersion < 1)
    throw new Error(`表单结构解析失败：表单版本号非法（${String(raw.version)}）`)
  let version = rawVersion
  if (version > SCHEMA_VERSION)
    throw new Error(`不支持的表单版本 v${version}，请升级表单设计器`)
  while (version < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version]
    if (!migrate)
      throw new Error(`表单结构解析失败：缺少 v${version} 的迁移`)
    raw = migrate(raw)
    const next = Number(raw.version)
    if (!Number.isInteger(next) || !(next > version))
      throw new Error(`表单结构解析失败：v${version} 迁移未推进版本`)
    version = next
  }

  if (!Array.isArray(raw.children))
    throw new Error('表单结构解析失败：children 应为数组')
  if (raw.form !== undefined && (typeof raw.form !== 'object' || raw.form === null))
    throw new Error('表单结构解析失败：form 应为对象')
  // 与设计器保存拦截共用同一份校验（events/validateEvents），避免两边规则分叉
  const eventIssues = validateEvents(raw.events as FormEventConfig | undefined)
  if (eventIssues.length)
    throw new Error(`表单结构解析失败：${eventIssues[0]}`)
  const ruleIssues = validateFieldRules(raw.children)
  if (ruleIssues.length)
    throw new Error(`表单结构解析失败：${ruleIssues[0]}`)

  const empty = createEmptySchema()
  return {
    ...empty,
    ...raw,
    form: { ...empty.form, ...raw.form },
    children: raw.children,
    version: SCHEMA_VERSION,
  }
}
