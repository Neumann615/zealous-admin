import type { ConfigMeta } from '../registry/registry'
import { Divider, Radio, Select, Switch, Tabs } from 'antd'
import { getComponent } from '../registry/registry'
import { getFieldNameIssue, nodeBindsField } from '../utils/fieldName'
import { ConfigFormRenderer } from './ConfigFormRenderer'
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
      {hasRules && (
        <>
          <Divider titlePlacement="start" plain style={{ margin: '16px 0 12px' }}>校验规则</Divider>
          <ValidateEditor
            value={node.formItem?.rules}
            onChange={rules => updateField(node.id, 'formItem.rules', rules, true)}
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

function FormConfig() {
  const { schema, updateFormConfig } = useDesignerStore()
  const { form } = schema
  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>布局</div>
        <Radio.Group
          size="small"
          value={form.layout}
          onChange={e => updateFormConfig({ layout: e.target.value })}
          options={[
            { label: '水平', value: 'horizontal' },
            { label: '垂直', value: 'vertical' },
            { label: '行内', value: 'inline' },
          ]}
          optionType="button"
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>标签对齐</div>
        <Select
          size="small"
          style={{ width: '100%' }}
          value={form.labelAlign}
          onChange={v => updateFormConfig({ labelAlign: v })}
          options={[{ label: '右对齐', value: 'right' }, { label: '左对齐', value: 'left' }]}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>尺寸</div>
        <Select
          size="small"
          style={{ width: '100%' }}
          value={form.size}
          onChange={v => updateFormConfig({ size: v })}
          options={[{ label: '大', value: 'large' }, { label: '中', value: 'middle' }, { label: '小', value: 'small' }]}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#666' }}>显示冒号</span>
        <Switch size="small" checked={!!form.colon} onChange={v => updateFormConfig({ colon: v })} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#666' }}>整体禁用</span>
        <Switch size="small" checked={!!form.disabled} onChange={v => updateFormConfig({ disabled: v })} />
      </div>
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
        { key: 'form', label: '表单', children: <FormConfig /> },
      ]}
    />
  )
}
