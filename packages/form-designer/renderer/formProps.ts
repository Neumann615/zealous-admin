import type { AntdFormPassthrough, FormGlobalConfig } from '../types/schema'

const ANTD_FORM_KEYS = ['layout', 'labelAlign', 'size', 'colon', 'disabled'] as const satisfies readonly (keyof AntdFormPassthrough)[]

// 若 AntdFormPassthrough 新增键而未加入上面的数组，此行报错
type _MissingAntdFormKey = Exclude<keyof AntdFormPassthrough, typeof ANTD_FORM_KEYS[number]>
const _assertAllKeysCovered: _MissingAntdFormKey extends never ? true : false = true
void _assertAllKeysCovered

/** layout 归一化（antd 默认 horizontal） */
export function isHorizontalLayout(form: FormGlobalConfig): boolean {
  return (form.layout ?? 'horizontal') === 'horizontal'
}

/** 生效的标签宽度（px），不生效返回 undefined */
export function resolveLabelWidth(form: FormGlobalConfig): number | undefined {
  return isHorizontalLayout(form) ? form.labelWidth : undefined
}

/** 只把 antd Form 认识的键透传出去，其余（labelWidth 等）由渲染器自行消费 */
function pickAntdFormProps(form: FormGlobalConfig) {
  const picked: Record<string, unknown> = {}
  for (const key of ANTD_FORM_KEYS) {
    if (form[key] !== undefined)
      picked[key] = form[key]
  }
  return picked
}

/** 全局配置 → antd Form 属性（白名单透传 + 设计器自有项的换算），画布与运行时共用 */
export function buildFormProps(form: FormGlobalConfig) {
  const labelWidth = resolveLabelWidth(form)
  return {
    ...pickAntdFormProps(form),
    labelCol: labelWidth ? { style: { width: `${labelWidth}px` } } : undefined,
    requiredMark: form.hideRequiredAsterisk ? false : undefined,
  }
}
