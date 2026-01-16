import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { hashSync, compareSync } from 'bcryptjs'
import { Bindings, Variables } from '../types'

const auth = new Hono<{ Bindings: Bindings, Variables: Variables }>()

auth.post('/register', async (c) => {
  const { email, password } = await c.req.json()
  
  if (!email || !password) return c.json({ error: 'Missing email or password' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'User already exists' }, 409)

  const passwordHash = hashSync(password, 10)
  
  try {
    const res = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)'
    ).bind(email, passwordHash).run()

    if (res.success) {
      return c.json({ message: 'User registered successfully' }, 201)
    } else {
      return c.json({ error: 'Failed to register' }, 500)
    }
  } catch (e) {
      return c.json({ error: String(e) }, 500)
  }
})

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as any
  
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)
  
  if (!compareSync(password, user.password_hash)) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }
  
  const token = await sign({ id: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, c.env.JWT_SECRET)
  
  return c.json({ token, user: { id: user.id, email: user.email } })
})

export default auth
