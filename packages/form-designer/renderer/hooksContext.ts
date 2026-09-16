import type { CustomHookDef, FormHookContext } from '../events/types'
import { createContext, use } from 'react'

/** 建钩子上下文：FormRenderer 的 buildCtx 原样下发，调用方可传 over 覆盖场景信息 */
export type BuildHookCtx = (over?: Partial<FormHookContext>) => FormHookContext

/** 字段级钩子运行时：公共事件表 + 建 ctx 的能力（由 FormRenderer 下发） */
export interface FormHooksRuntime {
  custom?: Record<string, CustomHookDef>
  buildCtx: BuildHookCtx
}

const FormHooksContext = createContext<FormHooksRuntime | undefined>(undefined)

export const FormHooksProvider = FormHooksContext.Provider

/** 取字段级钩子运行时；不在 FormRenderer 内（如纯函数级调用）时为 undefined */
export function useFormHooksRuntime(): FormHooksRuntime | undefined {
  return use(FormHooksContext)
}
