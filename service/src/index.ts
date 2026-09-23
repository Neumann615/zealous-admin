import app from './app'
import { initDb } from './db'
import { shutdownMonitor, startMonitorRuntime } from './modules/monitor'
import { assertJwtSecretConfigured } from './lib/jwt'
import 'dotenv/config'

initDb()
assertJwtSecretConfigured()
startMonitorRuntime()

const port = Number(process.env.PORT) || 3508

const server = app.listen(port, () => {
  console.log(`🚀 zealous-admin-service running at http://localhost:${port}`)
})

function shutdown(signal: string) {
  console.log(`[service] ${signal} received, flushing monitor queue...`)
  shutdownMonitor()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))