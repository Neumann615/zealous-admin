import cors from 'cors'
import express from 'express'
import authRoutes from './modules/auth/auth.routes'
import userRoutes from './modules/user/user.routes'
import roleRoutes from './modules/role/role.routes'
import menuRoutes from './modules/menu/menu.routes'
import dictRoutes from './modules/dict/dict.routes'
import formRoutes from './modules/form/form.routes'
import formDataRoutes from './modules/formData/formData.routes'
import metadataRoutes from './modules/metadata'
import mcpRoutes from './modules/mcp/mcp.routes'
import { errorHandler } from './middleware/error'

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
app.use('/', dictRoutes)
app.use('/', formRoutes)
app.use('/', formDataRoutes)
app.use('/metadata', metadataRoutes)

app.get('/', (_req, res) => {
  res.json({ message: 'Zealous Admin Service is running!' })
})

app.use(errorHandler)

export default app
