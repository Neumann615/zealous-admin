import { createServer } from 'node:http'

/**
 * E2E 专用 webhook 接收器：模拟外部告警接收方。
 * /fail 恒返回 500（验证通知失败与重发），/ok 恒返回 200（验证重发成功），
 * /received 供用例读取实际收到的 payload，/reset 清空记录。
 */
const PORT = Number(process.env.E2E_SINK_PORT || 3999)

interface Received {
  path: string
  at: number
  body: string
}

const received: Received[] = []

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (req.method === 'GET' && url.pathname === '/received') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(received))
    return
  }
  if (req.method === 'POST' && url.pathname === '/reset') {
    received.length = 0
    res.end('ok')
    return
  }

  let raw = ''
  req.on('data', (chunk) => {
    raw += chunk
  })
  req.on('end', () => {
    received.push({ path: url.pathname, at: Date.now(), body: raw })
    if (url.pathname === '/fail') {
      res.statusCode = 500
      res.end('boom')
      return
    }
    res.statusCode = 200
    res.end('ok')
  })
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[e2e sink] listening on ${PORT}`)
})