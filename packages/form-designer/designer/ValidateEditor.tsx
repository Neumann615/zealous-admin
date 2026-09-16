import type { CustomHookDef } from '../events/types'
import type { ValidateRule, ValidateRuleType, ValidateTrigger } from '../types/schema'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Input, InputNumber, Select } from 'antd'
import { THRESHOLD_RULE_TYPES, VALIDATE_TRIGGERS } from '../types/schema'
import { HookEditor } from './HookEditor'
import { emptyInlineFn, withRuleType } from './ruleType'

const RULE_TYPES: { label: string, value: ValidateRuleType }[] = [
  { label: '必填', value: 'required' },
  { label: '邮箱', value: 'email' },
  { label: 'URL', value: 'url' },
  { label: '数字', value: 'number' },
  { label: '正则', value: 'regexp' },
  { label: '长度', value: 'len' },
  { label: '最小长度', value: 'minLen' },
  { label: '最大长度', value: 'maxLen' },
  { label: '最小值', value: 'min' },
  { label: '最大值', value: 'max' },
  { label: '手机号', value: 'phone' },
  { label: 'IP', value: 'ip' },
  { label: '整数', value: 'integer' },
  { label: '大写字母', value: 'uppercase' },
  { label: '小写字母', value: 'lowercase' },
  { label: '自定义校验', value: 'validator' },
]

const TRIGGER_LABELS: Record<ValidateTrigger, string> = {
  blur: '失焦时',
  change: '值变化时',
  submit: '仅提交时',
}

const TRIGGER_OPTIONS = VALIDATE_TRIGGERS.map(t => ({ label: TRIGGER_LABELS[t], value: t }))

/**
 * 阈值规则分两组语境，钉死 antd 的 type 后配错组件会恒不通过：
 * 长度组走 type: 'string'，数值组走 type: 'number'。这里就地提示，避免「配了就永远校验失败」。
 */
const LENGTH_HINT = '按字符长度校验，仅对文本类组件生效；数值范围请改用最小值 / 最大值。字段留空时不校验，需要必填请再加一条必填规则'
const NUMBER_HINT = '按数值大小校验，仅对数值组件（如数字输入框）生效；文本长度请改用最小长度 / 最大长度。字段留空时不校验，需要必填请再加一条必填规则'

/** 空 pattern 的 regexp 规则会被 toAntdRules 静默跳过（既有行为，不改成拒绝以免废掉存量 schema），面板就地提示 */
const EMPTY_PATTERN_HINT = '正则表达式为空，该规则不会生效'

/**
 * 引用的公共事件在 events.custom 里已不存在（删了公共事件、或导入的 JSON 指向别的名字）：
 * 运行期策略不变（warn 一次 + 该规则视为通过），这里只做面板提示，避免「配了却从不执行」无从察觉。
 */
const MISSING_HOOK_HINT = '引用的公共事件已不存在'

function thresholdHint(type: ValidateRuleType): string | null {
  if (type === 'min' || type === 'max')
    return NUMBER_HINT
  return THRESHOLD_RULE_TYPES.includes(type) ? LENGTH_HINT : null
}

interface ValidateEditorProps {
  value?: ValidateRule[]
  onChange?: (value: ValidateRule[]) => void
  /** 公共事件表（events.custom）：自定义校验的引用来源 */
  custom?: Record<string, CustomHookDef>
}

export function ValidateEditor({ value = [], onChange, custom }: ValidateEditorProps) {
  const update = (index: number, patch: Partial<ValidateRule>) => {
    onChange?.(value.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const changeType = (index: number, type: ValidateRuleType) => {
    onChange?.(value.map((r, i) => (i === index ? withRuleType(r, type) : r)))
  }

  const customNames = Object.keys(custom || {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {value.map((rule, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6, border: '1px solid #f0f0f0', borderRadius: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Select
              size="small"
              style={{ flex: 1 }}
              options={RULE_TYPES}
              value={rule.type}
              onChange={v => changeType(i, v)}
            />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onChange?.(value.filter((_, j) => j !== i))} />
          </div>
          {rule.type === 'regexp' && (
            <>
              <Input size="small" placeholder="正则表达式，如 ^1\d{10}$" value={rule.pattern ?? ''} onChange={e => update(i, { pattern: e.target.value })} />
              {!rule.pattern && <div style={{ fontSize: 12, color: '#ff4d4f' }}>{EMPTY_PATTERN_HINT}</div>}
            </>
          )}
          {THRESHOLD_RULE_TYPES.includes(rule.type) && (
            <>
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                placeholder="阈值（长度 / 数值）"
                value={rule.value ?? null}
                onChange={v => update(i, { value: typeof v === 'number' ? v : undefined })}
              />
              <div style={{ fontSize: 12, color: '#999' }}>{thresholdHint(rule.type)}</div>
            </>
          )}
          {rule.type === 'validator' && (
            <>
              <Select
                size="small"
                allowClear
                placeholder="引用公共事件"
                value={rule.hook}
                options={customNames.map(name => ({ label: custom?.[name]?.label || name, value: name }))}
                // 内联正文与按名引用互斥：运行时 fn 优先，留着旧正文会让公共事件永远不执行
                onChange={v => update(i, v ? { hook: v, fn: undefined } : { hook: undefined, fn: emptyInlineFn() })}
              />
              {!!rule.hook && !custom?.[rule.hook] && (
                <div style={{ fontSize: 12, color: '#ff4d4f' }}>{MISSING_HOOK_HINT}</div>
              )}
              <HookEditor value={rule.fn} onChange={fn => update(i, { fn, hook: undefined })} />
            </>
          )}
          <Input size="small" placeholder="校验失败提示语（可选）" value={rule.message ?? ''} onChange={e => update(i, { message: e.target.value })} />
          <Select
            size="small"
            allowClear
            placeholder="触发时机（默认）"
            value={rule.trigger}
            options={TRIGGER_OPTIONS}
            onChange={v => update(i, { trigger: v ?? undefined })}
          />
        </div>
      ))}
      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => onChange?.([...value, { type: 'required' }])}>
        添加规则
      </Button>
    </div>
  )
}
