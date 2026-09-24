import process from 'node:process'
import cors from 'cors'
import express from 'express'
import { errorHandler } from './middleware/error'
import { REQUEST_ID_HEADER, requestId } from './middleware/requestId'
import authRoutes from './modules/auth/auth.routes'
import menuRoutes from './modules/auth/menu.routes'
import roleRoutes from './modules/auth/role.routes'
import userRoutes from './modules/auth/user.routes'
import formRoutes from './modules/form/form.routes'
import formDataRoutes from './modules/form/formData.routes'
import formFileRoutes from './modules/form/formFile.routes'
import mcpRoutes from './modules/mcp/mcp.routes'
import metadataRoutes from './modules/metadata'
import monitorRoutes from './modules/monitor'

const app = express()

// 反向代理部署时必须配置 TRUST_PROXY（如 loopback、1 或 CIDR），否则限流会把全部用户聚合到代理 IP
const trustProxy = process.env.TRUST_PROXY
if (trustProxy)
  app.set('trust proxy', trustProxy)

// requestId 需在 cors 之前：预检（OPTIONS）响应也要带上，否则前端读不到
app.use(requestId)
app.use(cors({
  // 采集 SDK 在页面卸载时用 navigator.sendBeacon 兜底上报，浏览器会以 credentials 模式发跨域请求，
  // 此时 Access-Control-Allow-Origin 不能是通配符 *，否则整批日志被静默丢弃
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-File-Name', 'X-File-Type'],
  exposedHeaders: [REQUEST_ID_HEADER],
}))
app.use(express.json())

// 监控采集入口需公开访问，必须在带全局 authMiddleware 的路由之前挂载
app.use('/monitor', monitorRoutes)
app.use('/', mcpRoutes)
app.use('/', authRoutes)
app.use('/', userRoutes)
app.use('/', roleRoutes)
app.use('/', menuRoutes)
app.use('/metadata', metadataRoutes)
app.use('/', formRoutes)
app.use('/', formFileRoutes)
app.use('/', formDataRoutes)

app.get('/', (_req, res) => {
  res.json({ message: 'Zealous Admin Service is running!' })
})

app.use(errorHandler)

export default app
