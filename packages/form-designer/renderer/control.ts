import type { ControlRule } from '../types/schema'
import { getByPathName } from '../utils/path'

/** 名路径取值（支持 contact.name / items.0.qty）：与插值、数据源 watch 共用同一份实现 */
export { getByPathName }

/** 字段的有效态：只出现被命中的项，未命中项为 undefined（调用方按「未配置」处理） */
export interface EffectiveState {
  hidden?: boolean
  disabled?: boolean
  required?: boolean
}

/** empty 的判定：undefined / null / 空串 / 空数组都算空；0 与 false 不算（它们是有效值） */
function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === '')
    return true
  return Array.isArray(value) && value.length === 0
}

/**
 * 单条规则的条件判定。未配置 operator 或配置了非法 operator（手写 / 外部 JSON）时按 `eq` 处理，
 * 与面板下拉的默认值一致；比较一律用严格相等，因此「1」与 1 不相等。
 */
function matchRule(rule: ControlRule, value: unknown): boolean {
  switch (rule.operator ?? 'eq') {
    case 'neq':
      return value !== rule.value
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(value)
    case 'empty':
      return isEmpty(value)
    case 'notEmpty':
      return !isEmpty(value)
    default:
      return value === rule.value
  }
}

/**
 * 按当前值求字段的有效态：同一规则内的效果全生效，多条规则的效果取「或」（任一命中即生效）。
 * 无规则、规则全部未命中、或规则形状不完整（缺 field）时返回空对象。
 */
export function evalControl(rules: ControlRule[] | undefined, values: Record<string, any>): EffectiveState {
  const state: EffectiveState = {}
  for (const rule of rules ?? []) {
    if (!rule || typeof rule.field !== 'string' || !rule.field)
      continue
    if (!matchRule(rule, getByPathName(values, rule.field)))
      continue
    for (const effect of rule.effects ?? []) {
      if (effect === 'hidden' || effect === 'disabled' || effect === 'required')
        state[effect] = true
    }
  }
  return state
}
