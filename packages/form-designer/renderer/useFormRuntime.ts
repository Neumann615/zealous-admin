import type { FormInstance } from 'antd'
import type { MessageInstance } from 'antd/es/message/interface'
import type { FormHookContext } from '../events/types'
import type { FieldSchema, FormSchema } from '../types/schema'
import type { EffectiveState } from './control'
import type { DataSourceReloadHandle } from './hooksContext'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emitHook, runHooks } from '../events/runHooks'
import { findNodeByField } from '../utils/schemaTree'
import { evalControl } from './control'

/**
 * 是否有字段依赖表单值：数据源的 `watch`（依赖重跑）、联动 `control`（有效态重算）
 * 或公式 `computed`（结果重算）。有依赖才需要值版本号。
 */
function consumesValues(children: FieldSchema[]): boolean {
  return children.some(node =>
    !!node.dataSource?.watch?.length || !!node.control?.length || !!node.computed?.expression || consumesValues(node.children ?? []),
  )
}

/** 收集每个字段的有效态，键为节点 id；容器 disabled 也靠这份结果向子字段下发。 */
function collectControlStates(
  children: FieldSchema[],
  values: Record<string, any>,
  out: Record<string, EffectiveState> = {},
): Record<string, EffectiveState> {
  for (const node of children) {
    if (node.control?.length) {
      const state = evalControl(node.control, values)
      if (Object.keys(state).length)
        out[node.id] = state
    }
    if (node.children?.length)
      collectControlStates(node.children, values, out)
  }
  return out
}

interface UseFormRuntimeParams {
  schema: FormSchema
  form: FormInstance
  message: MessageInstance
  /** 公式字段也会消费 valuesVersion，由渲染器传入避免把公式执行也搬进本 hook */
  hasComputedFields: boolean
}

export function useFormRuntime({ schema, form, message, hasComputedFields }: UseFormRuntimeParams) {
  const [valuesVersion, setValuesVersion] = useState(0)
  const hasControls = useMemo(() => schema.children.some(node => !!node.control?.length), [schema.children])
  const watchesValues = useMemo(() => consumesValues(schema.children), [schema.children])
  /** 数据源重取句柄：ctx.reload 的目标集合（Form.List 行内字段会登记多个实例） */
  const reloadHandlesRef = useRef(new Map<number, DataSourceReloadHandle>())
  const reloadSeqRef = useRef(0)
  const schemaRef = useRef(schema)
  schemaRef.current = schema

  const registerDataSource = useCallback((handle: DataSourceReloadHandle) => {
    const id = ++reloadSeqRef.current
    reloadHandlesRef.current.set(id, handle)
    return () => {
      reloadHandlesRef.current.delete(id)
    }
  }, [])

  /** 值版本号自增：没有消费者（schema 里没声明 watch / control / computed）时不自增 */
  const bumpValuesVersion = useCallback(() => {
    if (watchesValues)
      setValuesVersion(value => value + 1)
  }, [watchesValues])

  /**
   * 首次渲染时 initialValues 可能还没进 store（antd 在自己的 effect 里装载），
   * 挂载后强制重算一次联动有效态与公式结果。
   */
  useEffect(() => {
    if (hasControls || hasComputedFields)
      // eslint-disable-next-line react/set-state-in-effect -- 刻意的挂载后重算，只在有联动 / 公式时触发一次
      setValuesVersion(value => value + 1)
  }, [hasComputedFields, hasControls])

  const controls = hasControls
    ? collectControlStates(schema.children, form.getFieldsValue(true))
    : undefined

  const buildCtx = useCallback((over?: Partial<FormHookContext>): FormHookContext => {
    const current = schemaRef.current.events
    const ctx: FormHookContext = {
      form,
      values: form.getFieldsValue(true),
      getValues: () => form.getFieldsValue(true),
      /**
       * 改值后立刻自增值版本号：联动的有效态与数据源 watch 的依赖比较都以它为信号。
       * 值版本号只驱动纯计算，正常使用不会自增成环；数据源 watch 中的自造反馈
       * 仍由取数依赖比较、防抖与请求序号限流。
       */
      setValue: (field, value) => {
        form.setFieldsValue({ [field]: value })
        bumpValuesVersion()
      },
      setValues: (patch) => {
        form.setFieldsValue(patch)
        bumpValuesVersion()
      },
      getField: field => findNodeByField(schemaRef.current.children, field) ?? undefined,
      reload: async (field?: string) => {
        const targets = [...reloadHandlesRef.current.values()]
          .filter(handle => !field || handle.key === field || handle.field === field)
        await Promise.all(targets.map(handle => handle.reload()))
        await runHooks('onReload', schemaRef.current.events?.onReload, buildCtx({ payload: { field } }), current?.custom)
      },
      message,
      emit: async () => {},
      ...over,
    }
    ctx.emit = (name, payload) => emitHook(name, ctx, current?.custom, payload)
    return ctx
  }, [form, message, bumpValuesVersion])

  return {
    buildCtx,
    bumpValuesVersion,
    controls,
    registerDataSource,
    schemaRef,
    valuesVersion,
  }
}
