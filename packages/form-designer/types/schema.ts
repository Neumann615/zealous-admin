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

/** 可序列化的校验规则（渲染时转换为 antd Rule） */
export interface ValidateRule {
  type: 'required' | 'email' | 'url' | 'number' | 'regexp'
  message?: string
  /** 仅 type 为 regexp 时使用 */
  pattern?: string
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
