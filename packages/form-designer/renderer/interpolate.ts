import { getByPathName } from '../utils/path'

/** `{{名路径}}` 占位符：路径本身不含花括号（两侧空格在取值前 trim 掉） */
const TOKEN = /\{\{([^{}]+)\}\}/g

/**
 * 把 `"固定文本 {{a.b}}"` 里的 `{{名路径}}` 替换成当前值，缺失（undefined / null）替换为空串。
 * 取值走 `getByPathName`，因此支持嵌套名路径与数组下标（`contact.name` / `items.0.qty`）。
 */
export function interpolate(template: string, values: Record<string, any> | undefined): string {
  return template.replace(TOKEN, (_match, path: string) => {
    const value = getByPathName(values, path.trim())
    return value === undefined || value === null ? '' : String(value)
  })
}

/** 仅普通对象会被递归下探，避免把 Date / Map 这类实例摊平成一个空对象 */
function isPlainObject(input: unknown): input is Record<string, any> {
  if (!input || typeof input !== 'object')
    return false
  const proto = Object.getPrototypeOf(input)
  return proto === Object.prototype || proto === null
}

/**
 * 递归处理对象 / 数组里的字符串（数据源 params 等），非字符串原样返回、结构不变。
 */
export function interpolateDeep<T>(input: T, values: Record<string, any> | undefined): T {
  if (typeof input === 'string')
    return interpolate(input, values) as unknown as T
  if (Array.isArray(input))
    return input.map(item => interpolateDeep(item, values)) as unknown as T
  if (isPlainObject(input)) {
    const out: Record<string, any> = {}
    for (const [key, value] of Object.entries(input))
      out[key] = interpolateDeep(value, values)
    return out as unknown as T
  }
  return input
}
