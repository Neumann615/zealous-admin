import type { ConfigMeta } from '../registry/registry'
import { Divider, Tabs } from 'antd'
import { getComponent } from '../registry/registry'
import { getFieldNameIssue, nodeBindsField } from '../utils/fieldName'
import { ColEditor } from './ColEditor'
import { ConfigFormRenderer } from './ConfigFormRenderer'
import { FormEventsPanel } from './FormEventsPanel'
import { useDesignerStore } from './store'
import { ValidateEditor } from './ValidateEditor'

/** 字段组件的通用配置（label/field/tooltip/extra） */
function getCommonMetas(hasField: boolean): ConfigMeta[] {
  const metas: ConfigMeta[] = [
    { field: 'label', label: '标题', type: 'input' },
  ]
  if (hasField)
    metas.push({ field: 'field', label: '字段名', type: 'input' })
  metas.push(
    { field: 'formItem.tooltip', label: '提示', type: 'input' },
    { field: 'formItem.extra', label: '额外说明', type: 'input' },
  )
  return metas
}

function FieldConfig() {
  const { getSelected, updateField, schema } = useDesignerStore()
  const node = getSelected()
  if (!node)
    return <div style={{ color: '#999', padding: 12 }}>在画布中点击选择一个字段</div>

  const def = getComponent(node.type)
  if (!def)
    return <div style={{ color: '#999', padding: 12 }}>未注册的组件类型</div>

  // 值绑定容器（嵌套对象/数组）同样需要配置字段名；校验规则仍只对挂 Form.Item 的非容器开放
  const hasField = nodeBindsField(node)
  const hasRules = !def.isContainer && !def.noFormItem
  // 辅助组件（文字/分隔线）在渲染器里也支持 col，但面板只对能进入栅格的节点开放该项
  const hasCol = !def.noFormItem
  const commonMetas = getCommonMetas(hasField)
  const nameIssue = getFieldNameIssue(schema, node.id)

  return (
    <div style={{ padding: 12 }}>
      <Divider titlePlacement="start" plain style={{ margin: '4px 0 12px' }}>基础</Divider>
      <ConfigFormRenderer
        key={node.id}
        node={node}
        metas={commonMetas}
        errorOf={field => (field === 'field' ? nameIssue : null)}
      />
      {hasCol && (
        <>
          <Divider titlePlacement="start" plain style={{ margin: '16px 0 12px' }}>布局</Divider>
          <ColEditor
            value={node.col}
            onChange={col => updateField(node.id, 'col', col)}
          />
        </>
      )}
      {hasRules && (
        <>
          <Divider titlePlacement="start" plain style={{ margin: '16px 0 12px' }}>校验规则</Divider>
          <ValidateEditor
            value={node.formItem?.rules}
            onChange={rules => updateField(node.id, 'formItem.rules', rules, true)}
            custom={schema.events?.custom}
          />
        </>
      )}
      {def.configForm.length > 0 && (
        <>
          <Divider titlePlacement="start" plain style={{ margin: '16px 0 12px' }}>组件属性</Divider>
          <ConfigFormRenderer key={node.id} node={node} metas={def.configForm} />
        </>
      )}
    </div>
  )
}

export function RightPanel() {
  return (
    <Tabs
      size="small"
      centered
      style={{ height: '100%' }}
      items={[
        { key: 'field', label: '属性', children: <FieldConfig /> },
        { key: 'form', label: '表单', children: <FormEventsPanel /> },
      ]}
    />
  )
}
