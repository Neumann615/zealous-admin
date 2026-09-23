import type { WorkbenchStats } from '../contracts/monitor'
import { ReloadOutlined } from '@ant-design/icons'
import { App, Button, Col, Empty, Row, Select, Space, Spin } from 'antd'
import { createStyles } from 'antd-style'
import { useCallback, useEffect, useState } from 'react'
import { HbarList } from '../components/HbarList'
import { PanelBlock } from '../components/PanelBlock'
import { StatCards } from '../components/StatCards'
import { StatNotes } from '../components/StatNotes'
import { TrendChart } from '../components/TrendChart'
import { TRUNCATED_NOTE } from '../constants/enums'
import { useMonitorApps } from '../hooks/useMonitorApps'
import { formatNumber } from '../runtime/format'
import { getWorkbenchStatsAPI } from '../services/monitor'

const useStyles = createStyles(({ token, css }) => ({
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token.marginSM}px;
    flex-wrap: wrap;
    margin-bottom: ${token.marginMD}px;
  `,
  title: css`
    display: flex;
    align-items: baseline;
    gap: ${token.marginSM}px;
  `,
  h1: css`
    margin: 0;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  day: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
  `,
  stack: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
  `,
}))

/** 工作台：今日核心指标 + 昨日对比 + 按小时趋势 + Top 页面/错误 */
export function Workbench() {
  const { styles } = useStyles()
  const { message } = App.useApp()
  const { apps, loading: appsLoading } = useMonitorApps()
  const [appId, setAppId] = useState('')
  const [data, setData] = useState<WorkbenchStats | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (targetAppId: string) => {
    if (!targetAppId)
      return
    setLoading(true)
    try {
      setData(await getWorkbenchStatsAPI(targetAppId))
    }
    catch (error) {
      setData(null)
      message.error(error instanceof Error ? error.message : '获取数据失败')
    }
    finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    if (apps.length && !apps.some(app => app.appId === appId))
      setAppId(apps[0].appId)
  }, [apps, appId])

  useEffect(() => {
    if (appId)
      load(appId)
  }, [appId, load])

  const yesterdayText = (key: 'pv' | 'uv' | 'clicks') => {
    const yesterday = data?.yesterday
    if (!yesterday)
      return '昨日数据未就绪'
    return `昨日全天 ${formatNumber(yesterday[key])}`
  }

  const overall = data?.overall
  const cards = [
    { label: 'PV', value: overall?.pv ?? null, sub: yesterdayText('pv'), spark: data?.trend.map(item => item.pv) },
    { label: 'UV', value: overall?.uv ?? null, sub: yesterdayText('uv'), tone: 'success' as const, spark: data?.trend.map(item => item.uv) },
    { label: '点击数', value: overall?.clicks ?? null, sub: '用户点击（USER_CLICK）', spark: undefined },
    {
      label: 'JS 错误',
      value: overall?.jsError.count ?? null,
      sub: `错误率 ${overall?.jsError.rate ?? 0}%（分母 PV，方向性高估）`,
      tone: 'error' as const,
      alert: (overall?.jsError.count ?? 0) > 0,
      spark: data?.trend.map(item => item.errCount),
    },
    {
      label: '错误影响人数',
      value: overall?.jsError.users ?? null,
      sub: `占比 ${overall?.jsError.userPct ?? 0}%（影响人数 / UV）`,
      tone: 'warning' as const,
    },
  ]

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.title}>
          <h2 className={styles.h1}>数据看板</h2>
          <span className={styles.day}>{data ? `${data.window.day} · 今日 00:00 至今` : ''}</span>
        </div>
        <Space>
          <Select
            value={appId || undefined}
            onChange={setAppId}
            loading={appsLoading}
            placeholder="仅列出已开通日志消费的应用"
            style={{ width: 240 }}
            showSearch
            optionFilterProp="label"
            options={apps.map(app => ({ value: app.appId, label: app.appName }))}
            notFoundContent={appsLoading ? '加载中…' : '暂无已开通日志消费的应用'}
          />
          <Button icon={<ReloadOutlined />} loading={loading} disabled={!appId} onClick={() => load(appId)}>刷新</Button>
        </Space>
      </div>

      {!appsLoading && !apps.length
        ? <Empty description="暂无已开通日志消费的应用，请先在「应用管理 → 消费配置」中开通" />
        : (
            <Spin spinning={loading && !data}>
              <div className={styles.stack}>
                <StatNotes notes={[data?.truncated && TRUNCATED_NOTE]} />
                <StatCards items={cards} />
                <PanelBlock title="实时访问趋势" sub="（今日，按小时分桶）">
                  {data?.trend.length
                    ? (
                        <TrendChart
                          labels={data.trend.map(item => item.bucket)}
                          height={280}
                          dataZoom
                          series={[
                            { name: 'PV', data: data.trend.map(item => item.pv), tone: 'primary' },
                            { name: 'UV', data: data.trend.map(item => item.uv), tone: 'success' },
                            { name: 'JS 错误', data: data.trend.map(item => item.errCount), tone: 'error', type: 'bar' },
                          ]}
                        />
                      )
                    : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}
                </PanelBlock>
                <Row gutter={12}>
                  <Col xs={24} lg={12}>
                    <PanelBlock title="页面访问 Top" sub="（今日，按 PV 降序，前 10）">
                      <HbarList
                        items={(data?.topPages ?? []).map(item => ({
                          label: item.page,
                          value: item.pv,
                          tip: `${item.page}（UV ${item.uv}）`,
                        }))}
                      />
                    </PanelBlock>
                  </Col>
                  <Col xs={24} lg={12}>
                    <PanelBlock title="JS 错误 Top" sub="（今日，按次数降序，前 10）">
                      <HbarList
                        tone="error"
                        items={(data?.topErrors ?? []).map(item => ({
                          label: item.title,
                          value: item.count,
                          tip: `${item.title}（影响 ${item.users} 人）`,
                        }))}
                      />
                    </PanelBlock>
                  </Col>
                </Row>
              </div>
            </Spin>
          )}
    </div>
  )
}