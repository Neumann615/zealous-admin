import type { CustomHookDef, FormHookContext, HookRef, HookScene } from './types'
import { compileFn } from './fnSource'
import { CRITICAL_SCENES } from './types'

/** 上报用的稳定 key：antd 会覆盖同 key 的提示，避免逐键触发时堆叠刷屏 */
const HOOK_ERROR_KEY = 'form-designer-hook-error'

/** emit 嵌套深度上限：钩子自 emit / 两个公共事件互 emit 会沿微任务无限递归，超过即中断该次 emit */
const EMIT_DEPTH_LIMIT = 5

/** 当前 emit 嵌套层数；模块级共享，finally 里归还，正常与异常路径都不能漏 */
let emitDepth = 0

/** 已提示过的配置问题（键形如 both:名 / missing:名），只警告一次，避免逐键触发时重复刷屏 */
const warnedConfigs = new Set<string>()

function warnOnce(key: string, text: string) {
  if (warnedConfigs.has(key))
    return
  warnedConfigs.add(key)
  console.warn(text)
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
      console.error(`[form-designer] 钩子执行失败（${scene}）`, e)
      ctx.message.error({ content: `表单钩子执行失败：${scene}`, key: HOOK_ERROR_KEY })
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
  if (emitDepth >= EMIT_DEPTH_LIMIT) {
    console.error(`[form-designer] 公共事件 emit 递归过深（${name}），已中断`)
    ctx.message.error({ content: `表单钩子 emit 递归过深：${name}`, key: HOOK_ERROR_KEY })
    return
  }
  emitDepth++
  try {
    // 新建 ctx 投递 payload：不污染调用方的值快照，也不与真实字段名撞名
    await compileFn(def.fn)({ ...ctx, payload })
  }
  catch (e) {
    console.error(`[form-designer] 公共事件执行失败（${name}）`, e)
    ctx.message.error({ content: `公共事件执行失败：${name}`, key: HOOK_ERROR_KEY })
  }
  finally {
    // 钩子体内 await 时其它 emit 也在计数，这里必须成对归还
    emitDepth--
  }
}
