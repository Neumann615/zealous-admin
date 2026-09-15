import type { FormInstance } from 'antd'
import type { FieldSchema } from '../types/schema'
import type { FnSource } from './fnSource'

/** 表单级场景（命名对齐参照实现，beforeFetch 更名为 beforeLoadData） */
export type HookScene
  = | 'onFormCreated'
    | 'onFormMounted'
    | 'onFormUnmount'
    | 'onFieldChange'
    | 'beforeLoadData'
    | 'afterLoadData'
    | 'beforeSubmit'
    | 'onValidateFail'
    | 'afterSubmit'
    | 'onSubmitError'
    | 'onReset'
    | 'onReload'

/** 关键场景：钩子抛错即中断流程（其余场景抛错只跳过该条） */
export const CRITICAL_SCENES: readonly HookScene[] = ['beforeSubmit', 'beforeLoadData']

export interface HookRef {
  /** 引用公共事件表；与 fn 同时存在时 fn 优先 */
  hook?: string
  /** 内联函数体 */
  fn?: FnSource
  /** 仅 onFieldChange 生效：只在这些字段变化时触发；空/未填 = 任意字段 */
  watch?: string[]
  order?: number
}

export interface CustomHookDef {
  label?: string
  fn: FnSource
}

export type FormEventConfig
  = Partial<Record<HookScene, HookRef[]>> & {
    /** 命名公共事件表：写一次、表单级与字段级都可按名引用 */
    custom?: Record<string, CustomHookDef>
  }

/** 钩子执行上下文（单一入参，API 面即文档面） */
export interface FormHookContext {
  /** antd 表单实例 */
  form: FormInstance
  /** 触发时刻的值快照；要最新值走 getValues() */
  values: Record<string, any>
  /** 当前场景，由 runHooks 在调用前写入 */
  scene?: HookScene
  /** ctx.emit 投递的数据，由 emitHook 以新建 ctx 的形式传入（不写入 values） */
  payload?: any
  /** onFieldChange 场景：本次变化的字段与值 */
  changed?: { field: string, value: any }
  getValues: () => Record<string, any>
  setValue: (field: string, value: any) => void
  setValues: (patch: Record<string, any>) => void
  /** 按 field 查节点（读 label / props 等） */
  getField: (field: string) => FieldSchema | undefined
  /** 触发一个命名公共事件 */
  emit: (name: string, payload?: any) => Promise<void>
  /** 重跑数据源（批次 3 接入；未接入时为空实现） */
  reload: (field?: string) => Promise<void>
  message: {
    success: (s: string) => void
    error: (s: string | { content: string, key?: string }) => void
    warning: (s: string) => void
    info: (s: string) => void
  }
}
