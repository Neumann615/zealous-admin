import type { FieldPermission } from '../types/schema'
import { Switch } from 'antd'

interface PermissionEditorProps {
  value?: FieldPermission
  onChange?: (value: FieldPermission) => void
}

export function PermissionEditor({ value, onChange }: PermissionEditorProps) {
  const items = [
    { key: 'visible' as const, label: '可见', checked: value?.visible !== false },
    { key: 'editable' as const, label: '可编辑', checked: value?.editable !== false },
    { key: 'required' as const, label: '必填', checked: value?.required === true },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(item => (
        <div key={item.key}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{item.label}</div>
          <Switch
            size="small"
            checked={item.checked}
            onChange={checked => onChange?.({
              ...(value ?? {}),
              [item.key]: checked,
            })}
          />
        </div>
      ))}
    </div>
  )
}
