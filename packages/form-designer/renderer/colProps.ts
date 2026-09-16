import type { FieldCol } from '../types/schema'

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/** field.col → antd Col 属性；未配置或全空返回 null（调用方据此决定不包裹 Col） */
export function fieldColProps(col: FieldCol | undefined): Record<string, any> | null {
  if (!col)
    return null
  const props: Record<string, any> = {}
  if (col.span !== undefined)
    props.span = col.span
  for (const bp of BREAKPOINTS) {
    if (col[bp] !== undefined)
      props[bp] = col[bp]
  }
  return Object.keys(props).length ? props : null
}

/** 画布外壳样式：span → flex 尺寸（与 col 容器同一算法，设计态与运行态同源） */
export function shellStyleFromCol(col: FieldCol | undefined) {
  const span = col?.span ?? 24
  const pct = `${(span / 24) * 100}%`
  return { flex: `0 0 ${pct}`, maxWidth: pct }
}
