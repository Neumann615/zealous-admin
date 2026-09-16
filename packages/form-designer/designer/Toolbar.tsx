import {
  ClearOutlined,
  ExportOutlined,
  EyeOutlined,
  ImportOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { App, Button, Divider, Input, Modal, Space, theme } from 'antd'
import { useState } from 'react'
import { validateEvents } from '../events/validateEvents'
import { FormRenderer } from '../renderer/FormRenderer'
import { validateFieldRules } from '../utils/parseSchema'
import { useDesignerStore } from './store'

interface ToolbarProps {
  onSave?: () => void
}

export function Toolbar({ onSave }: ToolbarProps) {
  const { message, modal } = App.useApp()
  const { token } = theme.useToken()
  const canUndo = useDesignerStore(s => s.past.length > 0)
  const canRedo = useDesignerStore(s => s.future.length > 0)
  const { undo, redo, clear, importSchema, exportSchema, schema } = useDesignerStore()
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)
  // 导出面板不经过保存拦截（编辑器可以停在「选了阈值类型还没填数值」的中间态），
  // 这里把同一份口径的问题显式摆出来：导出不阻断，但要让用户知道这份 JSON 回读会被拒
  const exportIssues = exportOpen ? [...validateFieldRules(schema.children), ...validateEvents(schema.events)] : []

  const handleImport = () => {
    const result = importSchema(importText)
    if (!result.ok) {
      message.error(result.reason)
      return
    }
    message.success('导入成功')
    setImportOpen(false)
    setImportText('')
  }

  const handleClear = () => {
    modal.confirm({
      title: '清空画布？',
      content: '将删除所有字段（可撤销）',
      onOk: clear,
    })
  }

  return (
    <Space split={<Divider type="vertical" />}>
      <Space>
        <Button size="small" icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
        <Button size="small" icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
      </Space>
      <Space>
        <Button size="small" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>导入</Button>
        <Button size="small" icon={<ExportOutlined />} onClick={() => setExportOpen(true)}>导出</Button>
        <Button size="small" danger icon={<ClearOutlined />} onClick={handleClear}>清空</Button>
      </Space>
      <Space>
        <Button
          size="small"
          type="primary"
          ghost
          icon={<EyeOutlined />}
          onClick={() => {
            setSubmitted(null)
            setPreviewOpen(true)
          }}
        >
          预览
        </Button>
        {onSave && <Button size="small" type="primary" icon={<SaveOutlined />} onClick={onSave}>保存</Button>}
      </Space>

      <Modal title="导入 Schema" open={importOpen} onOk={handleImport} onCancel={() => setImportOpen(false)} okText="导入">
        <Input.TextArea rows={10} value={importText} onChange={e => setImportText(e.target.value)} placeholder="粘贴 FormSchema JSON" />
      </Modal>

      <Modal title="导出 Schema" open={exportOpen} footer={null} onCancel={() => setExportOpen(false)}>
        {exportIssues.length > 0 && (
          <div style={{ marginBottom: 8, color: token.colorError }}>
            {`当前 schema 有问题，导入时会被拒绝：${exportIssues.join('；')}`}
          </div>
        )}
        <Input.TextArea rows={14} readOnly value={exportSchema()} onFocus={e => e.target.select()} />
      </Modal>

      <Modal title="表单预览" open={previewOpen} footer={null} width={720} onCancel={() => setPreviewOpen(false)} destroyOnHidden>
        <FormRenderer
          schema={schema}
          onSubmit={(values) => {
            setSubmitted(JSON.stringify(values, null, 2))
            message.success('提交成功，数据见下方')
          }}
        />
        {submitted && (
          <pre style={{ marginTop: 16, padding: 12, background: token.colorFillSecondary, borderRadius: 6, maxHeight: 240, overflow: 'auto' }}>
            {submitted}
          </pre>
        )}
      </Modal>
    </Space>
  )
}
