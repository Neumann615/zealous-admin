import type { ConfigMeta } from '../registry/registry'
import { Divider, Tabs } from 'antd'
import { getComponent } from '../registry/registry'
import { collectFieldNamePaths, getFieldNameIssue, getFieldPathIssue, nodeBindsField } from '../utils/fieldName'
import { ColEditor } from './ColEditor'
import { ConfigFormRenderer } from './ConfigFormRenderer'
import { ControlEditor } from './ControlEditor'
import { DataSourceEditor } from './DataSourceEditor'
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
  // 数据来源只对声明了选项能力的组件开放（本期只实现 optionProp === 'options'）：
  // 取数结果写的是 props.options，给 input / treeSelect / transfer 配了都不会生效
  const hasDataSource = hasRules && def.optionProp === 'options'
  // 联动对值绑定容器也有意义（disabled 会下发给子字段），只有辅助组件没有可作用的对象
  const hasControl = !def.noFormItem
  // 辅助组件（文字/分隔线）在渲染器里也支持 col，但面板只对能进入栅格的节点开放该项
  const hasCol = !def.noFormItem
  const commonMetas = getCommonMetas(hasField)
  const nameIssue = getFieldNameIssue(schema, node.id)
  const fieldNames = collectFieldNamePaths(schema.children)
  const dataSourceNames = Object.keys(schema.dataSources ?? {})
  const pathIssueOf = (path: string) => getFieldPathIssue(schema.children, path)

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
            onChange={col => updateField(node.id, 'col', col, true)}
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
      {hasDataSource && (
        <>
          <Divider titlePlacement="start" plain style={{ margin: '16px 0 12px' }}>数据来源</Divider>
          <DataSourceEditor
            value={node.dataSource}
            onChange={dataSource => updateField(node.id, 'dataSource', dataSource, true)}
            fieldNames={fieldNames}
            dataSourceNames={dataSourceNames}
            componentOptions={node.props.options}
            pathIssueOf={pathIssueOf}
          />
        </>
      )}
      {hasControl && (
        <>
          <Divider titlePlacement="start" plain style={{ margin: '16px 0 12px' }}>联动</Divider>
          <ControlEditor
            value={node.control}
            onChange={control => updateField(node.id, 'control', control, true)}
            fieldNames={fieldNames}
            selfRequired={node.formItem?.required}
            pathIssueOf={pathIssueOf}
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
