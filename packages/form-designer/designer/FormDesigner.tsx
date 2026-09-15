import type { DragEndEvent } from '@dnd-kit/react'
import type { FormSchema } from '../types/schema'
import { DragDropProvider } from '@dnd-kit/react'
import { App } from 'antd'
import { createStyles } from 'antd-style'
import { useEffect, useRef } from 'react'
import { validateEvents } from '../events/validateEvents'
import { validateSchemaFieldNames } from '../utils/fieldName'
import { Canvas } from './Canvas'
import { LeftPanel } from './LeftPanel'
import { RightPanel } from './RightPanel'
import { useDesignerStore } from './store'
import { Toolbar } from './Toolbar'
import { useRemoveField } from './useRemoveField'
import '../registry/components'

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: ${token.colorBgLayout};
  `,
  toolbar: css`
    padding: ${token.paddingXS}px ${token.paddingSM}px;
    background: ${token.colorBgContainer};
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  body: css`
    flex: 1;
    display: flex;
    min-height: 0;
  `,
  left: css`
    width: 250px;
    flex-shrink: 0;
    background: ${token.colorBgContainer};
    border-right: 1px solid ${token.colorBorderSecondary};
    overflow-y: auto;
  `,
  canvas: css`
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    padding: ${token.paddingLG}px;
  `,
  right: css`
    width: 300px;
    flex-shrink: 0;
    background: ${token.colorBgContainer};
    border-left: 1px solid ${token.colorBorderSecondary};
    overflow-y: auto;
  `,
}))

export interface FormDesignerProps {
  /** 初始 schema。身份（引用）变化时重新装载；同实例切换编辑对象时建议配合 key 使用 */
  initialSchema?: FormSchema
  onSave?: (schema: FormSchema) => void
}

export function FormDesigner({ initialSchema, onSave }: FormDesignerProps) {
  const { styles } = useStyles()
  const { message } = App.useApp()
  const { setSchema, schema } = useDesignerStore()
  const rootRef = useRef<HTMLDivElement>(null)
  const removeField = useRemoveField()

  // 保存前拦截字段名问题：不一致的字段名会静默产生脏数据（同名绑定到同一 store 槽位）
  function handleSave() {
    const issues = validateSchemaFieldNames(schema)
    // 钩子校验与 parseSchema 共用同一份口径（含正文长度上限），避免「保存放行、回读拒绝」
    const hookIssues = validateEvents(schema.events)
    if (issues.length || hookIssues.length) {
      message.error([...issues, ...hookIssues].join('；'))
      return
    }
    onSave?.(schema)
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.canceled)
      return
    const src = event.operation.source?.data as { kind?: string, type?: string, id?: string } | undefined
    const target = event.operation.target?.data as { parentId: string | null, index: number } | undefined
    if (!src || !target)
      return
    const { addField, moveField } = useDesignerStore.getState()
    if (src.kind === 'palette' && src.type)
      addField(src.type, target)
    else if (src.kind === 'field' && src.id)
      moveField(src.id, target)
  }

  // 外部 schema 装载：initialSchema 身份变化时重新装载（消费方切换表单时应传入新对象；
  // 若父组件复用同一对象引用则不触发——同实例切换表单的推荐做法是传 key={表单id}）
  useEffect(() => {
    if (initialSchema)
      setSchema(initialSchema)
  }, [initialSchema, setSchema])

  // 键盘快捷键：仅当事件目标在设计器容器内时生效；
  // 可编辑目标（输入框/文本域/contentEditable）内屏蔽 Delete/Ctrl+D 与撤销重做（让位于原生文本编辑）
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement))
        return false
      return /^(?:INPUT|TEXTAREA)$/.test(el.tagName) || el.isContentEditable
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const root = rootRef.current
      if (!root)
        return
      const inRoot = root.contains(e.target as Node)
      // 点击画布后焦点回落 body：仅当设计器可见（非 keep-alive display:none 隐藏）时放行
      const bodyFallback = e.target === document.body && root.offsetParent !== null
      if (!inRoot && !bodyFallback)
        return
      const key = e.key.toLowerCase()
      const mod = e.ctrlKey || e.metaKey
      if (isEditable(e.target))
        return
      const { selectedId, duplicateField, undo, redo } = useDesignerStore.getState()
      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
      else if (e.key === 'Delete' && selectedId) {
        removeField(selectedId)
      }
      else if (mod && key === 'd' && selectedId) {
        e.preventDefault()
        duplicateField(selectedId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [removeField])

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.toolbar}>
        <Toolbar onSave={onSave ? handleSave : undefined} />
      </div>
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className={styles.body}>
          <div className={styles.left}><LeftPanel /></div>
          <div className={styles.canvas}><Canvas /></div>
          <div className={styles.right}><RightPanel /></div>
        </div>
      </DragDropProvider>
    </div>
  )
}
