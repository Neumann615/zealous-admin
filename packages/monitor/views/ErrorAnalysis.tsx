import type { MonitorQueryParams } from '../components/MonitorFilterBar'
import type { ErrorStats, StatsQuery } from '../contracts/monitor'
import { SettingOutlined } from '@ant-design/icons'
import { App, Button, Col, Empty, Row, Table, Tag } from 'antd'
import { createStyles } from 'antd-style'
import { useCallback, useState } from 'react'
import { AlertConfigModal } from '../components/AlertConfigModal'
import { HbarList } from '../components/HbarList'
import { MonitorFilterBar } from '../components/MonitorFilterBar'
import { PanelBlock } from '../components/PanelBlock'
import { StatCards } from '../components/StatCards'
import { StatNotes } from '../components/StatNotes'
import { TrendChart } from '../components/TrendChart'
import { LONG_WINDOW_NOTE, TRUNCATED_NOTE } from '../constants/enums'
import { formatDateTime, formatNumber, formatPercent } from '../runtime/format'
import { getBizErrorStatsAPI, getErrorStatsAPI } from '../services/monitor'

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
}))

export interface ErrorAnalysisProps {
  /** js：脚本异常 + Promise 异常；biz：业务主动上报中的失败操作 */
  kind: 'js' | 'biz'
}

const KIND_META = {
  js: {
    title: 'JS 错误分析',
    ruleIds: ['WINDOW_ERROR_AGG', 'PROMISE_ERROR_AGG'],
    countLabel: 'JS 错误次数',
    topTitle: '错误聚合 Top',
    emptyTitle: '暂无脚本异常',
    rateNote: '错误率 = 错误次数 / 同窗口 PV（USER_ROUTE 条数）。分子为全量、分母为采样近似，数值方向性偏高，仅用于趋势对比。',
  },
  biz: {
    title: '业务错误分析',
    ruleIds: ['PROACTIVE_RT', 'PROACTIVE_AGG', 'FALLBACK_AGG'],
    countLabel: '业务失败次数',
    topTitle: '失败操作聚合 Top',
    emptyTitle: '暂无业务失败上报',
    rateNote: '失败率 = 失败操作数 / 同窗口主动上报操作总数（PROACTIVE_REPORTING），其中 type 为 ERROR 或 WARN 计为失败。',
  },
} as const

