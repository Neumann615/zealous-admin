import type { FormGlobalConfig } from '../types/schema'

const ANTD_FORM_KEYS = ['layout', 'labelAlign', 'size', 'colon', 'disabled'] as const

/** 只把 antd Form 认识的键透传出去，其余（labelWidth 等）由渲染器自行消费 */
export function pickAntdFormProps(form: FormGlobalConfig) {
  const picked: Record<string, unknown> = {}
  for (const key of ANTD_FORM_KEYS) {
    if (form[key] !== undefined)
      picked[key] = form[key]
  }
  return picked
}
