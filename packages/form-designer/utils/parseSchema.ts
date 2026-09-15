import type { FnSource } from '../events/fnSource'
import type { FormSchema } from '../types/schema'
import { isFnSource } from '../events/fnSource'
import { createEmptySchema, SCHEMA_VERSION } from '../types/schema'

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

/** 钩子正文长度上限：正文是用户代码，这里只挡住明显异常的体量（防止解析/编译当机） */
const HOOK_BODY_LIMIT = 20000

/** 单个引用的形状：fn 只要出现就必须合法（否则运行时与保存校验都会踩空），hook 必须是字符串 */
function assertHookRef(ref: unknown, where: string): void {
  const candidate = ref as { fn?: unknown, hook?: unknown } | null | undefined
  if (candidate?.fn !== undefined && !isFnSource(candidate.fn))
    throw new Error(`表单结构解析失败：事件钩子格式不正确（${where}）`)
  if (!isFnSource(candidate?.fn) && typeof candidate?.hook !== 'string')
    throw new Error(`表单结构解析失败：事件钩子格式不正确（${where}）`)
  if (isFnSource(candidate?.fn) && candidate.fn.body.length > HOOK_BODY_LIMIT)
    throw new Error(`表单结构解析失败：钩子正文过长（${where}），最多 ${HOOK_BODY_LIMIT} 字符`)
}

/** events 段形状校验：场景值为数组、每个引用有合法 fn 或字符串 hook、custom 每项 fn 合法 */
function assertEvents(events: unknown): void {
  if (events === undefined)
    return
  if (!events || typeof events !== 'object' || Array.isArray(events))
    throw new Error('表单结构解析失败：events 应为对象')
  const table = events as Record<string, unknown>
  for (const [scene, refs] of Object.entries(table)) {
    if (scene === 'custom')
      continue
    if (!Array.isArray(refs))
      throw new Error(`表单结构解析失败：事件钩子格式不正确（${scene}）`)
    for (const ref of refs)
      assertHookRef(ref, scene)
  }
  const custom = table.custom
  if (custom === undefined)
    return
  if (!custom || typeof custom !== 'object' || Array.isArray(custom))
    throw new Error('表单结构解析失败：events.custom 应为对象')
  for (const [name, def] of Object.entries(custom as Record<string, unknown>)) {
    const fn = (def as { fn?: FnSource } | null | undefined)?.fn
    if (!isFnSource(fn))
      throw new Error(`表单结构解析失败：事件钩子格式不正确（公共事件 ${name}）`)
    if (fn.body.length > HOOK_BODY_LIMIT)
      throw new Error(`表单结构解析失败：钩子正文过长（公共事件 ${name}），最多 ${HOOK_BODY_LIMIT} 字符`)
  }
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
  assertEvents(raw.events)

  const empty = createEmptySchema()
  return {
    ...empty,
    ...raw,
    form: { ...empty.form, ...raw.form },
    children: raw.children,
    version: SCHEMA_VERSION,
  }
}
