import {
  ClearOutlined,
  CodeOutlined,
  ExportOutlined,
  EyeOutlined,
  ImportOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { Alert, App, Button, Divider, Input, Modal, Segmented, Space, Tabs } from 'antd'
import { createStyles } from 'antd-style'
import { useMemo, useState } from 'react'
import { FormRenderer } from '../renderer/FormRenderer'
import { validateOptionsImport, validateRuleImport } from '../utils/importValidation'
import { useDesignerStore } from './store'

interface ToolbarProps {
  onSave?: () => void
  onSubmit?: (values: Record<string, any>) => void | Promise<void>
}

const useStyles = createStyles(({ css, token }) => ({
  mobileFrame: css`
    width: min(390px, 100%);
    min-height: 100%;
    margin: 0 auto;
    padding: ${token.paddingSM}px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
  `,
}))

export function Toolbar({ onSave, onSubmit }: ToolbarProps) {
  const { message, modal } = App.useApp()
  const { styles } = useStyles()
  const canUndo = useDesignerStore(s => s.past.length > 0)
  const canRedo = useDesignerStore(s => s.future.length > 0)
  const { undo, redo, clear, importRule, importOptions, exportRule, exportOptions, exportSchema, schema } = useDesignerStore()
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importTab, setImportTab] = useState<'rule' | 'options'>('rule')
  const [previewDevice, setPreviewDevice] = useState<'pc' | 'mobile'>('pc')

  /** 打开导入 / 切换 tab 时，把当前配置预填进编辑框，用户在此基础上修改后点导入 */
  const openImport = () => {
    setImportText(importTab === 'rule' ? exportRule() : exportOptions())
    setImportOpen(true)
  }

  const switchImportTab = (key: string) => {
    const tab = key as typeof importTab
    setImportTab(tab)
    setImportText(tab === 'rule' ? exportRule() : exportOptions())
  }

  const handleImport = () => {
    const result = importTab === 'rule'
      ? importRule(importText)
      : importOptions(importText)
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
      title: '清空画布',
      content: '将删除所有字段（可撤销）',
      onOk: clear,
    })
  }

  const importIssues = useMemo(() => {
    if (!importText.trim())
      return []
    try {
      const value = JSON.parse(importText)
      return importTab === 'rule'
        ? validateRuleImport(value)
        : validateOptionsImport(value, schema)
    }
    catch {
      return [importTab === 'rule' ? '渲染规则不是合法 JSON' : '表单配置不是合法 JSON']
    }
  }, [importTab, importText, schema])

  return (
    <Space split={<Divider type="vertical" />}>
      <Space>
        <Button size="small" icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
        <Button size="small" icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
      </Space>
      <Space>
        <Button size="small" icon={<ImportOutlined />} onClick={openImport}>导入</Button>
        <Button size="small" icon={<ExportOutlined />} onClick={() => setExportOpen(true)}>导出</Button>
        <Button size="small" icon={<CodeOutlined />} onClick={() => setJsonOpen(true)}>JSON</Button>
        <Button size="small" danger icon={<ClearOutlined />} onClick={handleClear}>清空</Button>
      </Space>
      <Space>
        <Segmented
          size="small"
          value={previewDevice}
          onChange={value => setPreviewDevice(value as 'pc' | 'mobile')}
          options={[
            { label: 'PC', value: 'pc' },
            { label: 'Mobile', value: 'mobile' },
          ]}
        />
        <Button
          size="small"
          type="primary"
          ghost
          icon={<EyeOutlined />}
          onClick={() => {
            setPreviewOpen(true)
          }}
        >
          预览
        </Button>
        {onSave && <Button size="small" type="primary" icon={<SaveOutlined />} onClick={onSave}>保存</Button>}
      </Space>

      <Modal title="导入" open={importOpen} onOk={handleImport} onCancel={() => setImportOpen(false)} okText="导入">
        <Tabs
          size="small"
          activeKey={importTab}
          onChange={switchImportTab}
          items={[
            {
              key: 'rule',
              label: '渲染规则',
              children: (
                <Input.TextArea
                  rows={10}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder="粘贴字段树 JSON 数组，仅替换画布字段，表单配置保留当前值"
                />
              ),
            },
            {
              key: 'options',
              label: '表单配置',
              children: (
                <Input.TextArea
                  rows={10}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={'粘贴 { form, events, dataSources } JSON，仅替换全局配置，字段树保留当前值'}
                />
              ),
            },
          ]}
        />
        {importIssues.length > 0 && (
          <Alert
            type="error"
            showIcon
            title="配置校验未通过"
            description={(
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {importIssues.slice(0, 8).map(issue => <li key={issue}>{issue}</li>)}
              </ul>
            )}
            style={{ marginTop: 12 }}
          />
        )}
      </Modal>

      <Modal
        title="Schema JSON 预览"
        open={jsonOpen}
        footer={null}
        width={760}
        centered
        onCancel={() => setJsonOpen(false)}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Input.TextArea
          rows={20}
          readOnly
          value={exportSchema()}
          onFocus={event => event.target.select()}
        />
      </Modal>

      <Modal title="导出" open={exportOpen} footer={null} onCancel={() => setExportOpen(false)}>
        <Tabs
          size="small"
          items={[
            {
              key: 'rule',
              label: '渲染规则',
              children: <Input.TextArea rows={14} readOnly value={exportRule()} onFocus={e => e.target.select()} />,
            },
            {
              key: 'options',
              label: '表单配置',
              children: <Input.TextArea rows={14} readOnly value={exportOptions()} onFocus={e => e.target.select()} />,
            },
          ]}
        />
      </Modal>

      <Modal
        title="表单预览"
        open={previewOpen}
        footer={null}
        width={previewDevice === 'mobile' ? 480 : '80%'}
        centered
        onCancel={() => setPreviewOpen(false)}
        destroyOnHidden
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {previewDevice === 'mobile'
          ? (
              <div className={styles.mobileFrame}>
                <FormRenderer
                  schema={schema}
                  onSubmit={onSubmit}
                />
              </div>
            )
          : (
              <FormRenderer
                schema={schema}
                onSubmit={onSubmit}
              />
            )}
      </Modal>
    </Space>
  )
}
