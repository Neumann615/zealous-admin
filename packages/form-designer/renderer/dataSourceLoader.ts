import type { DataSourceDef, FieldOption, FieldSchema } from '../types/schema'
import { warnOnce } from '../events/runHooks'
import { getByPathName } from '../utils/path'
import { getFormDataApi } from './dataApis'
import { interpolateDeep } from './interpolate'

export const DEFAULT_DATA_SOURCE_DEBOUNCE = 300

const DICT_API_NAME = 'dict'
const DICT_LABEL_FIELD = 'dictLabel'
const DICT_VALUE_FIELD = 'dictValue'

export class DataSourceError extends Error {}

export function resolveDataSourceDef(
  dataSource: FieldSchema['dataSource'],
  dataSources?: Record<string, DataSourceDef>,
): DataSourceDef | undefined {
  if (!dataSource)
    return undefined
  if (dataSource.def)
    return dataSource.def
  return dataSource.ref ? dataSources?.[dataSource.ref] : undefined
}

function requireArray(value: unknown, api: string): unknown[] {
  if (Array.isArray(value))
    return value
  throw new DataSourceError(`数据接口返回的不是数组：${api}`)
}

function normalizeOptions(
  list: unknown[],
  api: string,
  mapping: { labelField: string, valueField: string } = { labelField: 'label', valueField: 'value' },
): FieldOption[] {
  const options: FieldOption[] = []
  list.forEach((item, index) => {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const row = item as Record<string, any>
      const value = row[mapping.valueField]
      if (typeof value === 'string' || typeof value === 'number') {
        options.push({
          label: String(row[mapping.labelField] ?? ''),
          value,
          ...(row.disabled === undefined ? {} : { disabled: !!row.disabled }),
        })
        return
      }
      warnOnce(
        `option:${api}:${mapping.valueField}`,
        `[form-designer] 数据接口返回的选项缺少 ${mapping.valueField}（${api} 第 ${index + 1} 项），已跳过该选项`,
      )
      return
    }

    if (typeof item === 'string' || typeof item === 'number') {
      options.push({ label: String(item), value: item })
      return
    }

    warnOnce(
      `option:${api}:type`,
      `[form-designer] 数据接口返回的选项既不是对象也不是值（${api} 第 ${index + 1} 项），已跳过该选项`,
    )
  })
  return options
}

export async function loadFieldOptions(
  def: DataSourceDef,
  values: Record<string, any>,
  signal?: AbortSignal,
): Promise<FieldOption[]> {
  if (def.type === 'static')
    return def.options

  if (def.type === 'dict') {
    const api = getFormDataApi(DICT_API_NAME)
    if (!api)
      throw new DataSourceError(`未注册的数据接口：${DICT_API_NAME}`)
    return normalizeOptions(
      requireArray(await api({ dictType: def.dictType }, signal), DICT_API_NAME),
      DICT_API_NAME,
      {
        labelField: def.labelField || DICT_LABEL_FIELD,
        valueField: def.valueField || DICT_VALUE_FIELD,
      },
    )
  }

  const api = getFormDataApi(def.api)
  if (!api)
    throw new DataSourceError(`未注册的数据接口：${def.api}`)
  const result = await api(interpolateDeep(def.params ?? {}, values), signal)
  const list = def.parse ? getByPathName(result, def.parse) : result
  return normalizeOptions(requireArray(list, def.api), def.api)
}
