import type { MonitorQueryParams } from '../components/MonitorFilterBar'
import type { AlertHistoryQuery, AlertHistoryRecord } from '../contracts/monitor'
import { CheckCircleOutlined, CloseCircleOutlined, RedoOutlined, SettingOutlined } from '@ant-design/icons'
import { App, Button, Descriptions, Select, Space, Table, Tag, Tooltip } from 'antd'
import { createStyles } from 'antd-style'
import { useCallback, useState } from 'react'
import { AlertConfigModal } from '../components/AlertConfigModal'
import { MonitorFilterBar } from '../components/MonitorFilterBar'
import { PanelBlock } from '../components/PanelBlock'
import { StatNotes } from '../components/StatNotes'
import { ALERT_TYPE_OPTIONS, alertTypeLabel, CHANNEL_TYPE_OPTIONS } from '../constants/enums'
import { formatDateTime } from '../runtime/format'
import { getAlertHistoryAPI, retryAlertAPI } from '../services/monitor'

const useStyles = createStyles(({ token, css }) => ({
  stack: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
    margin-top: ${token.marginSM}px;
  `,
  queryCard: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
    padding: ${token.padding}px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  filterRow: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    flex-wrap: wrap;
  `,
  label: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  mono: css`
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
    word-break: break-all;
  `,
}))

const LEVEL_TONE: Record<string, string> = { INFO: 'default', WARN: 'warning', ERROR: 'error' }

const OK_OPTIONS = [
  { value: '', label: '全部结果' },
  { value: '1', label: '全部成功' },
  { value: '0', label: '存在失败' },
]

const CHANNEL_FILTER_OPTIONS = [{ value: '', label: '全部通道' }, ...CHANNEL_TYPE_OPTIONS]

interface BaseQuery {
  appId: string
  startTime: number
  endTime: number
}

