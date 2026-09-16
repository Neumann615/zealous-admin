import type { ReactNode } from 'react'
import type { ComponentDef, ListRenderCtx } from '../registry/registry'
import type { FieldSchema } from '../types/schema'
import { Alert, Form } from 'antd'
import { FormHooksProvider, useFormHooksRuntime } from './hooksContext'
import { NamePrefixContext, useNamePrefix } from './namePrefix'

/**
 * 数组容器（nestList）：Form.List 驱动行的增删。
 * 行内子字段的名路径相对列表——rc-field-form 的 List 已注入 prefixName，故行前缀只需 [rowName]。
 *
 * 联动：容器自身的 control 命中 disabled 时，向行内子字段下发「父级禁用」（与 nestObject 同一机制）。
 */
export function ListField({ def, schema, renderChild }: {
  def: ComponentDef
  schema: FieldSchema
  renderChild: (child: FieldSchema, parentType?: string) => ReactNode
}) {
  const prefix = useNamePrefix()
  const runtime = useFormHooksRuntime()
  const children = schema.children ?? []
  const disabled = !!(runtime?.controls?.[schema.id]?.disabled || runtime?.parentDisabled)

  if (!schema.field)
    return <Alert type="warning" showIcon message={`数组容器缺少字段名：${schema.type}`} />

  /** 父级禁用经同一份 FormHooksProvider 覆盖下发；未禁用时保持原运行时对象 */
  const withParentDisabled = (node: ReactNode): ReactNode => (disabled && runtime
    ? <FormHooksProvider value={{ ...runtime, parentDisabled: true }}>{node}</FormHooksProvider>
    : node)

  const renderRow = (rowName: number): ReactNode => withParentDisabled(
    <NamePrefixContext value={[rowName]}>
      {children.map(c => renderChild(c, schema.type))}
    </NamePrefixContext>,
  )

  return (
    <Form.List name={[...prefix, schema.field]}>
      {(fields, { add, remove }) => {
        const ctx: ListRenderCtx = {
          rows: fields.map(f => ({ key: f.key, name: f.name })),
          renderRow,
          renderCell: (rowName, child) => withParentDisabled(
            <NamePrefixContext value={[rowName]}>
              {renderChild(child, schema.type)}
            </NamePrefixContext>,
          ),
          // 包一层避免 onClick 的事件对象被当成 add 的 defaultValue
          add: () => add(),
          remove: rowName => remove(rowName),
        }
        return def.renderList?.(schema, ctx) ?? null
      }}
    </Form.List>
  )
}
