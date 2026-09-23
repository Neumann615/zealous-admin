import type { MonitorQueryParams } from '../components/MonitorFilterBar'
import type { PerfStats, StatsQuery } from '../contracts/monitor'
import { App, Col, Empty, Row, Table, Tag } from 'antd'
import { createStyles } from 'antd-style'
import { useCallback, useState } from 'react'
import { HbarList } from '../components/HbarList'
import { MonitorFilterBar } from '../components/MonitorFilterBar'
import { PanelBlock } from '../components/PanelBlock'
import { StatCards } from '../components/StatCards'
import { StatNotes } from '../components/StatNotes'
import { TrendChart } from '../components/TrendChart'
import { LONG_WINDOW_NOTE, perfStageLabel, TRUNCATED_NOTE } from '../constants/enums'
import { formatDuration, formatNumber } from '../runtime/format'
import { getPerfStatsAPI } from '../services/monitor'

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

/** 性能统计：PERFORMANCE 埋点聚合 + RESOURCE_PER 资源汇总 */
export function PerfAnalysis() {
  const { styles } = useStyles()
  const { message } = App.useApp()
  const [data, setData] = useState<PerfStats | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (query: StatsQuery) => {
    setLoading(true)
    try {
      setData(await getPerfStatsAPI(query))
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

  const stages = data?.overall.stages ?? {}
  const loadStage = stages.load
  const cards = [
    { label: '覆盖页面', value: data?.overall.pages ?? null, sub: '窗口内有样本' },
    { label: '样本数', value: data?.overall.samples ?? null, sub: 'PERFORMANCE 条目' },
    { label: '平均加载 load', value: loadStage?.avg != null ? formatDuration(loadStage.avg) : '-', sub: '全页面均值', spark: data?.trend.map(item => item.loadAvg) },
    {
      label: 'P95 加载 load',
      value: loadStage?.p95 != null ? formatDuration(loadStage.p95) : '-',
      sub: data?.approximate ? '直方图近似' : '全量值排序',
      tone: 'warning' as const,
      spark: data?.trend.map(item => item.loadP95),
    },
    { label: '资源数(均)', value: data?.overall.resource.avgCount ?? '-', sub: 'RESOURCE_PER' },
    { label: '传输KB(均)', value: data?.overall.resource.avgTotalKB ?? '-', sub: 'RESOURCE_PER' },
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
                data.approximate && LONG_WINDOW_NOTE,
                '耗时口径来自 Navigation Timing 二级时间戳换算，跨域资源无 Timing-Allow-Origin 时部分阶段可能为 0。',
              ]}
              />
              <StatCards items={cards} />

              <Row gutter={12}>
                <Col xs={24} lg={14}>
                  <PanelBlock title={data.granularity === 'day' ? '按日趋势' : '按小时趋势'} sub={`（${data.granularity === 'day' ? '日' : '小时'}粒度）`}>
                    {data.trend.length
                      ? (
                          <TrendChart
                            labels={data.trend.map(item => item.day)}
                            height={260}
                            dataZoom
                            series={[
                              { name: 'load 平均', data: data.trend.map(item => item.loadAvg), tone: 'primary' },
                              { name: 'load P95', data: data.trend.map(item => item.loadP95), tone: 'warning' },
                            ]}
                          />
                        )
                      : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}
                  </PanelBlock>
                </Col>
                <Col xs={24} lg={10}>
                  <PanelBlock title="分页面加载时长" sub="（按 load P95 降序，前 10）">
                    <HbarList
                      tone="warning"
                      items={data.pages.slice(0, 10).map(item => ({
                        label: item.page,
                        value: item.stages.load?.p95 ?? 0,
                        tip: `${item.page}（样本 ${item.samples}）`,
                      }))}
                    />
                  </PanelBlock>
                </Col>
              </Row>

              <PanelBlock title="页面指标总表" sub="（展开查看阶段明细）">
                <Table
                  rowKey="page"
                  size="small"
                  pagination={false}
                  dataSource={data.pages}
                  scroll={{ x: 'max-content' }}
                  columns={[
                    { title: '页面', dataIndex: 'page', ellipsis: true, fixed: 'left', width: 260 },
                    { title: '样本', dataIndex: 'samples', width: 90, align: 'right', render: value => formatNumber(value) },
                    ...Object.keys(stages).map(stage => ({
                      title: `${perfStageLabel(stage)} P95`,
                      width: 130,
                      align: 'right' as const,
                      render: (_: unknown, row: PerfStats['pages'][number]) => formatDuration(row.stages[stage]?.p95),
                    })),
                  ]}
                  expandable={{
                    expandedRowRender: row => (
                      <Row gutter={[8, 8]}>
                        {Object.entries(row.stages).map(([stage, stat]) => (
                          <Col key={stage} xs={12} md={6}>
                            <Tag>{perfStageLabel(stage)}</Tag>
                            <div>
                              平均
                              {formatDuration(stat.avg)}
                              {' / P95 '}
                              {formatDuration(stat.p95)}
                              {' / 最大 '}
                              {formatDuration(stat.max)}
                              {' / 最小 '}
                              {formatDuration(stat.min)}
                            </div>
                          </Col>
                        ))}
                      </Row>
                    ),
                  }}
                />
              </PanelBlock>

              <PanelBlock title="最慢资源 Top" sub="（RESOURCE_PER，取批次内最慢 20 个资源聚合）">
                <Table
                  rowKey="name"
                  size="small"
                  pagination={false}
                  dataSource={data.overall.resource.slowTop}
                  columns={[
                    { title: '资源', dataIndex: 'name', ellipsis: true },
                    { title: '平均耗时', dataIndex: 'avg', width: 140, align: 'right', render: value => formatDuration(value) },
                    { title: '命中次数', dataIndex: 'count', width: 120, align: 'right' },
                  ]}
                />
              </PanelBlock>
            </div>
          )
        : null}
    </div>
  )
}