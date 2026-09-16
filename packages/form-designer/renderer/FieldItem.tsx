import type { ComponentDef } from '../registry/registry'
import type { FieldSchema } from '../types/schema'
import { Form } from 'antd'
import { FieldControl } from './FieldControl'
import { useFormHooksRuntime } from './hooksContext'
import { joinName, useNamePrefix } from './namePrefix'
import { collectValidateTriggers, toAntdRules } from './toAntdRules'

/** 这些父容器已自行呈现字段名（描述列表的 item label、表格子表单的列头），Form.Item 不再重复 */
const LABEL_HANDLED_BY_PARENT = ['descriptions', 'tableForm']

/** 字段渲染：name 由名路径前缀 + schema.field 计算，其余沿用 formItem 配置与组件的 formItemProps */
export function FieldItem({ def, schema, parentType }: {
  def: ComponentDef
  schema: FieldSchema
  parentType?: string
}) {
  const prefix = useNamePrefix()
  // 自定义校验的公共事件表与 ctx 工厂由 FormRenderer 经 context 下发
  const hooks = useFormHooksRuntime()
  // 规则级 validateTrigger 是字段级时机的子集：声明了 blur 的规则要把 onBlur 并进 Form.Item
  const validateTrigger = collectValidateTriggers(schema.formItem?.rules)
  // 联动有效态：hidden 用 Form.Item hidden（值仍留在 store 里）；required 与自身 formItem.required 取或
  const effective = hooks?.controls?.[schema.id]
  const rulesSchema = effective?.required
    ? { ...schema, formItem: { ...schema.formItem, required: true } }
    : schema

  return (
    <Form.Item
      name={joinName(prefix, schema.field)}
      label={parentType && LABEL_HANDLED_BY_PARENT.includes(parentType) ? undefined : schema.label}
      rules={toAntdRules(rulesSchema, hooks?.custom, hooks?.buildCtx)}
      validateTrigger={validateTrigger}
      tooltip={schema.formItem?.tooltip}
      extra={schema.formItem?.extra}
      hidden={effective?.hidden ?? schema.formItem?.hidden}
      {...def.formItemProps}
    >
      <FieldControl def={def} schema={schema} />
    </Form.Item>
  )
}
