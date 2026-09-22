import type { ConfigMeta } from '../registry/registry'
import { Divider } from 'antd'
import { getComponent } from '../registry/registry'
import { collectFieldNamePaths, getFieldNameIssue, getFieldPathIssue, getFormulaFieldContext, nodeBindsField } from '../utils/fieldName'
import { getFieldPermissionKey } from '../utils/permissions'
import { ColEditor } from './ColEditor'
import { ConfigFormRenderer } from './ConfigFormRenderer'
import { ControlEditor } from './ControlEditor'
import { DataSourceEditor } from './DataSourceEditor'
import { FormEventsPanel } from './FormEventsPanel'
import { FormulaEditor } from './FormulaEditor'
import { PermissionEditor } from './PermissionEditor'
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
  const { getSelected, updateField, updateFieldPermission, schema } = useDesignerStore()
  const node = getSelected()
  if (!node)
    return null
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
  const permissionKey = hasField ? getFieldPermissionKey(schema.children, node.id) : null
  const fieldNames = collectFieldNamePaths(schema.children).filter(name => name !== permissionKey)
  const dataSourceNames = Object.keys(schema.dataSources ?? {})
  const pathIssueOf = (path: string) => getFieldPathIssue(schema.children, path)
  const formulaContext = node.type === 'formula' ? getFormulaFieldContext(schema.children, node.id) : null
  const formulaFieldNames = formulaContext?.inList
    ? [...new Set([...fieldNames, ...formulaContext.rowFields.filter(name => name !== formulaContext.selfPath)])]
    : fieldNames
  const formulaPathIssueOf = formulaContext?.inList
    ? (path: string) => (formulaContext.rowFields.includes(path) ? null : pathIssueOf(path))
    : pathIssueOf

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
      {node.type === 'formula' && (
        <>
          <Divider titlePlacement="start" plain style={{ margin: '16px 0 12px' }}>计算公式</Divider>
          <FormulaEditor
            value={node.computed}
            onChange={computed => updateField(node.id, 'computed', computed, true)}
            fieldNames={formulaFieldNames}
            pathIssueOf={formulaPathIssueOf}
            rowMode={formulaContext?.inList}
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
      {permissionKey && (
        <>
          <Divider titlePlacement="start" plain style={{ margin: '16px 0 12px' }}>运行权限</Divider>
          <PermissionEditor
            value={schema.permissions?.[permissionKey]}
            onChange={permission => updateFieldPermission(permissionKey, permission)}
          />
        </>
      )}
    </div>
  )
}

/**
 * 右侧面板两级配置上下文（对齐 form-manage 交互）：
 * - 未选中字段 → 默认显示「表单配置」（布局 / 全局事件 / 公共事件）
 * - 选中字段 → 自动切换为「字段配置」（基础 / 布局 / 校验 / 数据来源 / 联动 / 组件属性）
 */
export function RightPanel() {
  const selectedId = useDesignerStore(s => s.selectedId)
  if (selectedId)
    return <FieldConfig />
  return <FormEventsPanel />
}
