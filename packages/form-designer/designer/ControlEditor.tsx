import type { ControlEffect, ControlOperator, ControlRule } from '../types/schema'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Input, Select } from 'antd'
import { CONTROL_EFFECTS, CONTROL_OPERATORS } from '../types/schema'
import { formatControlValue, needsControlValue, parseControlValue, withControlOperator } from './controlRule'

const OPERATOR_LABELS: Record<ControlOperator, string> = {
  eq: '等于',
  neq: '不等于',
  in: '属于（数组）',
  empty: '为空',
  notEmpty: '不为空',
}

const EFFECT_LABELS: Record<ControlEffect, string> = {
  hidden: '隐藏',
  disabled: '禁用',
  required: '必填',
}

const OPERATOR_OPTIONS = CONTROL_OPERATORS.map(op => ({ label: OPERATOR_LABELS[op], value: op }))
const EFFECT_OPTIONS = CONTROL_EFFECTS.map(effect => ({ label: EFFECT_LABELS[effect], value: effect }))

interface ControlEditorProps {
  value?: ControlRule[]
  onChange?: (value: ControlRule[]) => void
  /** 可作为条件依赖的字段名路径（当前 schema 的全部字段） */
  fieldNames?: string[]
  /** 字段自身是否已必填：规则里再选 required 就是冗余，就地提示 */
  selfRequired?: boolean
}

/**
 * 联动规则编辑器：依赖字段 → 比较方式 → 值（按 operator 切控件）→ 效果。
 * 效果取「或」（任一规则命中即生效），`required` 与字段自身 `formItem.required` 取「或」，
 * 因此字段已必填时再选 required 会就地提示冗余。
 */
export function ControlEditor({ value = [], onChange, fieldNames = [], selfRequired }: ControlEditorProps) {
  const update = (index: number, patch: Partial<ControlRule>) => {
    onChange?.(value.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
  }

  // 效果取「或」：只要任一规则给了 hidden、另一条（或同一条）给了 required，就可能同时生效 ——
  // 那时提交会被必填拦住，而错误提示渲染在 display:none 的 Form.Item 里，用户只看到「点了没反应」
  const effects = new Set(value.flatMap(rule => rule.effects ?? []))
  const deadlock = effects.has('hidden') && effects.has('required')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {value.map((rule, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6, border: '1px solid #f0f0f0', borderRadius: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Select
              size="small"
              style={{ flex: 1 }}
              placeholder="依赖字段"
              value={rule.field || undefined}
              options={fieldNames.map(name => ({ label: name, value: name }))}
              onChange={field => update(i, { field })}
            />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onChange?.(value.filter((_, j) => j !== i))} />
          </div>
          <Select
            size="small"
            value={rule.operator ?? 'eq'}
            options={OPERATOR_OPTIONS}
            onChange={operator => onChange?.(value.map((r, j) => (j === i ? withControlOperator(r, operator) : r)))}
          />
          {(rule.operator ?? 'eq') === 'in' && (
            <Select
              size="small"
              mode="tags"
              placeholder="候选值，回车添加（严格相等比较）"
              value={Array.isArray(rule.value) ? rule.value.map(String) : []}
              onChange={next => update(i, { value: next })}
            />
          )}
          {needsControlValue(rule.operator) && (rule.operator ?? 'eq') !== 'in' && (
            <Input
              size="small"
              placeholder="比较值（数字 / true / false 按 JSON 解析）"
              value={formatControlValue(rule.value)}
              onChange={e => update(i, { value: parseControlValue(e.target.value) })}
            />
          )}
          <Select
            size="small"
            mode="multiple"
            placeholder="命中后施加的效果"
            value={rule.effects ?? []}
            options={EFFECT_OPTIONS}
            onChange={effects => update(i, { effects })}
          />
          {(rule.effects ?? []).includes('required') && selfRequired && (
            <div style={{ fontSize: 12, color: '#ff4d4f' }}>字段自身已必填，该效果冗余</div>
          )}
          {!(rule.effects ?? []).length && (
            <div style={{ fontSize: 12, color: '#ff4d4f' }}>未选择效果，规则不会生效</div>
          )}
        </div>
      ))}
      <Button
        size="small"
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => onChange?.([...value, { field: fieldNames[0] ?? '', effects: [] }])}
      >
        添加规则
      </Button>
      {deadlock && (
        <div style={{ fontSize: 12, color: '#ff4d4f' }}>
          隐藏与必填同时生效会导致提交被拦住但用户看不到提示
        </div>
      )}
      <div style={{ fontSize: 12, color: '#999' }}>
        多条规则的效果取「或」；隐藏只影响呈现，值仍保留在表单里
      </div>
    </div>
  )
}
