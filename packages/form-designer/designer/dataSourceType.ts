import type { DataSourceDef, DataSourceType, FieldDataSource, FieldOption } from '../types/schema'

/** 面板上的来源类型：三种 DataSourceDef + 引用命名数据源（ref） */
export type DataSourceKind = DataSourceType | 'ref'

/** 面板与形状校验共用的类型枚举（DataSourceType 全集 + ref 这个面板专有项） */
export const DATA_SOURCE_KINDS: DataSourceKind[] = ['static', 'metadata', 'api', 'ref']

/** 当前来源类型；def 与 ref 同时存在时按运行时的「def 优先」口径取 def */
export function dataSourceKind(dataSource?: FieldDataSource): DataSourceKind | undefined {
  if (dataSource?.def)
    return dataSource.def.type
  return dataSource?.ref ? 'ref' : undefined
}

/**
 * 切换来源类型：丢弃新类型用不到的字段（含 ref / def 二选一），只保留与类型无关的 watch / debounce。
 * 与 3A 的 withRuleType 同一纪律：不让面板产出「切过类型」的中间态空壳，
 * 新类型必需的参数以空值落盘，由保存拦截（parseSchema）提示补全。
 *
 * 切到 `static` 时用 `seedOptions`（组件属性里已配的 `props.options`）播种初值：
 * 数据来源结果会覆盖 `props.options`（空数组同样覆盖），不播种会让「切到静态」当场清空已有选项。
 */
export function withDataSourceKind(
  dataSource: FieldDataSource | undefined,
  kind: DataSourceKind,
  seedOptions?: FieldOption[],
): FieldDataSource {
  const next: FieldDataSource = {}
  if (dataSource?.watch?.length)
    next.watch = dataSource.watch
  if (typeof dataSource?.debounce === 'number')
    next.debounce = dataSource.debounce

  if (kind === 'ref')
    return { ...next, ref: dataSource?.ref ?? '' }

  const prev: DataSourceDef | undefined = dataSource?.def
  if (kind === 'static') {
    return {
      ...next,
      def: { type: 'static', options: prev?.type === 'static' ? prev.options : (seedOptions ?? []) },
    }
  }
  if (kind === 'metadata') {
    return {
      ...next,
      def: {
        type: 'metadata',
        enumCode: prev?.type === 'metadata' ? prev.enumCode : '',
        ...(prev?.type === 'metadata' && prev.systemName ? { systemName: prev.systemName } : {}),
        ...(prev?.type === 'metadata' && prev.onlyValid !== undefined ? { onlyValid: prev.onlyValid } : {}),
        ...(prev?.type === 'metadata' && prev.shape ? { shape: prev.shape } : {}),
      },
    }
  }
  return {
    ...next,
    def: {
      type: 'api',
      api: prev?.type === 'api' ? prev.api : '',
      ...(prev?.type === 'api' && prev.params ? { params: prev.params } : {}),
      ...(prev?.type === 'api' && prev.parse ? { parse: prev.parse } : {}),
    },
  }
}
