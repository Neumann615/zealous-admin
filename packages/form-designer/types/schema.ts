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
  /**
   * 仅 type 为 validator 时使用：引用 events.custom 的公共事件名（与 fn 二选一，fn 优先）。
   * 其它类型即使带上 hook 也会被忽略（类型与 parseSchema 都不拦，属已知宽松点）。
   */
  hook?: string
  /** 仅 type 为 validator 时使用：内联函数体（与 HookRef 同规则，与 hook 同时存在时 fn 优先）；其它类型忽略 */
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

/** 选项（下拉 / 单选 / 多选等组件的 props.options 项） */
export interface FieldOption {
  label: string
  value: string | number
  disabled?: boolean
}

/** 数据来源类型全集：面板下拉与形状校验共用这一份，避免两处枚举分叉 */
export const DATA_SOURCE_TYPES = ['static', 'dict', 'api'] as const

export type DataSourceType = (typeof DATA_SOURCE_TYPES)[number]

/** 联动比较方式全集 */
export const CONTROL_OPERATORS = ['eq', 'neq', 'in', 'empty', 'notEmpty'] as const

export type ControlOperator = (typeof CONTROL_OPERATORS)[number]

/** 联动效果全集：命中后施加在字段上的状态 */
export const CONTROL_EFFECTS = ['hidden', 'disabled', 'required'] as const

export type ControlEffect = (typeof CONTROL_EFFECTS)[number]

/**
 * 联动规则：条件命中时控制隐藏 / 禁用 / 必填。
 * 同一规则内的效果全生效；多条规则的效果取「或」（任一命中即生效）；
 * `required` 与字段自身 `formItem.required` 取「或」；`hidden` 用 antd `Form.Item hidden`
 * （值仍保留在表单 store 里，不进提交报文是「只提交已注册字段」的既有语义）。
 */
export interface ControlRule {
  /** 条件依赖的字段（名路径） */
  field: string
  /** 比较方式，默认 eq */
  operator?: ControlOperator
  /** operator 为 in 时为数组 */
  value?: any
  /** 条件命中时施加的效果，可多选 */
  effects: ControlEffect[]
}

/**
 * 声明式数据来源定义。三种类型都由渲染器取数后写进 `props.options`：
 * - `static`：schema 里直接写死的选项
 * - `dict`：走宿主注册名 `'dict'`，参数 `{ dictType }`，按字段映射成 label / value
 * - `api`：走宿主注册名 `def.api`（**只接受注册名，不填裸 URL**），`params` 经 `{{}}` 插值后传入
 */
export type DataSourceDef
  = | { type: 'static', options: FieldOption[] }
    | { type: 'dict', dictType: string, labelField?: string, valueField?: string }
    | { type: 'api', api: string, params?: Record<string, string>, parse?: string }

/** 字段的数据来源：`def` 优先于 `ref`（与 HookRef 的「内联优先」同规则） */
export interface FieldDataSource {
  /** 引用 schema.dataSources 命名表；与 def 二选一，def 优先 */
  ref?: string
  def?: DataSourceDef
  /** 依赖字段（名路径，支持 contact.name）：这些字段变化时重新取数 */
  watch?: string[]
  /** 防抖 ms，默认 300 */
  debounce?: number
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
  /** 声明式选项来源：加载结果写入 props.options */
  dataSource?: FieldDataSource
  /** 联动规则：条件命中时控制隐藏 / 禁用 / 必填；多条规则的效果取「或」 */
  control?: ControlRule[]
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
  /** 命名全局数据源：字段用 `dataSource.ref` 按名引用 */
  dataSources?: Record<string, DataSourceDef>
  children: FieldSchema[]
}

export function createEmptySchema(): FormSchema {
  return {
    version: SCHEMA_VERSION,
    form: { layout: 'horizontal', labelAlign: 'right', size: 'middle', colon: true },
    children: [],
  }
}
