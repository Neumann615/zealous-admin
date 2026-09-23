import type { Dayjs } from 'dayjs'
import type { MonitorApp } from '../contracts/monitor'
import { SearchOutlined } from '@ant-design/icons'
import { App, Button, DatePicker, Input, Select, Space } from 'antd'
import { createStyles } from 'antd-style'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import {
  DAY_GRANULARITY_THRESHOLD_MS,
  MAX_QUERY_WINDOW_MS,
  STATS_TIME_TYPE_OPTIONS,
} from '../constants/enums'
import { useMonitorApps } from '../hooks/useMonitorApps'

const useStyles = createStyles(({ token, css }) => ({
  bar: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    flex-wrap: wrap;
  `,
  label: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  appOption: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token.marginSM}px;
  `,
  appId: css`
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
  `,
  grow: css`
    flex: 1;
  `,
}))

export interface MonitorQueryParams {
  appId: string
  app: MonitorApp
  startTime: number
  endTime: number
  source?: string
  granularity: 'hour' | 'day'
}

export interface MonitorFilterBarProps {
  loading?: boolean
  /** 仅列出已开通日志消费的应用 */
  consumeOnly?: boolean
  showSource?: boolean
  defaultTimeType?: number
  timeTypeOptions?: Array<{ value: number | '', label: string }>
  /** 首次加载完成后自动查询一次 */
  autoQuery?: boolean
  onQuery: (params: MonitorQueryParams) => void
  /** 右侧附加操作区（例如「告警配置」按钮） */
  extra?: React.ReactNode
}

/** 统计页统一筛选栏：应用 + 时间窗口 + 来源系统 */
export function MonitorFilterBar({
  loading = false,
  consumeOnly = true,
  showSource = true,
  defaultTimeType = 3_600_000,
  timeTypeOptions = STATS_TIME_TYPE_OPTIONS,
  autoQuery = true,
  onQuery,
  extra,
}: MonitorFilterBarProps) {
  const { styles } = useStyles()
  const { message } = App.useApp()
  const { apps, loading: appsLoading, reload } = useMonitorApps({ consumeOnly })

  const [appId, setAppId] = useState<string>('')
  const [timeType, setTimeType] = useState<number | ''>(defaultTimeType)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [source, setSource] = useState<string>('')

  useEffect(() => {
    if (apps.length && !apps.some(app => app.appId === appId))
      setAppId(apps[0].appId)
  }, [apps, appId])

  const emit = (nextAppId = appId) => {
    const app = apps.find(item => item.appId === nextAppId)
    if (!app) {
      message.warning('请先选择应用')
      return
    }
    let startTime: number
    let endTime: number
    if (timeType) {
      endTime = Date.now()
      startTime = endTime - Number(timeType)
    }
    else {
      if (!range) {
        message.warning('请选择时间范围')
        return
      }
      startTime = range[0].valueOf()
      endTime = range[1].valueOf()
    }
    if (endTime <= startTime) {
      message.warning('结束时间必须大于开始时间')
      return
    }
    if (endTime - startTime > MAX_QUERY_WINDOW_MS) {
      message.warning('查询窗口超过上限 30 天')
      return
    }
    onQuery({
      appId: app.appId,
      app,
      startTime,
      endTime,
      source: source.trim() || undefined,
      granularity: endTime - startTime > DAY_GRANULARITY_THRESHOLD_MS ? 'day' : 'hour',
    })
  }

  useEffect(() => {
    if (autoQuery && appId && !appsLoading)
      emit(appId)
    // 仅在应用列表首次就绪时自动查询一次
  }, [appId, appsLoading])

  return (
    <div className={styles.bar}>
      <span className={styles.label}>应用</span>
      <Select
        value={appId || undefined}
        onChange={setAppId}
        loading={appsLoading}
        placeholder={consumeOnly ? '仅列出已开通日志消费的应用' : '选择应用'}
        style={{ minWidth: 220 }}
        showSearch
        optionFilterProp="label"
        options={apps.map(app => ({
          value: app.appId,
          label: app.appName,
          title: app.appId,
        }))}
        optionRender={option => (
          <div className={styles.appOption}>
            <span>{option.label}</span>
            <span className={styles.appId}>{option.data.value}</span>
          </div>
        )}
        notFoundContent={appsLoading ? '加载中…' : '暂无可用应用'}
      />

      <span className={styles.label}>时间</span>
      <Select
        value={timeType}
        onChange={(value) => {
          setTimeType(value)
          if (value === '')
            setRange([dayjs().subtract(1, 'day'), dayjs()])
        }}
        style={{ width: 132 }}
        options={timeTypeOptions}
      />
      {timeType === ''
        ? (
            <DatePicker.RangePicker
              showTime
              value={range}
              allowClear={false}
              onChange={value => setRange(value as [Dayjs, Dayjs] | null)}
              disabledDate={current => current && current.valueOf() > Date.now()}
            />
          )
        : null}

      {showSource
        ? (
            <>
              <span className={styles.label}>来源系统</span>
              <Input
                value={source}
                onChange={event => setSource(event.target.value)}
                style={{ width: 160 }}
                allowClear
                placeholder="params 首词"
              />
            </>
          )
        : null}

      <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => emit()}>
        查询
      </Button>
      <Space>
        <Button onClick={reload}>刷新应用</Button>
        {extra}
      </Space>
      <div className={styles.grow} />
    </div>
  )
}