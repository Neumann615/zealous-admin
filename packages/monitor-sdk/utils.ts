const UID_KEY = 'za_monitor_uid'

function randomText(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < length; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

/** 匿名访客 id：用于 UV 去重，持久化在 localStorage */
export function getUid(): string {
  try {
    const cached = window.localStorage.getItem(UID_KEY)
    if (cached)
      return cached
    const uid = `u-${Date.now().toString(36)}-${randomText(6)}`
    window.localStorage.setItem(UID_KEY, uid)
    return uid
  }
  catch {
    return `u-${randomText(8)}`
  }
}

export function createBatchId(appId: string): string {
  return `${appId}-${Date.now()}-${randomText(8)}`
}

export function truncate(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null)
    return undefined
  const text = typeof value === 'string' ? value : safeStringify(value)
  if (text === undefined)
    return undefined
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function safeStringify(value: unknown): string | undefined {
  if (typeof value === 'string')
    return value
  try {
    return JSON.stringify(value)
  }
  catch {
    return String(value)
  }
}

/** 发生页面：SPA 下用 pathname + search，避免 hash 噪声 */
export function currentPage(): string {
  const { pathname, search } = window.location
  return `${pathname}${search}`
}

export function stackOf(error: unknown, max = 4000): string | undefined {
  if (!error)
    return undefined
  if (error instanceof Error)
    return truncate(error.stack || `${error.name}: ${error.message}`, max)
  return truncate(safeStringify(error), max)
}

export function messageOf(error: unknown): string {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error
  return truncate(safeStringify(error), 200) ?? '未知异常'
}

export function matchesIgnore(url: string, patterns: Array<string | RegExp>): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === 'string')
      return url.includes(pattern)
    return pattern.test(url)
  })
}

/** 去掉查询串，作为接口聚合维度，避免同一接口因参数不同被拆散 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.pathname
  }
  catch {
    return url.split('?')[0] ?? url
  }
}

export function findClickLabel(target: EventTarget | null): string {
  let node = target as HTMLElement | null
  let depth = 0
  while (node && depth < 5) {
    const aria = node.getAttribute?.('aria-label')
    if (aria)
      return truncate(aria, 80) ?? '点击'
    const title = node.getAttribute?.('title')
    if (title)
      return truncate(title, 80) ?? '点击'
    const text = (node.textContent ?? '').trim()
    if (text)
      return truncate(text.replace(/\s+/g, ' '), 80) ?? '点击'
    node = node.parentElement
    depth++
  }
  return '点击'
}

export function cssPath(target: EventTarget | null): string {
  const node = target as HTMLElement | null
  if (!node || node.nodeType !== 1)
    return ''
  const tag = node.tagName.toLowerCase()
  const id = node.id ? `#${node.id}` : ''
  const cls = typeof node.className === 'string' && node.className.trim()
    ? `.${node.className.trim().split(/\s+/).slice(0, 2).join('.')}`
    : ''
  return `${tag}${id}${cls}`
}