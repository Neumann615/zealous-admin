import cors from 'cors'
import express from 'express'
import { errorHandler } from './middleware/error'
import authRoutes from './modules/auth/auth.routes'
import userRoutes from './modules/auth/user.routes'
import roleRoutes from './modules/auth/role.routes'
import menuRoutes from './modules/auth/menu.routes'
import formRoutes from './modules/form/form.routes'
import formDataRoutes from './modules/form/formData.routes'
import mcpRoutes from './modules/mcp/mcp.routes'
import metadataRoutes from './modules/metadata'

const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

app.use('/', mcpRoutes)
app.use('/', authRoutes)
app.use('/', userRoutes)
app.use('/', roleRoutes)
app.use('/', menuRoutes)
app.use('/metadata', metadataRoutes)
app.use('/', formRoutes)
app.use('/', formDataRoutes)

app.get('/', (_req, res) => {
  res.json({ message: 'Zealous Admin Service is running!' })
})

app.use(errorHandler)

export default app
