import type { AlertNotifyChannel, AlertRule, MonitorApp, MonitorAppProps } from '../contracts/monitor'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Divider, Form, Input, InputNumber, Modal, Select, Space, Switch, Tag, Tooltip } from 'antd'
import { createStyles } from 'antd-style'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ALERT_FIELD_LABELS,
  ALERT_FIELD_TIPS,
  ALERT_RULE_CATALOG,
  CHANNEL_TYPE_OPTIONS,
  DEFAULT_COOLDOWN_MINUTES,
  TEMPLATE_OPTIONS,
} from '../constants/enums'
import { updateMonitorAppAPI } from '../services/monitor'

const useStyles = createStyles(({ token, css }) => ({
  section: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
  `,
  sectionTitle: css`
    font-size: ${token.fontSize}px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  switchRow: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
  `,
  switchLabel: css`
    min-width: 132px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  rule: css`
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    padding: ${token.paddingSM}px ${token.padding}px;
  `,
  ruleHead: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    flex-wrap: wrap;
  `,
  ruleName: css`
    font-weight: 600;
    color: ${token.colorText};
  `,
  ruleId: css`
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
  `,
  ruleDesc: css`
    margin-top: 2px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
  `,
  ruleFields: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    flex-wrap: wrap;
    margin-top: ${token.marginSM}px;
  `,
  fieldItem: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  channel: css`
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr) 150px 32px;
    gap: ${token.marginXS}px;
    align-items: center;
  `,
  grow: css`
    flex: 1;
  `,
}))

interface RuleDraft {
  id: string
  enabled: boolean
  values: Record<string, any>
}

export interface AlertConfigModalProps {
  open: boolean
  app?: MonitorApp | null
  /** 仅展示指定规则（分析页按主题裁剪），为空表示全部 */
  ruleIds?: string[]
  title?: string
  onClose: () => void
  onSuccess?: () => void
}

function toDrafts(existing: AlertRule[] | null | undefined, ruleIds?: string[]): RuleDraft[] {
  const catalog = ruleIds?.length ? ALERT_RULE_CATALOG.filter(rule => ruleIds.includes(rule.id)) : ALERT_RULE_CATALOG
  return catalog.map((meta) => {
    const saved = (existing ?? []).find(rule => rule.id === meta.id)
    const body = (saved?.[meta.channel] ?? {}) as Record<string, any>
    const values: Record<string, any> = {}
    for (const field of meta.fields) {
      if (field === 'enabled')
        continue
      values[field] = body[field] ?? meta.defaults[field]
    }
    return {
      id: meta.id,
      enabled: saved ? body.enabled !== false : false,
      values,
    }
  })
}

