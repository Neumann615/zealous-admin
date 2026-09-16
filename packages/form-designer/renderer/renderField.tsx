import type { ReactNode } from 'react'
import type { FieldSchema } from '../types/schema'
import { Alert, Col } from 'antd'
import { getComponent } from '../registry/registry'
import { fieldColProps } from './colProps'
import { ContainerField } from './ContainerField'
import { FieldItem } from './FieldItem'
import { ListField } from './ListField'
import '../registry/components'

/**
 * 渲染单个字段。容器类通过 renderChild 递归子节点，
 * 设计器画布与运行时共用此入口。
 * parentType 为直接父容器的 type，用于父级特化（如 descriptions / tableForm 由父级呈现字段名）。
 * 字段自带栅格（schema.col）时统一包一层 Col：容器、数组容器与辅助组件同样适用，
 * 包在最外层才能让子表单/表格子表单整体参与父容器的栅格。
 */
export function renderField(
  schema: FieldSchema,
  renderChild: (child: FieldSchema, parentType?: string) => ReactNode,
  parentType?: string,
): ReactNode {
  const def = getComponent(schema.type)
  if (!def)
    return <Alert type="warning" showIcon message={`未注册的组件类型：${schema.type}`} />

  const node = def.nestList
    ? <ListField def={def} schema={schema} renderChild={renderChild} />
    : def.isContainer
      ? <ContainerField def={def} schema={schema} renderChild={renderChild} />
      : def.noFormItem
        ? def.render(schema)
        : <FieldItem def={def} schema={schema} parentType={parentType} />

  const colProps = fieldColProps(schema.col)
  return colProps ? <Col {...colProps}>{node}</Col> : node
}
