import { serve } from '@hono/node-server'
import 'dotenv/config'
import app from './app'

const port = Number(process.env.PORT) || 3001

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 zealous-admin-service running at http://localhost:${info.port}`)
})