/** 日志消费与预警配置：消费开关 + 预警开关 + 冷却 + 通道 + 规则 */
export function AlertConfigModal({ open, app, ruleIds, title, onClose, onSuccess }: AlertConfigModalProps) {
  const { styles } = useStyles()
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const [consumeEnabled, setConsumeEnabled] = useState(false)
  const [alertEnabled, setAlertEnabled] = useState(false)
  const [customCooldown, setCustomCooldown] = useState(false)
  const [cooldownMinutes, setCooldownMinutes] = useState(DEFAULT_COOLDOWN_MINUTES)
  const [channels, setChannels] = useState<AlertNotifyChannel[]>([])
  const [rules, setRules] = useState<RuleDraft[]>([])
  const [saving, setSaving] = useState(false)
  /** 分析页只允许改本主题规则，其余规则原样回写 */
  const untouchedRules = useRef<AlertRule[]>([])

  useEffect(() => {
    if (!open || !app)
      return
    const props = app.props ?? {}
    const alert = props.alert
    setConsumeEnabled(props.consume?.enabled === true)
    setAlertEnabled(alert?.enabled === true)
    setCustomCooldown(alert?.cooldownMinutes != null)
    setCooldownMinutes(alert?.cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES)
    setChannels(
      alert?.channels?.length
        ? alert.channels
        : [{ type: 'feishu', enabled: true, url: '', secret: '', templateId: 'TEXT_CARD' }],
    )
    setRules(toDrafts(alert?.rules, ruleIds))
    untouchedRules.current = (alert?.rules ?? []).filter(rule => !ruleIds?.length || !ruleIds.includes(rule.id))
  }, [open, app, ruleIds])

  const catalog = useMemo(
    () => (ruleIds?.length ? ALERT_RULE_CATALOG.filter(rule => ruleIds.includes(rule.id)) : ALERT_RULE_CATALOG),
    [ruleIds],
  )
  const enabledCount = rules.filter(rule => rule.enabled).length

  const patchChannel = (index: number, patch: Partial<AlertNotifyChannel>) => {
    setChannels(list => list.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const buildPayload = (): MonitorAppProps['alert'] => {
    const merged: AlertRule[] = untouchedRules.current.map(rule => ({ ...rule }))
    for (const draft of rules) {
      const meta = catalog.find(item => item.id === draft.id)
      if (!meta)
        continue
      const body: Record<string, any> = { enabled: draft.enabled }
      for (const field of meta.fields) {
        if (field === 'enabled')
          continue
        if (field === 'paramsPrefix') {
          if (draft.values[field])
            body[field] = draft.values[field]
          continue
        }
        body[field] = draft.values[field]
      }
      const existingIndex = merged.findIndex(rule => rule.id === draft.id)
      const rule: AlertRule = { id: draft.id, [meta.channel]: body } as AlertRule
      if (existingIndex >= 0)
        merged[existingIndex] = rule
      else
        merged.push(rule)
    }

    return {
      enabled: alertEnabled,
      cooldownMinutes: customCooldown ? cooldownMinutes : null,
      channels: alertEnabled ? channels.filter(channel => channel.url) : null,
      rules: merged.length ? merged : null,
    }
  }

  const validate = (): boolean => {
    if (!alertEnabled)
      return true
    if (!channels.some(channel => channel.url)) {
      message.warning('预警开启时至少需要一个已填写地址的通道')
      return false
    }
    if (!enabledCount) {
      message.warning('预警开启时至少需要启用一条规则')
      return false
    }
    return true
  }

  const handleOk = async () => {
    if (!app || !validate())
      return
    setSaving(true)
    try {
      await updateMonitorAppAPI({
        appId: app.appId,
        props: { consume: { enabled: consumeEnabled }, alert: buildPayload() },
      })
      message.success('保存成功：配置即时生效')
      onSuccess?.()
      onClose()
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    }
    finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title ?? `日志消费与预警配置 · ${app?.appName ?? ''}`}
      width={760}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" component="div">
        <div className={styles.section}>
          <Alert
            type="info"
            showIcon
            message="消费开关决定是否对该应用做统计分析与预警；关闭后仅保留原始日志检索。"
          />
          <div className={styles.switchRow}>
            <span className={styles.switchLabel}>日志统计分析</span>
            <Switch checked={consumeEnabled} onChange={setConsumeEnabled} />
            <Tag color={consumeEnabled ? 'success' : 'default'}>{consumeEnabled ? '已开启' : '未开启'}</Tag>
          </div>
          <div className={styles.switchRow}>
            <span className={styles.switchLabel}>预警开关</span>
            <Switch checked={alertEnabled} onChange={setAlertEnabled} disabled={!consumeEnabled} />
            {!consumeEnabled ? <span className={styles.ruleDesc}>开启日志统计分析后可配置</span> : null}
          </div>
          <div className={styles.switchRow}>
            <span className={styles.switchLabel}>冷却时间(分钟)</span>
            <Switch checked={customCooldown} onChange={setCustomCooldown} disabled={!alertEnabled} />
            <InputNumber
              value={cooldownMinutes}
              onChange={value => setCooldownMinutes(Number(value ?? DEFAULT_COOLDOWN_MINUTES))}
              min={0}
              max={10080}
              disabled={!alertEnabled || !customCooldown}
            />
            <span className={styles.ruleDesc}>
              留空使用默认
              {DEFAULT_COOLDOWN_MINUTES}
              {' '}
              分钟；同一规则+维度命中冷却时只记录不推送
            </span>
          </div>
        </div>

        <Divider titlePlacement="left" plain>消息通道</Divider>
        <div className={styles.section}>
          {channels.map((channel, index) => (
            <div key={`${channel.type}-${index}`} className={styles.channel}>
              <Select
                value={channel.type}
                onChange={value => patchChannel(index, { type: value })}
                options={CHANNEL_TYPE_OPTIONS}
                disabled={!alertEnabled}
              />
              <Input
                value={channel.url}
                onChange={event => patchChannel(index, { url: event.target.value })}
                placeholder={channel.type === 'feishu' ? '飞书自定义机器人 Webhook 地址' : '通用 Webhook 地址（POST JSON）'}
                disabled={!alertEnabled}
              />
              {channel.type === 'feishu'
                ? (
                    <Input
                      value={channel.secret ?? ''}
                      onChange={event => patchChannel(index, { secret: event.target.value })}
                      placeholder="签名校验密钥（可选）"
                      disabled={!alertEnabled}
                    />
                  )
                : (
                    <Select
                      value={channel.templateId ?? 'TEXT_CARD'}
                      onChange={value => patchChannel(index, { templateId: value })}
                      options={TEMPLATE_OPTIONS}
                      disabled={!alertEnabled}
                    />
                  )}
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={!alertEnabled}
                onClick={() => setChannels(list => list.filter((_, i) => i !== index))}
              />
            </div>
          ))}
          <Space>
            <Button
              icon={<PlusOutlined />}
              disabled={!alertEnabled}
              onClick={() => setChannels(list => [...list, { type: 'feishu', enabled: true, url: '', secret: '', templateId: 'TEXT_CARD' }])}
            >
              添加通道
            </Button>
            <span className={styles.ruleDesc}>飞书通道支持签名校验；Webhook 通道直接 POST 预警 JSON，便于对接自建机器人。</span>
          </Space>
        </div>

        <Divider titlePlacement="left" plain>
          预警规则
          <Tag style={{ marginLeft: 8 }} color={enabledCount ? 'processing' : 'default'}>
            已启用
            {enabledCount}
          </Tag>
        </Divider>
        <div className={styles.section}>
          {rules.map((draft) => {
            const meta = catalog.find(item => item.id === draft.id)
            if (!meta)
              return null
            return (
              <div key={draft.id} className={styles.rule}>
                <div className={styles.ruleHead}>
                  <Switch
                    checked={draft.enabled}
                    disabled={!alertEnabled}
                    onChange={checked => setRules(list => list.map(item => (item.id === draft.id ? { ...item, enabled: checked } : item)))}
                  />
                  <span className={styles.ruleName}>{meta.label}</span>
                  <span className={styles.ruleId}>{meta.id}</span>
                  <Tag color={meta.channel === 'realtime' ? 'processing' : 'default'}>
                    {meta.channel === 'realtime' ? '实时窗口' : '聚合巡检'}
                  </Tag>
                  <div className={styles.grow} />
                </div>
                <div className={styles.ruleDesc}>{meta.desc}</div>
                {draft.enabled
                  ? (
                      <div className={styles.ruleFields}>
                        {meta.fields.filter(field => field !== 'enabled').map((field) => {
                          const tip = ALERT_FIELD_TIPS[field]
                          const label = ALERT_FIELD_LABELS[field] ?? field
                          const control = field === 'paramsPrefix'
                            ? (
                                <Input
                                  size="small"
                                  style={{ width: 140 }}
                                  value={draft.values[field] ?? ''}
                                  placeholder="留空=全部来源"
                                  disabled={!alertEnabled}
                                  onChange={event => setRules(list => list.map(item => (item.id === draft.id
                                    ? { ...item, values: { ...item.values, [field]: event.target.value } }
                                    : item)))}
                                />
                              )
                            : (
                                <InputNumber
                                  size="small"
                                  style={{ width: 110 }}
                                  min={0}
                                  value={draft.values[field]}
                                  disabled={!alertEnabled}
                                  onChange={value => setRules(list => list.map(item => (item.id === draft.id
                                    ? { ...item, values: { ...item.values, [field]: Number(value ?? 0) } }
                                    : item)))}
                                />
                              )
                          return (
                            <span key={field} className={styles.fieldItem}>
                              {label}
                              {control}
                              {tip
                                ? (
                                    <Tooltip title={tip}>
                                      <Tag style={{ cursor: 'help' }}>?</Tag>
                                    </Tooltip>
                                  )
                                : null}
                            </span>
                          )
                        })}
                      </div>
                    )
                  : null}
              </div>
            )
          })}
        </div>
      </Form>
    </Modal>
  )
}
