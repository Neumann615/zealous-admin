import type { ControlCondition, ControlEffect, ControlOperator, ControlRule } from '../types/schema'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Input, Select } from 'antd'
import { CONTROL_EFFECTS, CONTROL_OPERATORS } from '../types/schema'
import { formatControlValue, getControlConditions, needsControlValue, parseControlValue, withConditionOperator, withControlOperator } from './controlRule'

const OPERATOR_LABELS: Record<ControlOperator, string> = {
  eq: '等于',
  neq: '不等于',
  in: '属于（数组）',
  contains: '包含',
  gt: '大于',
  gte: '大于等于',
  lt: '小于',
  lte: '小于等于',
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
  fieldNames?: string[]
  selfRequired?: boolean
  pathIssueOf?: (path: string) => string | null
}

/**
 * 联动规则编辑器：一条规则内可放多个 AND 条件；多条规则之间取「或」。
 * 旧 schema 的单条件直接保留在顶层；只有用户继续添加条件时才升级为 conditions 条件组。
 */
export function ControlEditor({ value = [], onChange, fieldNames = [], selfRequired, pathIssueOf }: ControlEditorProps) {
  const updateRule = (index: number, patch: Partial<ControlRule>) => {
    onChange?.(value.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
  }

  const updateCondition = (ruleIndex: number, conditionIndex: number, patch: Partial<ControlCondition>) => {
    const rule = value[ruleIndex]
    if (rule.conditions === undefined && getControlConditions(rule).length === 1) {
      updateRule(ruleIndex, patch)
      return
    }
    const conditions = getControlConditions(rule).map((condition, i) => (i === conditionIndex ? { ...condition, ...patch } : condition))
    updateRule(ruleIndex, { conditions })
  }

  const changeOperator = (ruleIndex: number, conditionIndex: number, operator: ControlOperator) => {
    const rule = value[ruleIndex]
    if (rule.conditions === undefined && getControlConditions(rule).length === 1) {
      onChange?.(value.map((item, i) => (i === ruleIndex ? withControlOperator(rule, operator) : item)))
      return
    }
    updateCondition(ruleIndex, conditionIndex, withConditionOperator(getControlConditions(rule)[conditionIndex], operator))
  }

  const addCondition = (ruleIndex: number) => {
    const rule = value[ruleIndex]
    const conditions = getControlConditions(rule)
    onChange?.(value.map((item, i) => (i === ruleIndex
      ? { effects: rule.effects ?? [], conditions: [...conditions, { field: fieldNames[0] ?? '', operator: 'eq', value: '' }] }
      : item)))
  }

  const removeCondition = (ruleIndex: number, conditionIndex: number) => {
    const rule = value[ruleIndex]
    updateRule(ruleIndex, { conditions: getControlConditions(rule).filter((_, i) => i !== conditionIndex) })
  }

  const effects = new Set(value.flatMap(rule => rule.effects ?? []))
  const deadlock = effects.has('hidden') && effects.has('required')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {value.map((rule, ruleIndex) => {
        const conditions = getControlConditions(rule)
        return (
          <div key={JSON.stringify(rule)} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 6, border: '1px solid #f0f0f0', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: '#999' }}>条件组（AND）</div>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onChange?.(value.filter((_, i) => i !== ruleIndex))} />
            </div>
            {conditions.map((condition, conditionIndex) => (
              <div key={JSON.stringify(condition)} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Select
                    size="small"
                    style={{ flex: 1 }}
                    placeholder="依赖字段"
                    value={condition.field || undefined}
                    options={fieldNames.map(name => ({ label: name, value: name }))}
                    onChange={field => updateCondition(ruleIndex, conditionIndex, { field })}
                  />
                  {(rule.conditions?.length ?? 1) > 1 && (
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeCondition(ruleIndex, conditionIndex)}
                    />
                  )}
                </div>
                <Select
                  size="small"
                  value={condition.operator ?? 'eq'}
                  options={OPERATOR_OPTIONS}
                  onChange={operator => changeOperator(ruleIndex, conditionIndex, operator)}
                />
                {!!condition.field && !!pathIssueOf?.(condition.field) && (
                  <div style={{ fontSize: 12, color: '#ff4d4f' }}>{pathIssueOf(condition.field)}</div>
                )}
                {(condition.operator ?? 'eq') === 'in' && (
                  <Select
                    size="small"
                    mode="tags"
                    placeholder="候选值，回车添加（严格相等比较）"
                    value={Array.isArray(condition.value) ? condition.value.map(String) : []}
                    onChange={next => updateCondition(ruleIndex, conditionIndex, { value: next })}
                  />
                )}
                {needsControlValue(condition.operator) && (condition.operator ?? 'eq') !== 'in' && (
                  <Input
                    size="small"
                    placeholder="比较值（数字 / true / false 按 JSON 解析）"
                    value={formatControlValue(condition.value)}
                    onChange={e => updateCondition(ruleIndex, conditionIndex, { value: parseControlValue(e.target.value) })}
                  />
                )}
              </div>
            ))}
            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => addCondition(ruleIndex)}>
              添加条件
            </Button>
            <Select
              size="small"
              mode="multiple"
              placeholder="命中后施加的效果"
              value={rule.effects ?? []}
              options={EFFECT_OPTIONS}
              onChange={next => updateRule(ruleIndex, { effects: next })}
            />
            {(rule.effects ?? []).includes('required') && selfRequired && (
              <div style={{ fontSize: 12, color: '#ff4d4f' }}>字段自身已必填，该效果冗余</div>
            )}
            {!(rule.effects ?? []).length && (
              <div style={{ fontSize: 12, color: '#ff4d4f' }}>未选择效果，规则不会生效</div>
            )}
          </div>
        )
      })}
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
        规则内多个条件取「且」，多条规则取「或」；隐藏只影响呈现，值仍保留在表单里
      </div>
      <div style={{ fontSize: 12, color: '#999' }}>
        数组行内字段的名路径要带行下标（如 items.0.title），行下标是运行期才有的，只能手写
      </div>
    </div>
  )
}
