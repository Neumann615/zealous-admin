import type { FormEventConfig } from '../events/types'
import type { ControlRule, DataSourceDef, FieldDataSource, FieldOption, FieldPermission, FieldSchema, FormSchema, ValidateRule } from '../types/schema'
import { isFnSource } from '../events/fnSource'
import { validateEvents, validateHookFn } from '../events/validateEvents'
import { getFormulaIssue } from '../renderer/formula'
import { CONTROL_EFFECTS, CONTROL_OPERATORS, createEmptySchema, DATA_SOURCE_TYPES, SCHEMA_VERSION, THRESHOLD_RULE_TYPES, VALIDATE_RULE_TYPES, VALIDATE_TRIGGERS } from '../types/schema'

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

/** 字段栅格允许的键：与 FieldCol 一一对应（antd Col 的 offset / push / pull / order 暂不支持） */
const COL_KEYS = ['span', 'xs', 'sm', 'md', 'lg', 'xl'] as const

/**
 * 字段级栅格形状校验：col 必须是非数组对象，白名单键的值必须是 0-24 的整数（0 也合法，antd 允许 span: 0）。
 * 未知键直接报错而不忽略：面板写不出别的键，出现未知键基本都是手写 / 外部 JSON 的笔误（如 spam: 12），
 * 忽略的表现是「配了却完全没生效」，比报错难查得多。
 * 值为 undefined 的键视为未配置（JSON 序列化本来就会丢键，不能因此拒绝一份能存能读的 schema）。
 */
function validateCol(node: FieldSchema, where: string): string[] {
  const col = (node as { col?: unknown }).col
  if (col === undefined)
    return []
  const issue = `字段栅格格式不正确（${where}）`
  if (!col || typeof col !== 'object' || Array.isArray(col))
    return [issue]
  const issues: string[] = []
  for (const [key, value] of Object.entries(col as Record<string, unknown>)) {
    if (value === undefined)
      continue
    if (!(COL_KEYS as readonly string[]).includes(key)) {
      issues.push(`${issue}：未知键 ${key}`)
      continue
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 24)
      issues.push(`${issue}：${key} 必须是 0-24 的整数`)
  }
  return issues
}

function validatePermissions(value: unknown): string[] {
  if (value === undefined)
    return []
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return ['字段权限格式不正确：应为对象']

  return Object.entries(value).flatMap(([key, permission]) => {
    if (!key.trim())
      return ['字段权限格式不正确：权限 key 不能为空']
    if (!permission || typeof permission !== 'object' || Array.isArray(permission))
      return [`字段权限格式不正确（${key}）：应为对象`]
    const item = permission as FieldPermission
    if (item.visible !== undefined && typeof item.visible !== 'boolean')
      return [`字段权限格式不正确（${key}）：visible 必须是布尔值`]
    if (item.editable !== undefined && typeof item.editable !== 'boolean')
      return [`字段权限格式不正确（${key}）：editable 必须是布尔值`]
    if (item.required !== undefined && typeof item.required !== 'boolean')
      return [`字段权限格式不正确（${key}）：required 必须是布尔值`]
    return []
  })
}

function validateOneRule(rule: unknown, where: string): string[] {
  const issue = ruleIssue(where)
  if (!rule || typeof rule !== 'object' || Array.isArray(rule))
    return [issue]
  const r = rule as ValidateRule
  if (!VALIDATE_RULE_TYPES.includes(r.type))
    return [issue]
  // pattern / trigger 适用于所有类型，检查放在 validator 分支之前：
  // 该分支内有多个提前 return，放后面会被整段跳过（`{ type: 'validator', trigger: 'onBlur' }` 就是漏网的那个）
  if (r.pattern !== undefined && typeof r.pattern !== 'string')
    return [issue]
  if (r.trigger !== undefined && !VALIDATE_TRIGGERS.includes(r.trigger))
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
  return []
}

/**
 * 数据来源定义（`dataSource.def` 与 `dataSources` 命名表共用一份）：面板写不出非法形状，
 * 出现非法形状基本都是手写 / 外部 JSON 的笔误，忽略的表现是「配了却完全没生效」，故一律拦下。
 */
