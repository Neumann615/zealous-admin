import type { FormSchema } from '../types/schema'
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

  let version = Number(raw.version) || 1
  if (version > SCHEMA_VERSION)
    throw new Error(`不支持的表单版本 v${version}，请升级表单设计器`)
  while (version < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version]
    if (!migrate)
      throw new Error(`表单结构解析失败：缺少 v${version} 的迁移`)
    raw = migrate(raw)
    version = Number(raw.version)
  }

  if (!Array.isArray(raw.children))
    throw new Error('表单结构解析失败：children 应为数组')
  if (raw.form !== undefined && (typeof raw.form !== 'object' || raw.form === null))
    throw new Error('表单结构解析失败：form 应为对象')

  const empty = createEmptySchema()
  return {
    ...empty,
    ...raw,
    form: { ...empty.form, ...raw.form },
    children: raw.children,
    version: SCHEMA_VERSION,
  }
}
