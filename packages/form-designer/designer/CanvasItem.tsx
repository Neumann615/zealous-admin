import type { FieldSchema } from '../types/schema'
import { CopyOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons'
import { useDraggable } from '@dnd-kit/react'
import { Form } from 'antd'
import { createStyles } from 'antd-style'
import { getComponent } from '../registry/registry'
import { shellStyleFromCol } from '../renderer/colProps'
import { DropGap } from './DropGap'
import { useDesignerStore } from './store'
import { useRemoveField } from './useRemoveField'

const useStyles = createStyles(({ token, css }) => ({
  /**
   * z-index:2 使子项整棵子树压在父 mask（z-index:1，inset:0 覆盖父 item 全区）
   * 之上，子字段可点选；父 padding/外壳区仍命中父 mask 用于选中容器。
   * 嵌套容器逐层复用同一规则；根级 item 无父 mask，z-2 无害。
   */
  item: css`
    position: relative;
    z-index: 2;
    border: 1px dashed transparent;
    border-radius: ${token.borderRadius}px;
    padding: 2px;
    &:hover {
      border-color: ${token.colorPrimaryBorder};
    }
  `,
  selected: css`
    border-color: ${token.colorPrimary} !important;
  `,
  mask: css`
    position: absolute;
    inset: 0;
    z-index: 1;
    cursor: default;
  `,
  actions: css`
    position: absolute;
    top: -12px;
    right: 4px;
    z-index: 2;
    display: flex;
    background: ${token.colorPrimary};
    border-radius: ${token.borderRadiusSM}px;
    overflow: hidden;
  `,
  actionBtn: css`
    padding: 1px 6px;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `,
  dragBtn: css`
    cursor: grab;
  `,
  unknown: css`
    padding: ${token.paddingSM}px;
    color: ${token.colorWarning};
  `,
}))

interface CanvasItemProps {
  node: FieldSchema
}

export function CanvasItem({ node }: CanvasItemProps) {
  const { styles, cx } = useStyles()
  // 布尔选择器：仅当选中态在当前项上进/出时才重渲染，避免选中切换扇出到全部 CanvasItem
  const selected = useDesignerStore(s => s.selectedId === node.id)
  const select = useDesignerStore(s => s.select)
  const duplicateField = useDesignerStore(s => s.duplicateField)
  const removeField = useRemoveField()
  const def = getComponent(node.type)

  // 拖拽激活区域随选中态变化属有意设计（formily 同款行为，勿当回归修复）：
  // handleRef 未挂载时（未选中、操作条不渲染）整个字段可起拖；
  // 选中后 handleRef 挂载到操作条手柄，仅手柄可拖，避免与字段输入区交互冲突。
  const { ref: dragRef, handleRef } = useDraggable({
    id: `field-${node.id}`,
    data: { kind: 'field', id: node.id },
  })

  if (!def) {
    return <div className={styles.unknown}>{`未注册的组件类型：${node.type}`}</div>
  }

  /**
   * 水平布局容器（row，或非垂直的 space/flex）内，间隙落点切换为横向变体，
   * 避免 8px 水平条成为占宽的 flex item 挤压栅格/间距。
   * 垂直判定对齐 antd useOrientation 三参优先级：orientation > vertical > direction。
   */
  const horizontalDrops = node.type === 'row'
    || ((node.type === 'space' || node.type === 'flex')
      && !node.props.vertical
      && node.props.direction !== 'vertical'
      && node.props.orientation !== 'vertical')

  /** 容器子列表：交替渲染间隙落点与子项 */
  const renderChildren = () => {
    const kids = node.children ?? []
    if (!kids.length)
      return <DropGap parentId={node.id} index={0} empty horizontal={horizontalDrops} />
    return (
      <>
        {kids.map((c, i) => (
          <span key={c.id} style={{ display: 'contents' }}>
            <DropGap parentId={node.id} index={i} horizontal={horizontalDrops} />
            <CanvasItem node={c} />
          </span>
        ))}
        <DropGap parentId={node.id} index={kids.length} horizontal={horizontalDrops} />
      </>
    )
  }

  /** 画布渲染入口：组件可用 canvasRender 覆盖画布呈现（运行时仍走 render） */
  const render = def.canvasRender ?? def.render

  /**
   * 外壳样式：组件自身的外壳样式（如 col 容器的 props.span）与字段级栅格合并。
   * 两者都表达「这一格占多宽」，字段级 col 更具体，冲突时以它为准。
   */
  const shellStyle = node.col
    ? { ...def.canvasShellStyle?.(node), ...shellStyleFromCol(node.col) }
    : def.canvasShellStyle?.(node)

  const body = def.isContainer
    ? render(node, renderChildren())
    : def.noFormItem
      ? render(node)
      : (
          <Form.Item
            label={node.label}
            required={node.formItem?.rules?.some(r => r.type === 'required')}
            tooltip={node.formItem?.tooltip}
            extra={node.formItem?.extra}
          >
            {render(node)}
          </Form.Item>
        )

  return (
    <div
      ref={dragRef}
      className={cx(styles.item, selected && styles.selected)}
      style={shellStyle}
      onClick={(e) => {
        e.stopPropagation()
        select(node.id)
      }}
    >
      {body}
      <div
        className={styles.mask}
        onClick={(e) => {
          e.stopPropagation()
          select(node.id)
        }}
      />
      {selected && (
        <div className={styles.actions}>
          <span ref={handleRef} className={cx(styles.actionBtn, styles.dragBtn)} title="拖拽移动">
            <DragOutlined />
          </span>
          <span
            className={styles.actionBtn}
            title="复制"
            onClick={(e) => {
              e.stopPropagation()
              duplicateField(node.id)
            }}
          >
            <CopyOutlined />
          </span>
          <span
            className={styles.actionBtn}
            title="删除"
            onClick={(e) => {
              e.stopPropagation()
              removeField(node.id)
            }}
          >
            <DeleteOutlined />
          </span>
        </div>
      )}
    </div>
  )
}
