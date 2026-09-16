import type { CustomHookDef, FormEventConfig, FormHookContext } from '../events/types'
import type { DataSourceDef } from '../types/schema'
import { createContext, use } from 'react'

/** 建钩子上下文：FormRenderer 的 buildCtx 原样下发，调用方可传 over 覆盖场景信息 */
export type BuildHookCtx = (over?: Partial<FormHookContext>) => FormHookContext

/**
 * 数据源实例的重取句柄：由 `useFieldDataSource` 挂载时登记，`ctx.reload` 据此触发重取。
 * `key` 是字段的名路径（嵌套子表单为 `contact.name`），`field` 是 schema.field，
 * 两者任一命中即算 `ctx.reload(field)` 的目标（顶层字段两者同名）。
 */
export interface DataSourceReloadHandle {
  key: string
  field?: string
  reload: () => Promise<void>
}

/**
 * 渲染器运行时（由 FormRenderer 经 context 一次下发）：
 * 字段级钩子（公共事件表 + 建 ctx 的能力）与批次 3 的数据来源 / 联动运行时。
 */
export interface FormHooksRuntime {
  custom?: Record<string, CustomHookDef>
  buildCtx: BuildHookCtx
  /** 表单级场景钩子表：数据源的 beforeLoadData / afterLoadData 从这里取引用 */
  events?: FormEventConfig
  /** 命名数据源表（schema.dataSources）：dataSource.ref 的解析来源 */
  dataSources?: Record<string, DataSourceDef>
  /** 表单值版本号：每次 onValuesChange 自增，作为数据源 watch 重算的信号 */
  valuesVersion?: number
  /** 数据源重取登记：返回注销函数 */
  registerDataSource?: (handle: DataSourceReloadHandle) => () => void
}

const FormHooksContext = createContext<FormHooksRuntime | undefined>(undefined)

export const FormHooksProvider = FormHooksContext.Provider

/** 取字段级钩子运行时；不在 FormRenderer 内（如纯函数级调用）时为 undefined */
export function useFormHooksRuntime(): FormHooksRuntime | undefined {
  return use(FormHooksContext)
}