/** 预警记录：触发历史 + 通知通道结果 + 失败重发 */
export function AlertHistory() {
  const { styles } = useStyles()
  const { message } = App.useApp()
  const [base, setBase] = useState<BaseQuery | null>(null)
  const [currentApp, setCurrentApp] = useState<MonitorQueryParams['app'] | null>(null)
  const [alertType, setAlertType] = useState('')
  const [channel, setChannel] = useState('')
  const [ok, setOk] = useState('')
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [data, setData] = useState<{ list: AlertHistoryRecord[], total: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [retryingId, setRetryingId] = useState<number | null>(null)
  const [configOpen, setConfigOpen] = useState(false)

  const load = useCallback(async (query: AlertHistoryQuery) => {
    setLoading(true)
    try {
      const result = await getAlertHistoryAPI(query)
      setData({ list: result.list, total: result.total })
    }
    catch (error) {
      setData(null)
      message.error(error instanceof Error ? error.message : '获取预警记录失败')
    }
    finally {
      setLoading(false)
    }
  }, [message])

  const onQuery = (params: MonitorQueryParams) => {
    const nextBase = { appId: params.appId, startTime: params.startTime, endTime: params.endTime }
    setBase(nextBase)
    setCurrentApp(params.app)
    setPageNum(1)
    load({ ...nextBase, alertType: alertType || undefined, channel: (channel || undefined) as AlertHistoryQuery['channel'], ok: (ok || undefined) as AlertHistoryQuery['ok'], pageNum: 1, pageSize })
  }

  const reload = (patch: { alertType?: string, channel?: string, ok?: string, pageNum?: number, pageSize?: number } = {}) => {
    if (!base)
      return
    const next = {
      alertType: patch.alertType ?? alertType,
      channel: patch.channel ?? channel,
      ok: patch.ok ?? ok,
      pageNum: patch.pageNum ?? pageNum,
      pageSize: patch.pageSize ?? pageSize,
    }
    load({
      ...base,
      alertType: next.alertType || undefined,
      channel: (next.channel || undefined) as AlertHistoryQuery['channel'],
      ok: (next.ok || undefined) as AlertHistoryQuery['ok'],
      pageNum: next.pageNum,
      pageSize: next.pageSize,
    })
  }

  const onRetry = async (row: AlertHistoryRecord) => {
    setRetryingId(row.id)
    try {
      await retryAlertAPI(row.id)
      message.success('已重发失败通道')
      reload()
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '重发失败')
    }
    finally {
      setRetryingId(null)
    }
  }

  return (
    <div>
      <div className={styles.queryCard}>
        <MonitorFilterBar
          loading={loading}
          showSource={false}
          defaultTimeType={86_400_000}
          onQuery={onQuery}
          extra={(
            <Button icon={<SettingOutlined />} disabled={!currentApp} onClick={() => setConfigOpen(true)}>
              预警配置
            </Button>
          )}
        />
        <div className={styles.filterRow}>
          <span className={styles.label}>预警类型</span>
          <Select
            value={alertType}
            onChange={(value) => {
              setAlertType(value)
              setPageNum(1)
              reload({ alertType: value, pageNum: 1 })
            }}
            options={[{ value: '', label: '全部类型' }, ...ALERT_TYPE_OPTIONS]}
            style={{ width: 220 }}
          />
          <span className={styles.label}>通知通道</span>
          <Select
            value={channel}
            onChange={(value) => {
              setChannel(value)
              setPageNum(1)
              reload({ channel: value, pageNum: 1 })
            }}
            options={CHANNEL_FILTER_OPTIONS}
            style={{ width: 180 }}
          />
          <span className={styles.label}>发送结果</span>
          <Select
            value={ok}
            onChange={(value) => {
              setOk(value)
              setPageNum(1)
              reload({ ok: value, pageNum: 1 })
            }}
            options={OK_OPTIONS}
            style={{ width: 160 }}
          />
        </div>
      </div>

      <div className={styles.stack}>
        <StatNotes notes={[
          '冷却期内命中的同类预警只累加 cooldownHit，不重复通知；「重发」仅重投失败通道，不产生新的冷却计数。',
          '通知结果为空表示该应用未配置任何启用的通道，预警只落库不外发。',
        ]}
        />
        <PanelBlock title="预警记录" sub={`（共 ${data?.total ?? 0} 条，按发生时间倒序）`}>
          <Table<AlertHistoryRecord>
            rowKey="id"
            size="small"
            loading={loading}
            dataSource={data?.list ?? []}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: pageNum,
              pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              showTotal: value => `共 ${value} 条`,
              onChange: (nextPage, nextSize) => {
                setPageNum(nextPage)
                setPageSize(nextSize)
                reload({ pageNum: nextPage, pageSize: nextSize })
              },
            }}
            columns={[
              { title: '发生时间', dataIndex: 'happenTime', width: 180, fixed: 'left', render: value => formatDateTime(value) },
              { title: '级别', dataIndex: 'level', width: 90, render: value => <Tag color={LEVEL_TONE[value] ?? 'default'}>{value}</Tag> },
              {
                title: '预警类型',
                dataIndex: 'alertType',
                width: 180,
                render: (value, row) => (
                  <Tooltip title={`规则 ${row.ruleId}`}>
                    <span>{alertTypeLabel(value)}</span>
                  </Tooltip>
                ),
              },
              { title: '标题', dataIndex: 'title', ellipsis: true, width: 320 },
              { title: '统计窗口', width: 200, render: (_v, row) => `${formatDateTime(row.startTime)} ~ ${formatDateTime(row.endTime)}` },
              {
                title: '通知结果',
                dataIndex: 'channels',
                width: 240,
                render: (value: AlertHistoryRecord['channels']) => (
                  value.length
                    ? (
                        <Space size={4} wrap>
                          {value.map(item => (
                            <Tooltip key={`${item.type}-${item.at}`} title={item.ok ? `成功（HTTP ${item.status ?? '-'}）` : `失败：${item.error ?? '未知错误'}`}>
                              <Tag color={item.ok ? 'success' : 'error'} icon={item.ok ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
                                {CHANNEL_TYPE_OPTIONS.find(option => option.value === item.type)?.label ?? item.type}
                              </Tag>
                            </Tooltip>
                          ))}
                        </Space>
                      )
                    : <Tag>未配置通道</Tag>
                ),
              },
              { title: '冷却命中', dataIndex: 'cooldownHit', width: 100, align: 'right', render: value => (value ? <Tag color="warning">{value}</Tag> : '-') },
              { title: '重发次数', dataIndex: 'retryCount', width: 100, align: 'right', render: (value, row) => (value ? <Tooltip title={`最近重发 ${formatDateTime(row.lastRetryTime ?? '')}`}>{value}</Tooltip> : '-') },
              {
                title: '操作',
                width: 110,
                fixed: 'right',
                render: (_v, row) => {
                  const hasFailed = row.channels.length === 0 || row.channels.some(item => !item.ok)
                  return (
                    <Button
                      size="small"
                      type="link"
                      icon={<RedoOutlined />}
                      disabled={!hasFailed}
                      loading={retryingId === row.id}
                      onClick={() => onRetry(row)}
                    >
                      重发
                    </Button>
                  )
                },
              },
            ]}
            expandable={{
              expandedRowRender: row => (
                <Descriptions size="small" column={1} bordered>
                  <Descriptions.Item label="应用">{row.appId}</Descriptions.Item>
                  <Descriptions.Item label="规则">{row.ruleId}</Descriptions.Item>
                  <Descriptions.Item label="命中字段">
                    <pre className={styles.mono}>{JSON.stringify(row.fields ?? {}, null, 2)}</pre>
                  </Descriptions.Item>
                  <Descriptions.Item label="通道明细">
                    <pre className={styles.mono}>{JSON.stringify(row.channels ?? [], null, 2)}</pre>
                  </Descriptions.Item>
                  <Descriptions.Item label="落库时间">{row.createTime ?? '-'}</Descriptions.Item>
                </Descriptions>
              ),
            }}
          />
        </PanelBlock>
      </div>

      <AlertConfigModal
        open={configOpen}
        app={currentApp}
        title={`预警配置 · ${currentApp?.appName ?? ''}`}
        onClose={() => setConfigOpen(false)}
        onSuccess={() => reload()}
      />
    </div>
  )
}