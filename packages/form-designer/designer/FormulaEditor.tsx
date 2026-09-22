import type { FieldComputed } from '../types/schema'
import { Button, Input, Select } from 'antd'
import { getFormulaIssue } from '../renderer/formula'

interface FormulaEditorProps {
  value?: FieldComputed
  onChange?: (value: FieldComputed | undefined) => void
  fieldNames?: string[]
  pathIssueOf?: (path: string) => string | null
}

/** 计算字段公式编辑器：显式引用语法 + 保存前语法校验，不提供任意 JavaScript 输入 */
export function FormulaEditor({ value, onChange, fieldNames = [], pathIssueOf }: FormulaEditorProps) {
  const expression = value?.expression ?? ''
  const issue = getFormulaIssue(expression)
  const pathIssues = [...expression.matchAll(/\{([^{}]+)\}/g)]
    .map(match => match[1].trim())
    .map(path => pathIssueOf?.(path))
    .filter((pathIssue): pathIssue is string => !!pathIssue)

  const update = (next: string) => {
    onChange?.(next.trim() ? { expression: next } : undefined)
  }

  const insertField = (path?: string) => {
    if (!path)
      return
    update(`${expression}${expression && !expression.endsWith(' ') ? ' ' : ''}{${path}} `)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Input.TextArea
        rows={3}
        value={expression}
        placeholder="例：ROUND({price} * {count}, 2)"
        onChange={event => update(event.target.value)}
      />
      <Select
        size="small"
        allowClear
        showSearch
        value={undefined}
        placeholder="插入字段"
        optionFilterProp="label"
        onChange={insertField}
        options={fieldNames.map(name => ({ label: name, value: name }))}
      />
      {issue && <div style={{ fontSize: 12, color: '#ff4d4f' }}>{issue}</div>}
      {pathIssues.map(pathIssue => (
        <div key={pathIssue} style={{ fontSize: 12, color: '#ff4d4f' }}>{pathIssue}</div>
      ))}
      <div style={{ fontSize: 12, color: '#999' }}>
        支持 + - * / %、括号，函数 ABS / CEIL / FLOOR / ROUND / MIN / MAX / POW / SQRT，常量 PI / E。
      </div>
      <div style={{ fontSize: 12, color: '#999' }}>
        字段引用写作
        {' '}
        {`{字段名}`}
        ，嵌套用
        {' '}
        {`{contact.name}`}
        ，数组行用
        {' '}
        {`{items.0.qty}`}
        。
      </div>
      <Button type="text" danger onClick={() => update('')}>清空公式</Button>
    </div>
  )
}
