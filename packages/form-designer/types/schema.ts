import type { FnSource } from '../events/fnSource'
import type { FormEventConfig } from '../events/types'

/** 可透传给 antd Form 的属性（白名单，须与 pickAntdFormProps 保持一致） */
export interface AntdFormPassthrough {
  layout?: 'horizontal' | 'vertical' | 'inline'
  labelAlign?: 'left' | 'right'
  size?: 'large' | 'middle' | 'small'
  colon?: boolean
  disabled?: boolean
}

/** 表单全局配置：antd 透传项 + 设计器自有项 */
export interface FormGlobalConfig extends AntdFormPassthrough {
  /** 标签宽度（px），水平布局下转为 labelCol 列宽 */
  labelWidth?: number
  /** 隐藏必填星号（true → requiredMark={false}） */
  hideRequiredAsterisk?: boolean
  /** 是否渲染提交按钮；FormRenderer 的 showActions 传 false 时优先级更高 */
  submitBtn?: boolean
  /** 是否渲染重置按钮 */
  resetBtn?: boolean
}

/**
 * 校验规则类型全集：面板下拉与形状校验共用这一份，避免两处枚举分叉。
 * 各类型到 antd Rule 的映射与语义见 renderer/toAntdRules.ts。
 */
export const VALIDATE_RULE_TYPES = [
  'required',
  'email',
  'url',
  'number',
  'regexp',
  'len',
  'maxLen',
  'minLen',
  'min',
  'max',
  'phone',
  'ip',
  'integer',
  'uppercase',
  'lowercase',
  'validator',
] as const

export type ValidateRuleType = (typeof VALIDATE_RULE_TYPES)[number]

/** 需要数字阈值（value）的规则类型 */
export const THRESHOLD_RULE_TYPES: readonly ValidateRuleType[] = ['len', 'maxLen', 'minLen', 'min', 'max']

/** 触发时机；不写则跟随字段级时机（antd 默认 onChange） */
export const VALIDATE_TRIGGERS = ['blur', 'change', 'submit'] as const

export type ValidateTrigger = (typeof VALIDATE_TRIGGERS)[number]

/** 可序列化的校验规则（渲染时转换为 antd Rule） */
export interface ValidateRule {
  type: ValidateRuleType
  message?: string
  /** 仅 type 为 regexp 时使用 */
  pattern?: string
  /** len / maxLen / minLen / min / max 的阈值 */
  value?: number
  /** 触发时机；不写则跟随字段级时机 */
  trigger?: ValidateTrigger
  /** 仅 type 为 validator 时使用：引用 events.custom 的公共事件名（与 fn 二选一，fn 优先） */
  hook?: string
  /** 仅 type 为 validator 时使用：内联函数体（与 HookRef 同规则，与 hook 同时存在时 fn 优先） */
  fn?: FnSource
}

/** 字段级栅格（渲染时自动包裹 Col，字段自带，不必再拖 row + col 容器） */
export interface FieldCol {
  span?: number
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
}

export interface FieldSchema {
  /** 唯一 id，拖拽/选中主键 */
  id: string
  /** 组件类型，对应注册表 type */
  type: string
  /** 表单字段名，提交数据的 key；容器/辅助组件可为空 */
  field?: string
  label?: string
  /** 直接透传给 antd 组件的 props */
  props: Record<string, any>
  /** 字段级栅格；设置后渲染器会为该字段包一层 Col */
  col?: FieldCol
  /** Form.Item 层面配置 */
  formItem?: {
    rules?: ValidateRule[]
    required?: boolean
    tooltip?: string
    extra?: string
    hidden?: boolean
  }
  /** 容器类子节点 */
  children?: FieldSchema[]
}

/** 当前 schema 版本；新增结构段时递增，并在 parseSchema 里补迁移分支 */
export const SCHEMA_VERSION = 2

export type SchemaVersion = typeof SCHEMA_VERSION

export interface FormSchema {
  version: SchemaVersion
  form: FormGlobalConfig
  /** 表单级场景钩子与命名公共事件 */
  events?: FormEventConfig
  /** 命名全局数据源（批次 3 落地，本任务只占位类型） */
  dataSources?: Record<string, unknown>
  children: FieldSchema[]
}

export function createEmptySchema(): FormSchema {
  return {
    version: SCHEMA_VERSION,
    form: { layout: 'horizontal', labelAlign: 'right', size: 'middle', colon: true },
    children: [],
  }
}
