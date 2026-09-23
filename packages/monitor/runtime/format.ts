function pad(value: number, size = 2): string {
  return value.toString().padStart(size, '0')
}

/** 耗时格式化：>=1s 用秒，否则毫秒；非法值统一显示 '-' */
export function formatDuration(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '-'
  if (value >= 1000)
    return `${(value / 1000).toFixed(2)}s`
  return `${Math.round(value)}ms`
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '-'
  return value.toLocaleString('zh-CN')
}

/** yyyy-MM-dd HH:mm:ss */
export function formatDateTime(input: number | string | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime()))
    return '-'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 带毫秒的时间戳，实时日志用 */
export function formatDateTimeMs(ts: number): string {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime()))
    return '-'
  return `${formatDateTime(date)}.${pad(date.getMilliseconds(), 3)}`
}

/** 当天只显示时分秒，跨天补全日期，减少表格宽度占用 */
export function formatLogTime(ts: number): string {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime()))
    return '-'
  const ms = pad(date.getMilliseconds(), 3)
  const isToday = formatDateTime(date).slice(0, 10) === formatDateTime(new Date()).slice(0, 10)
  return isToday
    ? `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`
    : `${formatDateTime(date)}.${ms}`
}

export function formatPercent(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '-'
  return `${value}%`
}

/** 内容是否为可格式化 JSON */
export function isJsonText(text?: string | null): boolean {
  const value = (text ?? '').trim()
  if (!value.startsWith('{') && !value.startsWith('['))
    return false
  try {
    JSON.parse(value)
    return true
  }
  catch {
    return false
  }
}

export function prettyJson(text?: string | null): string {
  const value = (text ?? '').trim()
  if (!value)
    return ''
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  }
  catch {
    return value
  }
}