import type { ControlOperator, ControlRule } from '../types/schema'

/** 需要比较值的 operator（empty / notEmpty 只看空与非空） */
export function needsControlValue(operator: ControlOperator | undefined): boolean {
  const op = operator ?? 'eq'
  return op !== 'empty' && op !== 'notEmpty'
}

/**
 * 值输入 → 落盘值：数字 / 布尔 / 数组按 JSON 解析，其它按字符串（与运行时严格相等的口径一致，
 * 因此「等于 1」要写 1 而不是 "1"）。
 */
export function parseControlValue(raw: string): any {
  const text = raw.trim()
  if (!text)
    return ''
  try {
    return JSON.parse(text)
  }
  catch {
    return raw
  }
}

/** 值 → 输入框文本：对象 / 数组用 JSON 展示，其余直接转字符串 */
export function formatControlValue(value: any): string {
  if (value === undefined || value === null)
    return ''
  if (typeof value === 'object')
    return JSON.stringify(value)
  return String(value)
}

/**
 * 切换比较方式时归一化 value：`in` 需要数组（非数组的残值一律丢掉，回落空数组）、
 * `empty` / `notEmpty` 不需要值（直接删掉，避免留下永不生效的残值）、其余按单值处理。
 * 与 3A 的 withRuleType 同一纪律：面板不留「切过类型」的中间态空壳。
 */
export function withControlOperator(rule: ControlRule, operator: ControlOperator): ControlRule {
  const next: ControlRule = { field: rule.field, operator, effects: rule.effects ?? [] }
  if (operator === 'in')
    next.value = Array.isArray(rule.value) ? rule.value : []
  else if (needsControlValue(operator))
    next.value = Array.isArray(rule.value) ? '' : (rule.value ?? '')
  return next
}
