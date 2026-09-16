import type { ComponentDef } from '../registry/registry'
import type { FieldSchema } from '../types/schema'
import { useFieldDataSource } from './useFieldDataSource'

/**
 * Form.Item 向直接子组件注入受控 props（value/onChange，
 * 或 valuePropName 指定的如 checked），这里通过转发组件将全部
 * 注入 props 并入 schema.props 交给 def.render，无需改 render 签名。
 * Transfer 等 onChange 签名特殊的组件在各自 def.render 内自行处理。
 *
 * 声明式数据来源（schema.dataSource）加载出的选项走同一处合并：
 * 加载成功时覆盖 props.options，失败 / 无来源时保持 schema.props 原样。
 */
export function FieldControl({ def, schema, ...injected }: {
  def: ComponentDef
  schema: FieldSchema
  [key: string]: any
}) {
  const { options } = useFieldDataSource(schema)
  const merged: Record<string, any> = { ...schema.props }
  if (options)
    merged.options = options

  return <>{def.render({ ...schema, props: { ...merged, ...injected } })}</>
}
