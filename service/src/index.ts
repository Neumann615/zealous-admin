import app from './app'
import { initDb } from './db'
import 'dotenv/config'

initDb()

const port = Number(process.env.PORT) || 3001

app.listen(port, () => {
  console.log(`🚀 zealous-admin-service running at http://localhost:${port}`)
})
