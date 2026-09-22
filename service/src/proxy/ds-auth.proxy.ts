const BASE_URL = process.env.DS_AUTH_API_BASE || 'http://ds-base-auth-api.uat.svc.test.local'
const PREFIX = process.env.DS_AUTH_API_PREFIX || '/ds/base/ds-base-auth'

interface ProxyOptions {
  method?: 'GET' | 'POST'
  path: string
  data?: unknown
  params?: Record<string, string>
  token?: string
}

interface ProxyResponse<T = any> {
  code: number
  msg: string
  data: T
  traceId: string
}

export async function dsAuthRequest<T = any>(options: ProxyOptions): Promise<ProxyResponse<T>> {
  const url = new URL(`${PREFIX}${options.path}`, BASE_URL)
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value)
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options.token) {
    headers.Authorization = options.token
  }

  const res = await fetch(url.toString(), {
    method: options.method || 'POST',
    headers,
    body: options.data ? JSON.stringify(options.data) : undefined,
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`ds-base-auth API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