/** 错误分析：错误次数/错误率/影响人数趋势 + 聚合排行（JS 与业务共用） */
export function ErrorAnalysis({ kind }: ErrorAnalysisProps) {
  const { styles } = useStyles()
  const { message } = App.useApp()
  const meta = KIND_META[kind]
  const [data, setData] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastQuery, setLastQuery] = useState<StatsQuery | null>(null)
  const [currentApp, setCurrentApp] = useState<MonitorQueryParams['app'] | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)

  const load = useCallback(async (query: StatsQuery) => {
    setLoading(true)
    try {
      setData(await (kind === 'biz' ? getBizErrorStatsAPI(query) : getErrorStatsAPI(query)))
      setLastQuery(query)
    }
    catch (error) {
      setData(null)
      message.error(error instanceof Error ? error.message : '获取数据失败')
    }
    finally {
      setLoading(false)
    }
  }, [kind, message])

  const onQuery = (params: MonitorQueryParams) => {
    setCurrentApp(params.app)
    load({ appId: params.appId, startTime: params.startTime, endTime: params.endTime, source: params.source })
  }

  const total = data?.total
  const cards = [
    {
      label: meta.countLabel,
      value: total?.count ?? null,
      sub: data ? `${data.granularity === 'day' ? '按日' : '按小时'}聚合` : undefined,
      tone: 'error' as const,
      alert: (total?.count ?? 0) > 0,
      spark: data?.trend.map(item => item.count),
    },
    { label: kind === 'biz' ? '失败率' : '错误率', value: total ? formatPercent(total.rate) : '-', sub: `分母 ${formatNumber(total?.denominator ?? null)}`, tone: 'warning' as const },
    { label: '影响人数', value: total?.users ?? null, sub: '按 uid 去重', spark: data?.trend.map(item => item.users) },
    { label: '影响人数占比', value: total?.userPct == null ? '-' : formatPercent(total.userPct), sub: total?.userPct == null ? '长窗口不可用' : '影响人数 / 窗口活跃人数' },
    { label: '聚合条目', value: data?.top.length ?? null, sub: '去重后的错误标题数' },
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
              <StatNotes notes={[
                data.truncated && TRUNCATED_NOTE,
                data.longWindow && LONG_WINDOW_NOTE,
                meta.rateNote,
              ]}
              />
              <StatCards items={cards} />

              <Row gutter={12}>
                <Col xs={24} lg={14}>
                  <PanelBlock title={data.granularity === 'day' ? '错误趋势（按日）' : '错误趋势（按小时）'} sub="（次数柱状 + 影响人数折线）">
                    {data.trend.length
                      ? (
                          <TrendChart
                            labels={data.trend.map(item => item.bucket)}
                            height={280}
                            dataZoom
                            series={[
                              { name: meta.countLabel, data: data.trend.map(item => item.count), tone: 'error', type: 'bar' },
                              { name: '影响人数', data: data.trend.map(item => item.users), tone: 'warning' },
                              { name: '分母基数', data: data.trend.map(item => item.base), tone: 'info' },
                            ]}
                          />
                        )
                      : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={meta.emptyTitle} />}
                  </PanelBlock>
                </Col>
                <Col xs={24} lg={10}>
                  <PanelBlock title={meta.topTitle} sub="（按次数降序，前 10）">
                    <HbarList
                      tone="error"
                      emptyText={meta.emptyTitle}
                      items={data.top.slice(0, 10).map(item => ({
                        label: item.title,
                        value: item.count,
                        tip: `${item.title}（占比 ${item.pct}%，影响 ${item.users} 人，最近 ${formatDateTime(item.lastTime)}）`,
                      }))}
                    />
                  </PanelBlock>
                </Col>
              </Row>

              <PanelBlock title="错误明细排行" sub="（前 50 条，按次数降序）">
                <Table
                  rowKey="title"
                  size="small"
                  dataSource={data.top}
                  pagination={{ pageSize: 15, showTotal: value => `共 ${value} 条聚合` }}
                  scroll={{ x: 'max-content' }}
                  columns={[
                    { title: kind === 'biz' ? '失败操作' : '错误标题', dataIndex: 'title', ellipsis: true, fixed: 'left', width: 360 },
                    { title: '次数', dataIndex: 'count', width: 110, align: 'right', sorter: (a, b) => a.count - b.count, render: value => formatNumber(value) },
                    { title: '占比', dataIndex: 'pct', width: 110, align: 'right', sorter: (a, b) => a.pct - b.pct, render: value => <Tag color={value >= 20 ? 'error' : 'default'}>{formatPercent(value)}</Tag> },
                    { title: '影响人数', dataIndex: 'users', width: 120, align: 'right', sorter: (a, b) => a.users - b.users },
                    { title: '最近发生页面', dataIndex: 'lastPage', width: 240, ellipsis: true, render: value => value || '-' },
                    { title: '最近发生时间', dataIndex: 'lastTime', width: 190, sorter: (a, b) => a.lastTime - b.lastTime, render: value => formatDateTime(value) },
                  ]}
                />
              </PanelBlock>
            </div>
          )
        : null}

      <AlertConfigModal
        open={alertOpen}
        app={currentApp}
        ruleIds={[...meta.ruleIds]}
        title={`${meta.title}预警配置 · ${currentApp?.appName ?? ''}`}
        onClose={() => setAlertOpen(false)}
        onSuccess={() => lastQuery && load(lastQuery)}
      />
    </div>
  )
}