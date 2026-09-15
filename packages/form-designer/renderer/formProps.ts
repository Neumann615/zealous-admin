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

/** 全局配置 → antd Form 属性（白名单透传 + 设计器自有项的换算），画布与运行时共用 */
export function buildFormProps(form: FormGlobalConfig) {
  const { labelWidth, layout } = form
  // 垂直/行内布局下标签在字段上方占满宽度，labelWidth 不参与（antd 的 layout 默认 horizontal）
  const isHorizontal = (layout ?? 'horizontal') === 'horizontal'
  return {
    ...pickAntdFormProps(form),
    labelCol: labelWidth && isHorizontal ? { style: { width: `${labelWidth}px` } } : undefined,
    requiredMark: form.hideRequiredAsterisk ? false : undefined,
  }
}
