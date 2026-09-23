import { createHmac } from 'node:crypto'
import type { AlertNotifyChannel } from './schema'

/** 推送给通道的预警载荷 */
export interface AlertPayload {
  appId: string
  appName: string
  ruleId: string
  ruleLabel: string
  alertType: string
  level: 'INFO' | 'WARN' | 'ERROR'
  title: string
  windowMinutes: number
  happenTime: number
  fields: Record<string, unknown>
}

export interface ChannelResult {
  type: string
  ok: boolean
  status?: number
  error?: string
  at: number
}

const TIMEOUT_MS = 5000

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}): Promise<{ ok: boolean, status: number, error?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const ok = response.ok
    return { ok, status: response.status, error: ok ? undefined : `HTTP ${response.status}` }
  }
  catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) }
  }
  finally {
    clearTimeout(timer)
  }
}

/** 飞书自定义机器人签名校验：HmacSHA256(timestamp + "\n" + secret, 空串) 后 base64 */
function feishuSign(secret: string, timestamp: number): string {
  const stringToSign = `${timestamp}\n${secret}`
  return createHmac('sha256', stringToSign).update('').digest('base64')
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function buildText(payload: AlertPayload): string {
  const lines = [
    `[${payload.level}] ${payload.title}`,
    `应用：${payload.appName}（${payload.appId}）`,
    `规则：${payload.ruleLabel}（${payload.ruleId}）`,
    `窗口：最近 ${payload.windowMinutes} 分钟`,
    `时间：${formatTime(payload.happenTime)}`,
  ]
  const fields = Object.entries(payload.fields ?? {})
  for (const [key, value] of fields)
    lines.push(`${key}：${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
  return lines.join('\n')
}

async function sendWebhook(channel: AlertNotifyChannel, payload: AlertPayload): Promise<ChannelResult> {
  const result = await postJson(channel.url, payload)
  return { type: channel.type, ok: result.ok, status: result.status, error: result.error, at: Date.now() }
}

async function sendFeishu(channel: AlertNotifyChannel, payload: AlertPayload): Promise<ChannelResult> {
  const text = buildText(payload)
  const body: Record<string, unknown> = channel.templateId === 'MARKDOWN'
    ? { msg_type: 'text', content: { text } }
    : {
        msg_type: 'interactive',
        card: {
          header: {
            title: { tag: 'plain_text', content: `[${payload.level}] ${payload.title}` },
            template: payload.level === 'ERROR' ? 'red' : payload.level === 'WARN' ? 'orange' : 'blue',
          },
          elements: [{ tag: 'markdown', content: text.split('\n').slice(1).join('\n') }],
        },
      }

  if (channel.secret) {
    const timestamp = Math.floor(Date.now() / 1000)
    body.timestamp = String(timestamp)
    body.sign = feishuSign(channel.secret, timestamp)
  }

  const result = await postJson(channel.url, body)
  return { type: channel.type, ok: result.ok, status: result.status, error: result.error, at: Date.now() }
}

/** 向所有启用的通道投递，返回逐通道结果（供预警记录展示与失败重发） */
export async function dispatchChannels(
  channels: AlertNotifyChannel[] | null | undefined,
  payload: AlertPayload,
): Promise<ChannelResult[]> {
  const enabled = (channels ?? []).filter(channel => channel.enabled !== false && !!channel.url)
  if (!enabled.length)
    return []

  const results = await Promise.allSettled(
    enabled.map(async (channel) => {
      if (channel.type === 'feishu')
        return sendFeishu(channel, payload)
      return sendWebhook(channel, payload)
    }),
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled')
      return result.value
    return {
      type: enabled[index].type,
      ok: false,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      at: Date.now(),
    }
  })
}