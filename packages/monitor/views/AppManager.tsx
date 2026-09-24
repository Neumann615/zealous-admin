import type { ColumnsType } from 'antd/es/table'
import type { MonitorApp, QueueStats } from '../contracts/monitor'
import { PlusOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import { useHasPermission } from '@zealous-admin/auth'
import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import { createStyles } from 'antd-style'
import { useCallback, useEffect, useState } from 'react'
import { AlertConfigModal } from '../components/AlertConfigModal'
import { StatCards } from '../components/StatCards'
import { DEFAULT_COOLDOWN_MINUTES } from '../constants/enums'
import { useMonitorApps } from '../hooks/useMonitorApps'
import { formatDateTime } from '../runtime/format'
import {
  createMonitorAppAPI,
  getQueueStatsAPI,
  startQueueAPI,
  stopQueueAPI,
  updateMonitorAppAPI,
} from '../services/monitor'

const useStyles = createStyles(({ token, css }) => ({
  toolbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token.marginSM}px;
    flex-wrap: wrap;
    margin-bottom: ${token.marginMD}px;
  `,
  mono: css`
    font-family: ${token.fontFamilyCode};
  `,
  queueItem: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  queueLabel: css`
    min-width: 96px;
  `,
  hint: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
  `,
}))

interface AppFormValues {
  appId: string
  appName: string
  type: 'realTimeLog' | 'operationLog'
  content?: string
  enableQueue?: boolean
  maxSize?: number
  batchSize?: number
  flushInterval?: number
  retryAttempts?: number
  retryDelay?: number
}

const QUEUE_FIELDS: Array<{ name: keyof AppFormValues, label: string, min: number, tip: string }> = [
  { name: 'maxSize', label: '最大长度', min: 1, tip: '队列能存储的最大消息数量，溢出时优先丢弃低优先级最旧日志' },
  { name: 'batchSize', label: '批量大小', min: 1, tip: '每次批量处理的消息数量' },
  { name: 'flushInterval', label: '刷新间隔(ms)', min: 100, tip: '队列刷新的时间间隔' },
  { name: 'retryAttempts', label: '重试次数', min: 0, tip: '消息处理失败后的重试次数' },
  { name: 'retryDelay', label: '重试延迟(ms)', min: 100, tip: '重试之间的等待时间' },
]

