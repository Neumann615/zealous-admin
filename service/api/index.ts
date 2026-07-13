import { handle } from '@hono/node-server/vercel'
import app from '../src/app'

export default handle(app)
