import type { FormEventConfig } from '../events/types'
import type { FormSchema } from '../types/schema'
import { validateEvents } from '../events/validateEvents'
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
  // 与设计器保存拦截共用同一份校验（events/validateEvents），避免两边规则分叉
  const eventIssues = validateEvents(raw.events as FormEventConfig | undefined)
  if (eventIssues.length)
    throw new Error(`表单结构解析失败：${eventIssues[0]}`)

  const empty = createEmptySchema()
  return {
    ...empty,
    ...raw,
    form: { ...empty.form, ...raw.form },
    children: raw.children,
    version: SCHEMA_VERSION,
  }
}
