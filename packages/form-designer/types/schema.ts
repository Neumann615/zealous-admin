/** 表单全局配置，直接透传给 antd Form */
export interface FormGlobalConfig {
  layout?: 'horizontal' | 'vertical' | 'inline'
  labelAlign?: 'left' | 'right'
  size?: 'large' | 'middle' | 'small'
  colon?: boolean
  disabled?: boolean
}

/** 可序列化的校验规则（渲染时转换为 antd Rule） */
export interface ValidateRule {
  type: 'required' | 'email' | 'url' | 'number' | 'regexp'
  message?: string
  /** 仅 type 为 regexp 时使用 */
  pattern?: string
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
  children: FieldSchema[]
}

export function createEmptySchema(): FormSchema {
  return {
    version: SCHEMA_VERSION,
    form: { layout: 'horizontal', labelAlign: 'right', size: 'middle', colon: true },
    children: [],
  }
}
