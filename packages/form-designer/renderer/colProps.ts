import type { FieldCol } from '../types/schema'

/** 响应式断点顺序；面板与换算共用这一份（避免两处枚举分叉） */
export const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const

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

/**
 * 画布外壳样式：span → 外壳宽度（与 col 容器同一算法，只留一个换算点）。
 *
 * 不用 `flex: 0 0 X%` 简写：flex-basis 落在**父容器的主轴**上，而画布根是纵向 flex
 * （Canvas.tsx 的 flex-direction: column）、row 容器是横向 flex，同一份简写在两种父容器下
 * 含义不同（顶层字段会变成「限高」而不是「限宽」）。
 * `width` + `maxWidth` + `flexShrink: 0` 与轴向无关：
 * - 纵向父容器（画布顶层）：width 是交叉轴尺寸，直接就是列宽；
 * - 横向父容器（Row / flex row）：flex-basis 为 auto 时取 width 作为基准，flex-grow 默认 0、
 *   flex-shrink 显式 0，于是恰好占 X% 且不被内容撑开或压缩。
 * 断点（xs/sm/md/lg/xl）不镜像：antd 的断点是媒体查询驱动的，画布没有真实视口宽度可依据，
 * 只镜像 span，断点效果请在预览里看。
 */
export function shellStyleFromCol(col: FieldCol | undefined) {
  const span = col?.span ?? 24
  const pct = `${(span / 24) * 100}%`
  return { width: pct, maxWidth: pct, flexShrink: 0 }
}
