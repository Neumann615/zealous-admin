/** 可序列化函数信封：schema 里只存源码，运行时编译 */
export interface FnSource {
  $type: 'fn'
  args: string[]
  body: string
}

const IDENTIFIER = /^[a-z_$][\w$]*$/i

export function isFnSource(value: unknown): value is FnSource {
  if (!value || typeof value !== 'object')
    return false
  const v = value as Record<string, unknown>
  return v.$type === 'fn'
    && Array.isArray(v.args)
    && v.args.every(a => typeof a === 'string')
    && typeof v.body === 'string'
}

export function makeFnSource(args: string[], body: string): FnSource {
  return { $type: 'fn', args, body }
}

/** 形参名与语法校验，通过返回 null（保存拦截与内联提示共用） */
export function validateFnSource(src: FnSource): string | null {
  const bad = src.args.find(a => !IDENTIFIER.test(a))
  if (bad)
    return `参数名不合法：${bad}`
  try {
    // eslint-disable-next-line no-new-func, no-new -- 模型 A 的既定实现，见计划头部风险说明
    new Function(...src.args, src.body)
    return null
  }
  catch (e: any) {
    return `语法错误：${e?.message || '无法编译'}`
  }
}

const cache = new Map<string, (...args: any[]) => any>()
/** 缓存上限，超出整体清空（表单钩子数量级很小，无需 LRU） */
const CACHE_LIMIT = 500

/** 编译并记忆化（与参照实现的差异 2：参照实现每次触发都重新 new Function） */
export function compileFn(src: FnSource): (...args: any[]) => any {
  const key = `${src.args.join(',')}\u0000${src.body}`
  const hit = cache.get(key)
  if (hit)
    return hit
  // eslint-disable-next-line no-new-func -- 模型 A 的既定实现，见计划头部风险说明
  const fn = new Function(...src.args, src.body) as (...args: any[]) => any
  if (cache.size >= CACHE_LIMIT)
    cache.clear()
  cache.set(key, fn)
  return fn
}
