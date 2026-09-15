import type { ConfigMeta } from '../registry/registry'
import type { FieldSchema } from '../types/schema'
import { Input, InputNumber, Select, Switch } from 'antd'
import { getByPath } from '../utils/path'
import { OptionsEditor } from './OptionsEditor'
import { useDesignerStore } from './store'

interface ConfigFormRendererProps {
  node: FieldSchema
  metas: ConfigMeta[]
  /** 返回某个配置项的错误提示，非空时以红字展示在控件下方 */
  errorOf?: (field: string) => string | null
}

/** 将组件声明的 configForm meta 渲染为配置控件（受控，直接写回 store） */
export function ConfigFormRenderer({ node, metas, errorOf }: ConfigFormRendererProps) {
  const { updateField } = useDesignerStore()

  const renderControl = (meta: ConfigMeta) => {
    const value = getByPath(node as unknown as Record<string, any>, meta.field)
    // 文本类（含 options 编辑器）连续编辑合并撤销历史；number/switch/select 保持离散
    const coalesce = meta.type === 'input' || meta.type === 'textarea' || meta.type === 'json' || meta.type === 'options'
    const onChange = (v: any) => updateField(node.id, meta.field, v, coalesce)
    switch (meta.type) {
      case 'input':
        return <Input size="small" value={value ?? ''} onChange={e => onChange(e.target.value)} {...meta.props} />
      case 'textarea':
        return <Input.TextArea size="small" rows={2} value={value ?? ''} onChange={e => onChange(e.target.value)} {...meta.props} />
      case 'number':
        return <InputNumber size="small" style={{ width: '100%' }} value={value ?? null} onChange={v => onChange(v)} {...meta.props} />
      case 'switch':
        return <Switch size="small" checked={!!value} onChange={onChange} {...meta.props} />
      case 'select':
        return <Select size="small" style={{ width: '100%' }} value={value ?? undefined} options={meta.options} onChange={onChange} allowClear {...meta.props} />
      case 'options':
        return <OptionsEditor value={value} onChange={onChange} />
      case 'json':
        return (
          <Input.TextArea
            size="small"
            rows={4}
            defaultValue={value ? JSON.stringify(value, null, 2) : ''}
            onBlur={(e) => {
              try {
                onChange(JSON.parse(e.target.value))
                e.target.style.borderColor = ''
              }
              catch {
                e.target.style.borderColor = 'red'
              }
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {metas.map((meta) => {
        const error = errorOf?.(meta.field) ?? null
        return (
          <div key={meta.field}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{meta.label}</div>
            {renderControl(meta)}
            {error && <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>{error}</div>}
          </div>
        )
      })}
    </div>
  )
}