function validateDataSourceDef(def: unknown, where: string): string[] {
  const issue = `数据来源格式不正确（${where}）`
  if (!def || typeof def !== 'object' || Array.isArray(def))
    return [issue]
  const source = def as DataSourceDef
  if (!DATA_SOURCE_TYPES.includes(source.type))
    return [issue]

  if (source.type === 'static') {
    if (!Array.isArray(source.options))
      return [`${issue}：static 需要 options 数组`]
    return source.options.flatMap((option, index) => {
      if (!option || typeof option !== 'object' || Array.isArray(option))
        return [`${issue}：第 ${index + 1} 个选项应为对象`]
      const item = option as FieldOption
      if (typeof item.label !== 'string' || !(typeof item.value === 'string' || typeof item.value === 'number'))
        return [`${issue}：第 ${index + 1} 个选项需要 label 与 value`]
      if (item.disabled !== undefined && typeof item.disabled !== 'boolean')
        return [`${issue}：第 ${index + 1} 个选项的 disabled 应为布尔值`]
      return []
    })
  }

  if (source.type === 'metadata') {
    if (typeof source.setCode !== 'string' || !source.setCode)
      return [`${issue}：metadata 需要非空的 setCode`]
    if (source.labelField !== undefined && typeof source.labelField !== 'string')
      return [issue]
    if (source.valueField !== undefined && typeof source.valueField !== 'string')
      return [issue]
    if (source.onlyValid !== undefined && typeof source.onlyValid !== 'boolean')
      return [`${issue}：onlyValid 应为布尔值`]
    if (source.shape !== undefined && !['flat', 'tree', 'path'].includes(source.shape))
      return [`${issue}：shape 必须是 flat / tree / path`]
    return []
  }

  // api：只接受宿主注册名（不填裸 URL），形状上确保是个非空字符串
  if (typeof source.api !== 'string' || !source.api)
    return [`${issue}：api 需要非空的注册名`]
  if (source.parse !== undefined && typeof source.parse !== 'string')
    return [issue]
  if (source.params !== undefined) {
    if (!source.params || typeof source.params !== 'object' || Array.isArray(source.params))
      return [`${issue}：api 的 params 应为对象`]
    for (const [key, value] of Object.entries(source.params)) {
      if (typeof value !== 'string')
        return [`${issue}：params.${key} 应为字符串`]
    }
  }
  return []
}

/** 字段的 dataSource 段：ref / def 至少一个，def 优先（与 HookRef 同规则） */
function validateFieldDataSource(node: FieldSchema, where: string): string[] {
  const raw = (node as { dataSource?: unknown }).dataSource
  if (raw === undefined)
    return []
  const issue = `数据来源格式不正确（${where}）`
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return [issue]
  const dataSource = raw as FieldDataSource
  const issues: string[] = []
  if (dataSource.def !== undefined)
    issues.push(...validateDataSourceDef(dataSource.def, where))
  if (dataSource.ref !== undefined && (typeof dataSource.ref !== 'string' || !dataSource.ref))
    issues.push(`${issue}：ref 需要非空字符串`)
  if (dataSource.def === undefined && dataSource.ref === undefined)
    issues.push(`${issue}：def 与 ref 至少要有一个`)
  if (dataSource.watch !== undefined && (!Array.isArray(dataSource.watch) || dataSource.watch.some(w => typeof w !== 'string')))
    issues.push(`${issue}：watch 应为字符串数组`)
  if (dataSource.debounce !== undefined
    && (typeof dataSource.debounce !== 'number' || !Number.isFinite(dataSource.debounce) || dataSource.debounce < 0)) {
    issues.push(`${issue}：debounce 应为非负数`)
  }
  return issues
}

/** 命名数据源表（schema.dataSources）：每项都是合法的 DataSourceDef */
function validateDataSources(dataSources: unknown): string[] {
  if (dataSources === undefined)
    return []
  if (!dataSources || typeof dataSources !== 'object' || Array.isArray(dataSources))
    return ['数据来源格式不正确（dataSources 应为对象）']
  return Object.entries(dataSources).flatMap(([name, def]) => validateDataSourceDef(def, `dataSources.${name}`))
}

/**
 * 联动规则形状：面板写不出非法形状，出现非法形状基本都是手写 / 外部 JSON 的笔误。
 * 忽略的表现是「配了却完全没生效」，故一律拦下。
 */
