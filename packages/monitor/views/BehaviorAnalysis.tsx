import type { MonitorQueryParams } from '../components/MonitorFilterBar'
import type { BehaviorStats, StatsQuery } from '../contracts/monitor'
import { ArrowRightOutlined } from '@ant-design/icons'
import { App, Col, Empty, Row, Table, Tag } from 'antd'
import { createStyles } from 'antd-style'
import { useCallback, useState } from 'react'
import { HbarList } from '../components/HbarList'
import { MonitorFilterBar } from '../components/MonitorFilterBar'
import { PanelBlock } from '../components/PanelBlock'
import { StatCards } from '../components/StatCards'
import { StatNotes } from '../components/StatNotes'
import { TrendChart } from '../components/TrendChart'
import { LONG_WINDOW_NOTE, TRUNCATED_NOTE } from '../constants/enums'
import { formatNumber } from '../runtime/format'
import { getBehaviorStatsAPI } from '../services/monitor'

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
  path: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  arrow: css`
    flex-shrink: 0;
    color: ${token.colorTextTertiary};
  `,
  page: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}))

const UV_UNAVAILABLE_NOTE = '窗口超过 24 小时：UV 需全窗口去重，按天分桶后不成立，故置为不可用（-），PV 与点击数为累加值。'

/** 行为分析：PV/UV 趋势、热门点击、页面访问与路径流转 */
export function BehaviorAnalysis() {
  const { styles } = useStyles()
  const { message } = App.useApp()
  const [data, setData] = useState<BehaviorStats | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (query: StatsQuery) => {
    setLoading(true)
    try {
      setData(await getBehaviorStatsAPI(query))
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
    load({ appId: params.appId, startTime: params.startTime, endTime: params.endTime, source: params.source })
  }

  const overall = data?.overall
  const cards = [
    { label: 'PV', value: overall?.pv ?? null, sub: 'USER_ROUTE 条数', spark: data?.trend.map(item => item.pv) },
    { label: 'UV', value: overall?.uv ?? '-', sub: overall?.uv == null ? '长窗口不可用' : '按 uid 去重', tone: 'success' as const, spark: data?.trend.map(item => item.uv) },
    { label: '点击数', value: overall?.clicks ?? null, sub: 'USER_CLICK 条数' },
    { label: '路径流转数', value: overall?.paths ?? null, sub: '去重后的「来源 → 目标」组合' },
    { label: '页面数', value: data?.pageviews.length ?? null, sub: '窗口内有访问的页面' },
  ]

  return (
    <div>
      <div className={styles.queryCard}>
        <MonitorFilterBar loading={loading} onQuery={onQuery} />
      </div>

      {data
        ? (
            <div className={styles.stack}>
              <StatNotes notes={[
                data.truncated && TRUNCATED_NOTE,
                data.longWindow && UV_UNAVAILABLE_NOTE,
                data.longWindow && LONG_WINDOW_NOTE,
                '路径流转取路由埋点 extra.from 与当前页面配对，直接落地（无来源）的访问不计入。',
              ]}
              />
              <StatCards items={cards} />

              <PanelBlock title={data.longWindow ? '访问趋势（按日）' : '访问趋势（按小时）'} sub="（PV 柱状 + UV 折线）">
                {data.trend.length
                  ? (
                      <TrendChart
                        labels={data.trend.map(item => item.day)}
                        height={280}
                        dataZoom
                        series={[
                          { name: 'PV', data: data.trend.map(item => item.pv), tone: 'primary', type: 'bar' },
                          { name: 'UV', data: data.trend.map(item => item.uv), tone: 'success' },
                        ]}
                      />
                    )
                  : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}
              </PanelBlock>

              <Row gutter={12}>
                <Col xs={24} lg={12}>
                  <PanelBlock title="热门点击 Top" sub="（按点击标题聚合，前 10）">
                    <HbarList
                      items={data.topClicks.slice(0, 10).map(item => ({
                        label: item.label,
                        value: item.count,
                        tip: `${item.label}（发生页面：${item.pages.join('、') || '-'}）`,
                      }))}
                    />
                  </PanelBlock>
                </Col>
                <Col xs={24} lg={12}>
                  <PanelBlock title="页面访问 Top" sub="（按 PV 降序，前 10）">
                    <HbarList
                      tone="info"
                      items={data.pageviews.slice(0, 10).map(item => ({
                        label: item.page,
                        value: item.pv,
                        tip: `${item.page}（UV ${item.uv ?? '-'}）`,
                      }))}
                    />
                  </PanelBlock>
                </Col>
              </Row>

              <PanelBlock title="页面访问明细" sub="（前 50 个页面）">
                <Table
                  rowKey="page"
                  size="small"
                  dataSource={data.pageviews}
                  pagination={{ pageSize: 15, showTotal: value => `共 ${value} 个页面` }}
                  columns={[
                    { title: '页面', dataIndex: 'page', ellipsis: true },
                    { title: 'PV', dataIndex: 'pv', width: 120, align: 'right', sorter: (a, b) => a.pv - b.pv, render: value => formatNumber(value) },
                    { title: 'UV', dataIndex: 'uv', width: 120, align: 'right', sorter: (a, b) => (a.uv ?? 0) - (b.uv ?? 0), render: value => (value == null ? '-' : formatNumber(value)) },
                  ]}
                />
              </PanelBlock>

              <PanelBlock title="路径流转 Top" sub="（来源页面 → 目标页面，前 20 条）">
                <Table
                  rowKey={row => `${row.from}->${row.to}`}
                  size="small"
                  dataSource={data.topPaths}
                  pagination={false}
                  columns={[
                    {
                      title: '路径',
                      render: (_v, row) => (
                        <div className={styles.path}>
                          <Tag className={styles.page}>{row.from || '（无来源）'}</Tag>
                          <ArrowRightOutlined className={styles.arrow} />
                          <Tag color="blue" className={styles.page}>{row.to || '（未知）'}</Tag>
                        </div>
                      ),
                    },
                    { title: '次数', dataIndex: 'count', width: 120, align: 'right', sorter: (a, b) => a.count - b.count, render: value => formatNumber(value) },
                  ]}
                />
              </PanelBlock>
            </div>
          )
        : null}
    </div>
  )
}