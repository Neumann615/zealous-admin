import type { CustomHookDef, FormHookContext, HookRef, HookScene } from './types'
import { compileFn } from './fnSource'
import { CRITICAL_SCENES } from './types'

/** 解析引用：内联 fn 优先，其次按名查公共事件表 */
function resolveFn(ref: HookRef, custom?: Record<string, CustomHookDef>) {
  if (ref.fn)
    return ref.fn
  if (ref.hook)
    return custom?.[ref.hook]?.fn
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
      const result = await compileFn(src)(ctx)
      if (result === false && critical)
        return false
    }
    catch (e) {
      console.error(`[form-designer] 钩子执行失败（${scene}）`, e)
      ctx.message.error(`表单钩子执行失败：${scene}`)
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
): Promise<void> {
  const def = custom?.[name]
  if (!def)
    return
  try {
    await compileFn(def.fn)(ctx)
  }
  catch (e) {
    console.error(`[form-designer] 公共事件执行失败（${name}）`, e)
    ctx.message.error(`公共事件执行失败：${name}`)
  }
}
