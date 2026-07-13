import { Hono } from 'hono'
import { cors } from 'hono/cors'
import adminRoutes from './routes/admin'
import roleRoutes from './routes/role'
import menuRoutes from './routes/menu'
import brandRoutes from './routes/brand'
import categoryRoutes from './routes/category'
import productRoutes from './routes/product'
import orderRoutes from './routes/order'
import marketingRoutes from './routes/marketing'

const app = new Hono()

app.use('*', cors())

app.get('/api/health', (c) => c.json({ ok: true }))

app.route('/', adminRoutes)
app.route('/', roleRoutes)
app.route('/', menuRoutes)
app.route('/', brandRoutes)
app.route('/', categoryRoutes)
app.route('/product', productRoutes)
app.route('/', orderRoutes)
app.route('/', marketingRoutes)

export default app