function validateFieldControl(node: FieldSchema, where: string): string[] {
  const raw = (node as { control?: unknown }).control
  if (raw === undefined)
    return []
  const issue = `联动规则格式不正确（${where}）`
  if (!Array.isArray(raw))
    return [issue]
  return raw.flatMap((rule) => {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule))
      return [issue]
    const r = rule as ControlRule
    if (!Array.isArray(r.effects) || !r.effects.length)
      return [`${issue}：effects 需要非空数组`]
    if (r.effects.some(effect => !CONTROL_EFFECTS.includes(effect)))
      return [`${issue}：effects 含未知项`]

    if (r.conditions !== undefined) {
      if (!Array.isArray(r.conditions) || !r.conditions.length)
        return [`${issue}：conditions 需要非空数组`]
      if (r.field !== undefined || r.operator !== undefined || r.value !== undefined)
        return [`${issue}：conditions 与顶层单条件不能同时配置`]
      return r.conditions.flatMap((condition, index) => {
        if (!condition || typeof condition !== 'object' || Array.isArray(condition))
          return [`${issue}：conditions.${index} 需要是对象`]
        if (typeof condition.field !== 'string' || !condition.field)
          return [`${issue}：conditions.${index}.field 需要非空字符串`]
        if (condition.operator !== undefined && !CONTROL_OPERATORS.includes(condition.operator))
          return [`${issue}：conditions.${index}：未知的比较方式 ${String(condition.operator)}`]
        if (condition.operator === 'in' && !Array.isArray(condition.value))
          return [`${issue}：conditions.${index}：operator 为 in 时 value 必须是数组`]
        return []
      })
    }

    if (typeof r.field !== 'string' || !r.field)
      return [`${issue}：field 需要非空字符串`]
    if (r.operator !== undefined && !CONTROL_OPERATORS.includes(r.operator))
      return [`${issue}：未知的比较方式 ${String(r.operator)}`]
    if (r.operator === 'in' && !Array.isArray(r.value))
      return [`${issue}：operator 为 in 时 value 必须是数组`]
    return []
  })
}

function validateFieldComputed(node: FieldSchema, where: string): string[] {
  const raw = (node as { computed?: unknown }).computed
  if (raw === undefined)
    return []
  const issue = `计算公式格式不正确（${where}）`
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return [issue]
  const computed = raw as { expression?: unknown }
  if (typeof computed.expression !== 'string')
    return [`${issue}：expression 需要非空字符串`]
  const formulaIssue = getFormulaIssue(computed.expression)
  return formulaIssue ? [`${issue}：${formulaIssue}`] : []
}

/**
 * children 树上所有字段的形状校验：校验规则（formItem.rules）与字段级栅格（col），含嵌套子表单。
 * 与 events 校验并列：保存拦截与解析侧共用同一份口径，避免「保存放行、回读拒绝」。
 * 返回面向用户的问题列表，调用方决定是抛错还是弹提示。
 */
export function validateFieldRules(children: unknown, dataSources?: unknown): string[] {
  const issues: string[] = []
  const walk = (nodes: unknown) => {
    if (!Array.isArray(nodes))
      return
    for (const node of nodes as FieldSchema[]) {
      if (!node || typeof node !== 'object')
        continue
      const where = node.label || node.type || '未命名字段'
      issues.push(...validateCol(node, where))
      issues.push(...validateFieldDataSource(node, where))
      issues.push(...validateFieldControl(node, where))
      issues.push(...validateFieldComputed(node, where))
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
  issues.push(...validateDataSources(dataSources))
  return issues
}

/** schema 级字段规则校验入口：保存 / 导出 / 解析共用，避免调用方漏传 dataSources */
export function validateSchemaShape(schema: unknown): string[] {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema))
    return ['表单结构解析失败：应为对象']
  const raw = schema as Pick<FormSchema, 'children' | 'dataSources'>
  return validateFieldRules(raw.children, raw.dataSources)
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
  const permissionIssues = validatePermissions(raw.permissions)
  if (permissionIssues.length)
    throw new Error(`表单结构解析失败：${permissionIssues[0]}`)
  // 与设计器保存拦截共用同一份校验（events/validateEvents），避免两边规则分叉
  const eventIssues = validateEvents(raw.events as FormEventConfig | undefined)
  if (eventIssues.length)
    throw new Error(`表单结构解析失败：${eventIssues[0]}`)
  const ruleIssues = validateSchemaShape(raw)
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
