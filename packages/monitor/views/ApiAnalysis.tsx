import type { MonitorQueryParams } from '../components/MonitorFilterBar'
import type { ApiStats, StatsQuery } from '../contracts/monitor'
import { SettingOutlined } from '@ant-design/icons'
import { App, Button, Col, Empty, InputNumber, Popover, Row, Space, Table, Tag } from 'antd'
import { createStyles } from 'antd-style'
import { useCallback, useMemo, useState } from 'react'
import { AlertConfigModal } from '../components/AlertConfigModal'
import { HbarList } from '../components/HbarList'
import { MonitorFilterBar } from '../components/MonitorFilterBar'
import { PanelBlock } from '../components/PanelBlock'
import { StatCards } from '../components/StatCards'
import { StatNotes } from '../components/StatNotes'
import { TrendChart } from '../components/TrendChart'
import { TRUNCATED_NOTE } from '../constants/enums'
import { formatDateTime, formatDuration, formatNumber, formatPercent } from '../runtime/format'
import { getApiStatsAPI } from '../services/monitor'

const useStyles = createStyles(({ token, css }) => ({
  stack: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
    margin-top: ${token.marginSM}px;
  `,
  queryCard: css`
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
  hint: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
  `,
}))

const API_RULE_IDS = ['API_SLOW', 'API_ERROR', 'API_AGG']

/** 接口分析：调用次数、慢调用、报错、P95 趋势与接口明细下钻 */
export function ApiAnalysis() {
  const { styles } = useStyles()
  const { message } = App.useApp()
  const [data, setData] = useState<ApiStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastQuery, setLastQuery] = useState<StatsQuery | null>(null)
  const [currentApp, setCurrentApp] = useState<MonitorQueryParams['app'] | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [hiddenUrls, setHiddenUrls] = useState<string[]>([])
  const [maxCount, setMaxCount] = useState<number | null>(null)

  const load = useCallback(async (query: StatsQuery) => {
    setLoading(true)
    try {
      setData(await getApiStatsAPI(query))
      setLastQuery(query)
    }
    catch (error) {
      setData(null)
      message.error(error instanceof Error ? error.message : '获取数据失败')
    }
    finally {
      setLoading(false)
    }
  }, [message])

  const onQuery = (params: MonitorQueryParams) => {
    setCurrentApp(params.app)
    load({ appId: params.appId, startTime: params.startTime, endTime: params.endTime, source: params.source })
  }

  /** 隐藏高频轮询/健康检查类接口，与次数上限过滤叠加 */
  const visibleApis = useMemo(() => {
    const list = data?.apis ?? []
    return list.filter(item => !hiddenUrls.includes(item.url) && (maxCount === null || item.count <= maxCount))
  }, [data, hiddenUrls, maxCount])

  const hiddenCount = (data?.apis.length ?? 0) - visibleApis.length
  const totalCount = visibleApis.reduce((sum, item) => sum + item.count, 0)
  const slowTotal = visibleApis.reduce((sum, item) => sum + item.slowCount, 0)
  const errorTotal = visibleApis.reduce((sum, item) => sum + item.errorCount, 0)

  const cards = [
    { label: '调用次数', value: totalCount, sub: hiddenCount ? `采样近似（已过滤 ${hiddenCount} 个接口）` : '采样近似', spark: data?.trend.map(item => item.count) },
    { label: '接口数', value: visibleApis.length },
    { label: '慢调用', value: slowTotal, sub: `占比 ${totalCount ? Math.round((slowTotal / totalCount) * 100) : 0}%（门槛 ${data?.slowMs ?? 1000}ms）`, tone: 'warning' as const, alert: slowTotal > 0 },
    { label: '报错', value: errorTotal, sub: `报错率 ${totalCount ? Math.round((errorTotal / totalCount) * 100) : 0}%`, tone: 'error' as const, alert: errorTotal > 0 },
  ]

  return (
    <div>
      <div className={styles.queryCard}>
        <MonitorFilterBar
          loading={loading}
          onQuery={onQuery}
          extra={(
            <Button icon={<SettingOutlined />} disabled={!currentApp} onClick={() => setAlertOpen(true)}>
              告警配置
            </Button>
          )}
        />
      </div>

      {data
        ? (
            <div className={styles.stack}>
              <StatNotes notes={[data.truncated && TRUNCATED_NOTE, '调用次数为窗口内采样近似值，报错率分母为同窗口调用次数。']} />
              <StatCards items={cards} />

              <Row gutter={12}>
                <Col xs={24} lg={12}>
                  <PanelBlock title="P95 用时趋势" sub={data.trend.length ? `（${/^\d{2}:/.test(data.trend[0].day) ? '小时' : '日'}粒度）` : ''}>
                    {data.trend.length
                      ? (
                          <TrendChart
                            labels={data.trend.map(item => item.day)}
                            height={240}
                            dataZoom
                            series={[{ name: 'P95 用时(ms)', data: data.trend.map(item => item.p95), tone: 'warning' }]}
                          />
                        )
                      : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}
                  </PanelBlock>
                </Col>
                <Col xs={24} lg={12}>
                  <PanelBlock title="Top 慢接口" sub="（按 P95，前 10）">
                    <HbarList
                      tone="warning"
                      items={[...visibleApis]
                        .filter(item => item.p95 !== null)
                        .sort((a, b) => (b.p95 ?? 0) - (a.p95 ?? 0))
                        .slice(0, 10)
                        .map(item => ({ label: item.url, value: item.p95 ?? 0, tip: `${item.url}（P95 ${formatDuration(item.p95)}）` }))}
                    />
                  </PanelBlock>
                </Col>
              </Row>

              <PanelBlock
                title="接口明细"
                sub="（点击行查看最近报错样本）"
                actions={(
                  <Space className={styles.filterRow}>
                    <span className={styles.hint}>仅看次数 ≤</span>
                    <InputNumber
                      size="small"
                      min={1}
                      value={maxCount}
                      onChange={value => setMaxCount(value)}
                      placeholder="不限"
                      style={{ width: 110 }}
                    />
                    {hiddenCount
                      ? (
                          <Popover
                            title="已隐藏接口"
                            trigger="click"
                            content={(
                              <Space direction="vertical" size={2}>
                                {hiddenUrls.map(url => (
                                  <Space key={url} size={4}>
                                    <span className={styles.hint}>{url}</span>
                                    <Button size="small" type="link" onClick={() => setHiddenUrls(list => list.filter(item => item !== url))}>
                                      取消隐藏
                                    </Button>
                                  </Space>
                                ))}
                              </Space>
                            )}
                          >
                            <Tag color="warning" style={{ cursor: 'pointer' }}>
                              已隐藏
                              {hiddenCount}
                              {' '}
                              个接口
                            </Tag>
                          </Popover>
                        )
                      : null}
                  </Space>
                )}
              >
                <Table
                  rowKey="url"
                  size="small"
                  dataSource={visibleApis}
                  pagination={{ pageSize: 20, showTotal: value => `共 ${value} 个接口` }}
                  scroll={{ x: 'max-content' }}
                  columns={[
                    { title: '接口', dataIndex: 'url', ellipsis: true, fixed: 'left', width: 320 },
                    { title: '次数', dataIndex: 'count', width: 100, align: 'right', sorter: (a, b) => a.count - b.count, render: value => formatNumber(value) },
                    { title: '平均', dataIndex: 'avg', width: 110, align: 'right', render: value => formatDuration(value) },
                    { title: 'P95', dataIndex: 'p95', width: 110, align: 'right', sorter: (a, b) => (a.p95 ?? 0) - (b.p95 ?? 0), render: value => formatDuration(value) },
                    { title: '最大', dataIndex: 'max', width: 110, align: 'right', render: value => formatDuration(value) },
                    { title: '慢调用', dataIndex: 'slowCount', width: 110, align: 'right', render: (value, row) => <Tag color={value ? 'warning' : 'default'}>{`${value}（${formatPercent(row.slowPct)}）`}</Tag> },
                    { title: '报错', dataIndex: 'errorCount', width: 110, align: 'right', render: (value, row) => <Tag color={value ? 'error' : 'default'}>{`${value}（${formatPercent(row.errorRate)}）`}</Tag> },
                    {
                      title: '操作',
                      width: 110,
                      fixed: 'right',
                      render: (_v, row) => (
                        <Button
                          size="small"
                          type="link"
                          onClick={() => setHiddenUrls(list => (list.includes(row.url) ? list.filter(item => item !== row.url) : [...list, row.url]))}
                        >
                          {hiddenUrls.includes(row.url) ? '取消隐藏' : '隐藏'}
                        </Button>
                      ),
                    },
                  ]}
                  expandable={{
                    rowExpandable: row => row.errors.length > 0,
                    expandedRowRender: row => (
                      <Table
                        rowKey={(item: typeof row.errors[number]) => `${item.time}-${item.status}-${item.message}`}
                        size="small"
                        pagination={false}
                        dataSource={row.errors}
                        columns={[
                          { title: '发生时间', dataIndex: 'time', width: 180, render: value => formatDateTime(value) },
                          { title: '状态码', dataIndex: 'status', width: 90, render: value => <Tag color={value && value >= 400 ? 'error' : 'default'}>{value ?? '-'}</Tag> },
                          { title: '报错信息', dataIndex: 'message', ellipsis: true },
                          { title: '用时', dataIndex: 'duration', width: 100, align: 'right', render: value => formatDuration(value) },
                          { title: '发生页面', dataIndex: 'page', width: 200, ellipsis: true },
                          { title: '用户', dataIndex: 'user', width: 120, ellipsis: true },
                          { title: '请求ID', dataIndex: 'requestId', width: 180, ellipsis: true },
                          { title: '重复', dataIndex: 'repeat', width: 80, align: 'right' },
                        ]}
                      />
                    ),
                  }}
                />
              </PanelBlock>
            </div>
          )
        : null}

      <AlertConfigModal
        open={alertOpen}
        app={currentApp}
        ruleIds={API_RULE_IDS}
        title={`接口分析预警配置 · ${currentApp?.appName ?? ''}`}
        onClose={() => setAlertOpen(false)}
        onSuccess={() => lastQuery && load(lastQuery)}
      />
    </div>
  )
}