import type { FieldCol } from '../types/schema'
import { Button, InputNumber } from 'antd'
import { BREAKPOINTS } from '../renderer/colProps'

/** span 预设：对齐 antd 24 栅格的常用分数（1/4=6、1/3=8、1/2=12、2/3=16、3/4=18、整行=24） */
const SPAN_PRESETS = [
  { label: '1/4', span: 6 },
  { label: '1/3', span: 8 },
  { label: '1/2', span: 12 },
  { label: '2/3', span: 16 },
  { label: '3/4', span: 18 },
  { label: '整行', span: 24 },
]

interface ColEditorProps {
  value?: FieldCol
  onChange?: (value: FieldCol | undefined) => void
}

/**
 * 字段级栅格配置：span 预设按钮 + 五个响应式断点。
 * 再次点击当前预设会置空 span（与其他面板「点一下取消」的手感一致）；
 * 全部为空时整体回传 undefined —— 空对象留在 schema 里会变成 `col: {}` 的噪声。
 */
export function ColEditor({ value, onChange }: ColEditorProps) {
  const patch = (next: Partial<FieldCol>) => {
    const merged: FieldCol = { ...value, ...next }
    for (const key of Object.keys(merged) as (keyof FieldCol)[]) {
      if (merged[key] === undefined)
        delete merged[key]
    }
    onChange?.(Object.keys(merged).length ? merged : undefined)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {SPAN_PRESETS.map(preset => (
          <Button
            key={preset.span}
            size="small"
            type={value?.span === preset.span ? 'primary' : 'default'}
            onClick={() => patch({ span: value?.span === preset.span ? undefined : preset.span })}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#666' }}>响应式断点（1-24，留空表示不设）</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
        {BREAKPOINTS.map(bp => (
          <InputNumber
            key={bp}
            size="small"
            min={1}
            max={24}
            style={{ width: '100%' }}
            placeholder={bp}
            value={value?.[bp] ?? null}
            onChange={v => patch({ [bp]: typeof v === 'number' ? v : undefined })}
          />
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#999' }}>
        断点按屏幕宽度生效，画布只镜像 span；效果请在预览里看
      </div>
    </div>
  )
}
