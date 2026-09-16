import type { CustomHookDef, FormHookContext, HookRef, HookScene } from './types'
import { compileFn } from './fnSource'
import { CRITICAL_SCENES } from './types'

/** 上报用的稳定 key：antd 会覆盖同 key 的提示，避免逐键触发时堆叠刷屏 */
const HOOK_ERROR_KEY = 'form-designer-hook-error'

/** emit 嵌套深度上限：钩子自 emit / 两个公共事件互 emit 会沿微任务无限递归，超过即中断该次 emit */
const EMIT_DEPTH_LIMIT = 5

/**
 * emit 嵌套深度按 ctx 对象记账（WeakMap），不落公共类型、不参与序列化。
 * 不能用模块级计数：同页多个表单并发 await emit 会互相抬高计数，≥5 个在飞就误报「递归过深」。
 * 深度随调用链生成的 ctx 副本走，副本随调用链一起被 GC，无需手工归还。
 */
const emitDepths = new WeakMap<FormHookContext, number>()

/** 已提示过的配置问题（键形如 both:名 / missing:名），只警告一次，避免逐键触发时重复刷屏 */
const warnedConfigs = new Set<string>()

/** 已打过 console 的键：toast 按稳定 key 去重，console 按场景 / 公共事件名去重 */
const loggedErrors = new Set<string>()

/** 按 key 只警告一次（钩子与校验规则共用一份去重表，避免逐次触发的重复刷屏） */
export function warnOnce(key: string, text: string) {
  if (warnedConfigs.has(key))
    return
  warnedConfigs.add(key)
  console.warn(text)
}

function logErrorOnce(key: string, text: string, detail?: unknown) {
  if (loggedErrors.has(key))
    return
  loggedErrors.add(key)
  if (detail === undefined)
    console.error(text)
  else
    console.error(text, detail)
}

/**
 * 错误提示上报：本身不能改变控制流、更不能从 catch 里二次抛出。
 * 宿主没挂 <App> 时 antd 的 useApp() 返回 { message: {} }，ctx.message.error 会直接 TypeError。
 */
function notifyError(ctx: FormHookContext, content: string, detail?: unknown) {
  try {
    ctx.message.error({ content, key: HOOK_ERROR_KEY })
  }
  catch (e) {
    logErrorOnce('notify', '[form-designer] 钩子错误提示上报失败（宿主可能未挂载 <App>）', detail ?? e)
  }
}

/** onFieldChange 触发前的字段过滤：未声明 watch 的引用对任意字段都触发 */
export function filterRefsForField(refs: HookRef[] | undefined, field: string): HookRef[] {
  return (refs || []).filter(ref => !ref.watch?.length || ref.watch.includes(field))
}

/**
 * 解析引用：内联 fn 优先于按名引用（内联更具体，保存拦截也只校验 ref.fn）；
 * 两种「配了却不生效」的情况各警告一次：同时配了 fn 与 hook、引用了不存在的公共事件
 */
function resolveFn(ref: HookRef, custom?: Record<string, CustomHookDef>) {
  if (ref.fn) {
    if (ref.hook)
      warnOnce(`both:${ref.hook}`, `[form-designer] 钩子同时配置了 fn 与 hook，运行时以 fn 为准（hook: ${ref.hook}）`)
    return ref.fn
  }
  if (ref.hook) {
    const def = custom?.[ref.hook]?.fn
    if (!def)
      warnOnce(`missing:${ref.hook}`, `[form-designer] 钩子引用了不存在的公共事件：${ref.hook}`)
    return def
  }
  return undefined
}

/**
 * 执行某场景下的全部钩子。
 * 返回 false 表示中断：钩子显式 return false，或关键场景下钩子抛错。
 */
export async function runHooks(
  scene: HookScene,
  refs: HookRef[] | undefined,
  ctx: FormHookContext,
  custom?: Record<string, CustomHookDef>,
): Promise<boolean> {
  if (!refs?.length)
    return true
  const critical = CRITICAL_SCENES.includes(scene)
  const ordered = [...refs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  for (const ref of ordered) {
    const src = resolveFn(ref, custom)
    if (!src)
      continue
    try {
      ctx.scene = scene
      const result = await compileFn(src)(ctx)
      if (result === false && critical)
        return false
    }
    catch (e) {
      logErrorOnce(`hook:${scene}`, `[form-designer] 钩子执行失败（${scene}）`, e)
      notifyError(ctx, `表单钩子执行失败：${scene}`)
      if (critical)
        return false
    }
  }
  return true
}

/** 执行命名公共事件（ctx.emit 的实现）；非关键场景，抛错只提示不中断 */
export async function emitHook(
  name: string,
  ctx: FormHookContext,
  custom?: Record<string, CustomHookDef>,
  payload?: any,
): Promise<void> {
  const def = custom?.[name]
  if (!def) {
    warnOnce(`missing:${name}`, `[form-designer] 公共事件不存在：${name}`)
    return
  }
  const depth = emitDepths.get(ctx) ?? 0
  if (depth >= EMIT_DEPTH_LIMIT) {
    logErrorOnce(`depth:${name}`, `[form-designer] 公共事件 emit 递归过深（${name}），已中断`)
    notifyError(ctx, `表单钩子 emit 递归过深：${name}`)
    return
  }
  // 新建 ctx 投递 payload：不污染调用方的值快照，也不与真实字段名撞名。
  // emit 重新绑定到这份新 ctx 上：深度随调用链走，钩子里的 ctx.emit 才会继续往深处记账
  // （ctx.emit 是闭包在 ctx 自身上的，直接复制会把深度又读回上一层）。
  const inner: FormHookContext = { ...ctx, payload }
  inner.emit = (nextName, nextPayload) => emitHook(nextName, inner, custom, nextPayload)
  emitDepths.set(inner, depth + 1)
  try {
    await compileFn(def.fn)(inner)
  }
  catch (e) {
    logErrorOnce(`emit:${name}`, `[form-designer] 公共事件执行失败（${name}）`, e)
    notifyError(inner, `公共事件执行失败：${name}`)
  }
}
