import { verify } from 'hono/jwt'
import { Context, Next } from 'hono'
import { Bindings, Variables } from './types'

export const authMiddleware = async (c: Context<{ Bindings: Bindings, Variables: Variables }>, next: Next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  
  const token = authHeader.split(' ')[1]
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
    
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as any
    c.set('user', payload)
    await next()
  } catch (e) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}
