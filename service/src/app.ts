import cors from 'cors'
import express from 'express'
import adminRoutes from './routes/admin'
import dictRoutes from './routes/dict'
import menuRoutes from './routes/menu'
import roleRoutes from './routes/role'

const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

app.use('/', adminRoutes)
app.use('/', roleRoutes)
app.use('/', menuRoutes)
app.use('/', dictRoutes)

app.get('/', (_req, res) => {
  res.json({ message: 'Zealous Admin Service is running!' })
})

export default app
