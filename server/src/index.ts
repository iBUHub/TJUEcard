import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import rooms from './routes/rooms'
import agent from './routes/agent'
import { Bindings, Variables } from './types'

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.use('*', cors())

app.get('/', (c) => {
  return c.text('TJUEcard Server is running!')
})

app.route('/api/auth', auth)
app.route('/api/rooms', rooms)
app.route('/api/agent', agent)

export default app
