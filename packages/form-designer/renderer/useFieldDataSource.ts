import type { FormInstance } from 'antd'
import type { DataSourceDef, FieldOption, FieldSchema } from '../types/schema'
import { Form } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { notifyError, runHooks, warnOnce } from '../events/runHooks'
import { getByPathName } from '../utils/path'
import { getFormDataApi } from './dataApis'
import { useFormHooksRuntime } from './hooksContext'
import { interpolateDeep } from './interpolate'
import { joinName, useNamePrefix } from './namePrefix'

/** 缺省防抖：watch 命中的字段连续输入时只取最后一次 */
export const DEFAULT_DATA_SOURCE_DEBOUNCE = 300

/** 字典接口的约定注册名：宿主注册 `dict`，参数 `{ dictType }` */
const DICT_API_NAME = 'dict'

/** 字典项缺省的 label / value 字段名（宿主 getDictDataByTypeAPI 的返回形状） */
const DICT_LABEL_FIELD = 'dictLabel'
const DICT_VALUE_FIELD = 'dictValue'

/** 数据源失败提示的稳定 key：与钩子错误的提示分开，互不覆盖 */
const DATA_SOURCE_ERROR_KEY = 'form-designer-data-source-error'

export interface FieldDataSourceResult {
  /** 加载出的选项；无来源（或从未加载成功）时为 undefined，调用方保持 props.options 原样 */
  options: FieldOption[] | undefined
}

/** 取数失败中「原因可直接展示给用户」的一类；其余错误一律用通用文案 + console 详情 */
class DataSourceError extends Error {}

/** 解析数据来源：def 优先于 ref（与 HookRef 的「内联优先」同规则） */
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

function isAbortError(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { name?: string }).name === 'AbortError'
}

function requireArray(value: unknown, api: string): unknown[] {
  if (Array.isArray(value))
    return value
  throw new DataSourceError(`数据接口返回的不是数组：${api}`)
}

/**
 * 选项归一化：字典与接口共用同一份（避免两套严格度）。
 * 对象项按 labelField / valueField 取字段（接口默认 label / value，字典默认 dictLabel / dictValue），
 * 缺 value 或值不是字符串 / 数字的项告警一次并跳过 —— 字典接口返回 `['a','b']` 这类形状不符的数组
 * 不会产出 `{ label: '', value: undefined }` 的垃圾选项；
 * 字符串 / 数字项直接当值用（接口返回纯值数组的简写）；其余类型同样告警并跳过。
 */
