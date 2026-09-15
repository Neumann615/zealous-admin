import type { FnSource } from './fnSource'
import type { FormEventConfig } from './types'
import { isFnSource, validateFnSource } from './fnSource'

/** 钩子正文长度上限：正文是用户代码，这里只挡住明显异常的体量（正常钩子远达不到） */
export const HOOK_BODY_LIMIT = 20000

/**
 * 单个函数体的校验（形参名 + 语法 + 正文长度）。
 * 传 where（场景名 / 公共事件 x）时消息带定位；设计器红字不传，只有问题本身。
 */
export function validateHookFn(fn: FnSource, where?: string): string | null {
  const issue = validateFnSource(fn)
  if (issue)
    return where ? `${where}：${issue}` : issue
  if (fn.body.length > HOOK_BODY_LIMIT)
    return `钩子正文过长${where ? `（${where}）` : ''}：最多 ${HOOK_BODY_LIMIT} 字符`
  return null
}

/**
 * 单个引用 / 公共事件定义的校验。fnRequired 为 true 表示这里只认 fn（公共事件表没有 hook 回退）。
 * fn 一旦出现就必须是合法信封：运行时与保存侧都以 fn 优先，形状不对会一路踩空；
 * 两者都没有的引用会被序列化成 {}，回读时整张表单解析失败，因此同样算错。
 */
function validateOne(value: unknown, where: string, fnRequired: boolean): string[] {
  const candidate = value as { fn?: unknown, hook?: unknown } | null | undefined
  const fn = candidate?.fn
  if (fn !== undefined && !isFnSource(fn))
    return [`事件钩子格式不正确（${where}）`]
  if (!isFnSource(fn)) {
    if (fnRequired || typeof candidate?.hook !== 'string')
      return [`事件钩子格式不正确（${where}）`]
    return []
  }
  const issue = validateHookFn(fn, where)
  return issue ? [issue] : []
}

/**
 * events 段校验：场景值为数组、每个引用有合法 fn 或字符串 hook、custom 每项 fn 合法。
 * 保存拦截与 schema 解析共用这一份口径，避免出现「保存放行、回读拒绝」。
 */
export function validateEvents(events: FormEventConfig | undefined): string[] {
  if (events === undefined)
    return []
  if (!events || typeof events !== 'object' || Array.isArray(events))
    return ['events 应为对象']

  const issues: string[] = []
  for (const [scene, refs] of Object.entries(events)) {
    if (scene === 'custom')
      continue
    if (!Array.isArray(refs)) {
      issues.push(`事件钩子格式不正确（${scene}）`)
      continue
    }
    for (const ref of refs)
      issues.push(...validateOne(ref, scene, false))
  }

  const custom = (events as { custom?: Record<string, unknown> }).custom
  if (custom === undefined)
    return issues
  if (!custom || typeof custom !== 'object' || Array.isArray(custom)) {
    issues.push('events.custom 应为对象')
    return issues
  }
  for (const [name, def] of Object.entries(custom))
    issues.push(...validateOne(def, `公共事件 ${name}`, true))

  return issues
}