/** 应用管理：接入应用清单 + 队列配置 + 消费/预警开关 + 队列运行时状态 */
export function AppManager() {
  const { styles } = useStyles()
  const { message, modal } = App.useApp()
  const hasPermission = useHasPermission()
  const [form] = Form.useForm<AppFormValues>()
  const { apps, loading, reload } = useMonitorApps({ consumeOnly: false })

  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MonitorApp | null>(null)
  const [saving, setSaving] = useState(false)
  const [alertApp, setAlertApp] = useState<MonitorApp | null>(null)
  const [statsApp, setStatsApp] = useState<MonitorApp | null>(null)
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const loadStats = useCallback(async (appId: string) => {
    setStatsLoading(true)
    try {
      setStats(await getQueueStatsAPI(appId))
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '获取队列状态失败')
    }
    finally {
      setStatsLoading(false)
    }
  }, [message])

  useEffect(() => {
    if (!statsApp)
      return
    loadStats(statsApp.appId)
    const timer = setInterval(loadStats, 5000, statsApp.appId)
    return () => clearInterval(timer)
  }, [statsApp, loadStats])

  const filtered = keyword.trim()
    ? apps.filter(app => [app.appId, app.appName, app.content].some(value => String(value ?? '').toLowerCase().includes(keyword.trim().toLowerCase())))
    : apps

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      type: 'realTimeLog',
      enableQueue: true,
      maxSize: 5000,
      batchSize: 50,
      flushInterval: 1000,
      retryAttempts: 2,
      retryDelay: 500,
    })
    setModalOpen(true)
  }

  const openEdit = (app: MonitorApp) => {
    setEditing(app)
    form.setFieldsValue({
      appId: app.appId,
      appName: app.appName,
      type: app.type,
      content: app.content ?? '',
      enableQueue: app.props?.enableQueue ?? false,
      maxSize: app.props?.maxSize ?? 5000,
      batchSize: app.props?.batchSize ?? 50,
      flushInterval: app.props?.flushInterval ?? 1000,
      retryAttempts: app.props?.retryAttempts ?? 2,
      retryDelay: app.props?.retryDelay ?? 500,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const props = {
        enableQueue: values.enableQueue ?? false,
        maxSize: values.maxSize,
        batchSize: values.batchSize,
        flushInterval: values.flushInterval,
        retryAttempts: values.retryAttempts,
        retryDelay: values.retryDelay,
      }
      if (editing) {
        await updateMonitorAppAPI({
          appId: editing.appId,
          appName: values.appName,
          type: values.type,
          content: values.content ?? '',
          props,
        })
        message.success('保存成功，队列参数已生效')
      }
      else {
        await createMonitorAppAPI({
          appId: values.appId,
          appName: values.appName,
          type: values.type,
          content: values.content ?? '',
          operatingState: 1,
          props: { ...props, consume: { enabled: true }, alert: null },
        })
        message.success('创建成功')
      }
      setModalOpen(false)
      reload()
    }
    catch (error) {
      if (error instanceof Error)
        message.error(error.message)
    }
    finally {
      setSaving(false)
    }
  }

  const toggleState = (app: MonitorApp, enabled: boolean) => {
    modal.confirm({
      title: enabled ? '确认停用该应用？' : '确认启用该应用？',
      content: '停用后该应用的采集上报将被拒绝，已有数据保留。',
      onOk: async () => {
        try {
          await updateMonitorAppAPI({ appId: app.appId, operatingState: enabled ? 0 : 1 })
          message.success('操作成功')
          reload()
        }
        catch (error) {
          message.error(error instanceof Error ? error.message : '操作失败')
        }
      },
    })
  }

  const toggleQueue = async (app: MonitorApp, enabled: boolean) => {
    try {
      if (enabled)
        await startQueueAPI(app.appId)
      else
        await stopQueueAPI(app.appId)
      message.success(enabled ? '队列已启动' : '队列已停止，后续上报改为同步写库')
      reload()
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const columns: ColumnsType<MonitorApp> = [
    { title: '序号', width: 64, render: (_v, _r, index) => index + 1 },
    { title: 'appId', dataIndex: 'appId', width: 180, render: value => <span className={styles.mono}>{value}</span> },
    { title: '名称', dataIndex: 'appName', width: 180 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: value => <Tag color={value === 'realTimeLog' ? 'processing' : 'default'}>{value === 'realTimeLog' ? '实时日志' : '操作日志'}</Tag>,
    },
    { title: '说明', dataIndex: 'content', ellipsis: true },
    {
      title: '启用',
      dataIndex: 'operatingState',
      width: 90,
      render: (value: number, record) => (
        <Switch checked={value === 1} disabled={!hasPermission('monitor:app:edit')} onChange={checked => toggleState(record, checked)} />
      ),
    },
    {
      title: '队列',
      width: 160,
      render: (_v, record) => (
        <Space size={4}>
          <Switch
            size="small"
            checked={record.props?.enableQueue === true}
            disabled={!hasPermission('monitor:app:edit')}
            onChange={checked => toggleQueue(record, checked)}
          />
          <Tooltip title={record.props?.enableQueue ? '异步批量落库' : '同步写库'}>
            <span className={styles.hint}>{record.props?.enableQueue ? '异步批量' : '同步写库'}</span>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '消费/预警',
      width: 130,
      render: (_v, record) => (
        <Space size={4}>
          <Tag color={record.props?.consume?.enabled ? 'success' : 'default'}>
            {record.props?.consume?.enabled ? '消费开' : '消费关'}
          </Tag>
          <Tag color={record.props?.alert?.enabled ? 'error' : 'default'}>
            {record.props?.alert?.enabled ? '预警开' : '预警关'}
          </Tag>
        </Space>
      ),
    },
    { title: '更新时间', dataIndex: 'updateTime', width: 170, render: value => value ? formatDateTime(value) : '-' },
    {
      title: '操作',
      width: 240,
      fixed: 'right',
      render: (_v, record) => (
        <Space size={4}>
          {hasPermission('monitor:app:edit') && <Button size="small" type="link" onClick={() => openEdit(record)}>编辑</Button>}
          {hasPermission('monitor:app:edit') && <Button size="small" type="link" icon={<SettingOutlined />} onClick={() => setAlertApp(record)}>消费配置</Button>}
          <Button size="small" type="link" onClick={() => setStatsApp(record)}>队列状态</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className={styles.toolbar}>
        <Space>
          <Input
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder="appId / 名称 / 说明"
            allowClear
            style={{ width: 260 }}
          />
          <Button icon={<ReloadOutlined />} onClick={reload}>刷新</Button>
        </Space>
        {hasPermission('monitor:app:add') && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>创建应用</Button>}
      </div>

      <Table
        rowKey="appId"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showTotal: value => `共 ${value} 个应用` }}
      />

      <Modal
        open={modalOpen}
        title={editing ? '修改应用' : '创建应用'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        width={620}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="appId"
            label="appId"
            rules={[
              { required: true, message: '请输入 appId' },
              { pattern: /^[a-z0-9][\w-]*$/i, message: '仅允许字母、数字、中划线与下划线' },
            ]}
          >
            <Input disabled={!!editing} placeholder="与 SDK initMonitor 的 appId 一致" />
          </Form.Item>
          <Form.Item name="appName" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'realTimeLog', label: '实时日志' }, { value: 'operationLog', label: '操作日志' }]} />
          </Form.Item>
          <Form.Item name="content" label="说明">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="enableQueue" label="启用队列" valuePropName="checked" tooltip="启用后日志异步批量落库，停用恢复同步写库">
            <Switch />
          </Form.Item>
          <Space wrap>
            {QUEUE_FIELDS.map(field => (
              <Form.Item
                key={String(field.name)}
                name={field.name}
                label={field.label}
                tooltip={field.tip}
                rules={[{ required: true, message: `请输入${field.label}` }]}
              >
                <InputNumber min={field.min} style={{ width: 140 }} />
              </Form.Item>
            ))}
          </Space>
        </Form>
      </Modal>

      <AlertConfigModal
        open={!!alertApp}
        app={alertApp}
        onClose={() => setAlertApp(null)}
        onSuccess={reload}
      />

      <Drawer
        open={!!statsApp}
        title={`队列运行时状态 · ${statsApp?.appName ?? ''}`}
        size={520}
        onClose={() => {
          setStatsApp(null)
          setStats(null)
        }}
        extra={<Button icon={<ReloadOutlined />} loading={statsLoading} onClick={() => statsApp && loadStats(statsApp.appId)}>刷新</Button>}
      >
        {stats
          ? (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <StatCards
                  items={[
                    { label: '总入队', value: stats.totalEnqueued },
                    { label: '总出队', value: stats.totalDequeued },
                    { label: '处理成功', value: stats.totalProcessed, tone: 'success' },
                    { label: '处理失败', value: stats.totalFailed, tone: stats.totalFailed > 0 ? 'error' : 'default', alert: stats.totalFailed > 0 },
                    { label: '当前排队', value: stats.totalQueued, tone: stats.totalQueued > 0 ? 'warning' : 'default' },
                    { label: '重试队列', value: stats.retryQueueSize, tone: stats.retryQueueSize > 0 ? 'warning' : 'default' },
                  ]}
                />
                <Card size="small" title="各优先级队列大小">
                  {(['high', 'normal', 'low'] as const).map((level) => {
                    const value = stats.queueSizes[level]
                    const max = Math.max(stats.queueSizes.high, stats.queueSizes.normal, stats.queueSizes.low, 1)
                    return (
                      <div key={level} className={styles.queueItem}>
                        <span className={styles.queueLabel}>{level === 'high' ? '高优先级' : level === 'normal' ? '普通优先级' : '低优先级'}</span>
                        <Progress percent={Math.round((value / max) * 100)} showInfo={false} style={{ flex: 1 }} />
                        <span className={styles.mono}>{value}</span>
                      </div>
                    )
                  })}
                  <div className={styles.hint} style={{ marginTop: 8 }}>
                    高优先级：ERROR 级别与脚本/Promise 异常；低优先级：点击、路由、资源汇总；其余为普通优先级。
                  </div>
                </Card>
                <Card size="small" title="队列参数">
                  <Space direction="vertical" size={4}>
                    {QUEUE_FIELDS.map(field => (
                      <div key={String(field.name)} className={styles.queueItem}>
                        <span className={styles.queueLabel}>{field.label}</span>
                        <span className={styles.mono}>{String(statsApp?.props?.[field.name as keyof typeof statsApp.props] ?? '-')}</span>
                      </div>
                    ))}
                    <div className={styles.queueItem}>
                      <span className={styles.queueLabel}>冷却时间</span>
                      <span className={styles.mono}>
                        {statsApp?.props?.alert?.cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES}
                        分钟
                      </span>
                    </div>
                  </Space>
                </Card>
              </Space>
            )
          : null}
      </Drawer>
    </div>
  )
}