function toOptions(
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

/** 取数：static 直接用；dict 与 api 都走宿主注册表（包本体不发起任何请求） */
async function fetchOptions(
  def: DataSourceDef,
  form: FormInstance | undefined,
  signal: AbortSignal,
): Promise<FieldOption[]> {
  if (def.type === 'static')
    return def.options

  const values = form?.getFieldsValue(true) ?? {}

  if (def.type === 'dict') {
    const api = getFormDataApi(DICT_API_NAME)
    if (!api)
      throw new DataSourceError(`未注册的数据接口：${DICT_API_NAME}`)
    return toOptions(requireArray(await api({ dictType: def.dictType }, signal), DICT_API_NAME), DICT_API_NAME, {
      labelField: def.labelField || DICT_LABEL_FIELD,
      valueField: def.valueField || DICT_VALUE_FIELD,
    })
  }

  const api = getFormDataApi(def.api)
  if (!api)
    throw new DataSourceError(`未注册的数据接口：${def.api}`)
  const result = await api(interpolateDeep(def.params ?? {}, values), signal)
  // parse 是名路径：接口返回 { data: { list: [...] } } 这类信封时用它取出数组
  const list = def.parse ? getByPathName(result, def.parse) : result
  return toOptions(requireArray(list, def.api), def.api)
}

/**
 * 声明式数据来源的取数钩子（配置形状见 `types/schema.ts` 的 FieldDataSource）。
 *
 * 1. 解析来源：`def` 优先，否则按 `ref` 查 `schema.dataSources`（经 context 下发）；两者皆无则不加载
 * 2. 触发：挂载后加载一次；`watch` 命中的字段变化时防抖（默认 300ms）重新加载
 * 3. 竞态收口：自增请求序号，只有最新序号的结果被采用（后写胜）；重新加载 / 卸载时 abort 上一请求
 * 4. 场景钩子：请求前 `beforeLoadData`（return false 中断本次），成功后 `afterLoadData`；
 *    手动 `ctx.reload` 触发的重取另会触发 `onReload`（见 FormRenderer）
 * 5. 失败降级：`console.error` + 稳定 key 的提示，并**保留上一次的 options**（避免已选值的标签消失）；
 *    `AbortError` 静默忽略（取消是我们自己发起的）
 * 6. 缺注册接口 → 失败并提示「未注册的数据接口：xxx」
 */
export function useFieldDataSource(schema: FieldSchema): FieldDataSourceResult {
  const hooks = useFormHooksRuntime()
  const form = Form.useFormInstance()
  const prefix = useNamePrefix()
  const dataSource = schema.dataSource
  const field = schema.field
  const key = joinName(prefix, field)?.join('.') ?? field ?? ''

  const def = resolveDataSourceDef(dataSource, hooks?.dataSources)
  const watch = useMemo(
    () => (dataSource?.watch ?? []).filter(item => typeof item === 'string' && item.length > 0),
    [dataSource],
  )
  const debounce = typeof dataSource?.debounce === 'number' && dataSource.debounce >= 0
    ? dataSource.debounce
    : DEFAULT_DATA_SOURCE_DEBOUNCE

  // 运行时对象每次渲染都可能是新引用（有效态、公共事件表都会让它变）：取数一律经 ref 读最新值，
  // 既不读过期配置，也不会因为 context 换引用而突然重新取数（那会变成取数循环）
  const latestRef = useRef({ hooks, form, schema })
  latestRef.current = { hooks, form, schema }

  const [options, setOptions] = useState<FieldOption[] | undefined>(undefined)
  const seqRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastWatchRef = useRef<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    // 取数所需的输入一律从 ref 读：这样 load 的身份是稳定的，宿主内联传 schema（每次渲染都是新对象）
    // 也不会让「挂载即取数」变成每次重渲染都取数（依赖源变化的判断交给下面的 sourceKey）
    const runtime = latestRef.current.hooks
    const currentSchema = latestRef.current.schema
    const source = resolveDataSourceDef(currentSchema.dataSource, runtime?.dataSources)
    if (!source)
      return
    const fieldName = currentSchema.field
    const buildCtx = runtime?.buildCtx
    const custom = runtime?.custom
    const events = runtime?.events
    const payload = { field: fieldName, config: source }
    const label = currentSchema.label || fieldName || '未命名字段'
    // static 不发出任何请求：它没有「加载数据」这件事，因此不走请求类的 beforeLoadData / afterLoadData
    const isRemote = source.type !== 'static'

    // beforeLoadData 是关键场景：return false（或抛错）即中断本次加载，不取数也不算失败
    if (buildCtx && isRemote && !await runHooks('beforeLoadData', events?.beforeLoadData, buildCtx({ payload }), custom))
      return

    const seq = seqRef.current + 1
    seqRef.current = seq
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await fetchOptions(source, latestRef.current.form, controller.signal)
      // 后写胜：过期结果直接丢弃（宿主忽略 signal 时请求仍会返回）
      if (seq !== seqRef.current)
        return
      setOptions(result)
      if (buildCtx && isRemote)
        await runHooks('afterLoadData', events?.afterLoadData, buildCtx({ payload: { ...payload, result } }), custom)
    }
    catch (e) {
      if (isAbortError(e) || controller.signal.aborted || seq !== seqRef.current)
        return
      // 失败保留上一次的 options：清空会让已选值的标签当场消失
      console.error(`[form-designer] 数据源加载失败（${label}）`, e)
      const ctx = buildCtx?.()
      if (ctx)
        notifyError(ctx, e instanceof DataSourceError ? e.message : `数据源加载失败：${label}`, e, DATA_SOURCE_ERROR_KEY)
    }
  }, [])

  /**
   * 挂载后取数一次；来源定义变化时重新取数。
   * 依赖用 sourceKey（内容序列化）而不是 def / load 的引用：宿主内联传 schema 时这两个引用每次都变，
   * 用引用作依赖会让「挂载即取数」变成「每次重渲染都取数」。
   */
  const sourceKey = def ? JSON.stringify({ def, watch, debounce, key }) : ''
  useEffect(() => {
    if (!sourceKey)
      return
    lastWatchRef.current = null
    void load()
    return () => {
      abortRef.current?.abort()
    }
  }, [sourceKey, load])

  // watch 命中字段变化 → 防抖重取。定时器放 ref 而不是靠 effect 清理：每次值变化都会重跑本 effect，
  // 用清理函数会把排队中的重取一起清掉（连续输入就永远等不到重取）
  const valuesVersion = hooks?.valuesVersion ?? 0
  useEffect(() => {
    if (!sourceKey || !watch.length || !form)
      return
    const snapshot = JSON.stringify(watch.map(path => getByPathName(form.getFieldsValue(true), path) ?? null))
    if (lastWatchRef.current === null) {
      lastWatchRef.current = snapshot // 首次渲染：挂载 effect 已负责取数，这里只记基线
      return
    }
    if (lastWatchRef.current === snapshot)
      return
    lastWatchRef.current = snapshot
    if (timerRef.current)
      clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void load()
    }, debounce)
  }, [sourceKey, watch, debounce, load, form, valuesVersion])

  // 卸载时取消防抖中的重取（在飞请求由挂载 effect 的清理负责 abort）
  useEffect(() => () => {
    if (timerRef.current)
      clearTimeout(timerRef.current)
  }, [])

  // 登记重取句柄：ctx.reload(field?) 据此精确重取
  const register = hooks?.registerDataSource
  useEffect(() => {
    if (!register || !def)
      return
    return register({ key, field, reload: load })
  }, [register, def, key, field, load])

  return { options }
}
