import type { ReactNode } from 'react'
import type { ComponentDef } from '../registry/registry'
import type { FieldSchema } from '../types/schema'
import { use } from 'react'
import { FormHooksProvider, useFormHooksRuntime } from './hooksContext'
import { NamePrefixContext } from './namePrefix'

/**
 * 容器分支单独成组件：名路径前缀来自 context，普通函数体内读不到。
 * nestObject 容器把子字段收进自己的 field 下（提交结构 { field: { 子字段… } }）。
 *
 * 联动：容器自身的 control 命中 disabled 时，向子字段下发「父级禁用」（用同一份
 * FormHooksProvider 覆盖 parentDisabled，不再开第三个 provider），子字段的 input 随之 disabled。
 */
export function ContainerField({ def, schema, renderChild }: {
  def: ComponentDef
  schema: FieldSchema
  renderChild: (child: FieldSchema, parentType?: string) => ReactNode
}) {
  const prefix = use(NamePrefixContext)
  const runtime = useFormHooksRuntime()
  const children = (schema.children ?? []).map(c => renderChild(c, schema.type))
  const body = def.render(schema, children)
  const disabled = !!(runtime?.controls?.[schema.id]?.disabled || runtime?.parentDisabled)
  const wrapped = disabled && runtime
    ? <FormHooksProvider value={{ ...runtime, parentDisabled: true }}>{body}</FormHooksProvider>
    : body
  if (!def.nestObject || !schema.field)
    return <>{wrapped}</>
  return <NamePrefixContext value={[...prefix, schema.field]}>{wrapped}</NamePrefixContext>
}
