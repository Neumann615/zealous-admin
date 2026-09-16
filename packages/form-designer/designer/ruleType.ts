import type { ValidateRule, ValidateRuleType } from '../types/schema'
import { makeFnSource } from '../events/fnSource'
import { THRESHOLD_RULE_TYPES } from '../types/schema'
import { HOOK_ARGS } from './HookEditor'

/**
 * 「自定义校验必须总有可执行来源」的单一出处：空正文是合法的「什么都不做」，
 * 而没有 fn 也没有 hook 的规则会被序列化成 `{ type: 'validator' }`，保存放行、回读被 parseSchema 拒。
 */
export function emptyInlineFn() {
  return makeFnSource(HOOK_ARGS, '')
}

/**
 * 切换规则类型时重建规则：丢弃新类型用不到的字段（正则的 pattern、阈值的 value、自定义校验的 hook / fn），
 * 保留 message / trigger 这类所有类型共用的项。
 *
 * 自定义校验额外保证「总有可执行来源」：只带 hook 的规则一旦在面板里被清空引用，
 * 序列化结果会退化成 `{ type: 'validator' }`，保存放行但回读时 parseSchema 直接拒绝 —— 与批次 2 的
 * HookRef 同一课，因此切到该类型时补一份空正文（空正文是合法的「什么都不做」）。
 */
export function withRuleType(rule: ValidateRule, type: ValidateRuleType): ValidateRule {
  const next: ValidateRule = {
    type,
    ...(rule.message ? { message: rule.message } : {}),
    ...(rule.trigger ? { trigger: rule.trigger } : {}),
  }
  if (type === 'regexp' && rule.pattern)
    next.pattern = rule.pattern
  if (THRESHOLD_RULE_TYPES.includes(type) && typeof rule.value === 'number')
    next.value = rule.value
  if (type === 'validator') {
    if (rule.hook)
      next.hook = rule.hook
    next.fn = rule.fn ?? emptyInlineFn()
  }
  return next
}
