import { Hono } from 'hono'
import { getConnInfo } from '@hono/node-server/conninfo'

import { ok } from '@/lib/http.ts'
import { rateLimit } from '@/lib/rateLimit.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth, type AuthVariables } from '@/middleware/auth.ts'
import { changePasswordSchema, forgotPasswordSchema, loginSchema, refreshSchema, registerSchema, resetPasswordSchema } from './schemas.ts'
import type { AuthService } from './service.ts'

function clientIp(c: Parameters<typeof getConnInfo>[0]): string {
  try {
    return getConnInfo(c).remote.address ?? 'unknown'
  } catch {
    // Khi test bằng app.request() không có socket thật.
    return 'local'
  }
}

export function authRoutes(service: AuthService, options: { accessSecret: string; rateLimitMax?: number }) {
  const app = new Hono<{ Variables: AuthVariables }>()
  const auth = requireAuth(options.accessSecret)
  const credentialLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: options.rateLimitMax ?? 20,
    key: (c) => `${c.req.path}:${clientIp(c)}`,
  })

  return app
    .post('/register', credentialLimit, validate('json', registerSchema), async (c) => {
      return ok(c, await service.register(c.req.valid('json'), c.req.header('User-Agent')), 201)
    })
    .post('/login', credentialLimit, validate('json', loginSchema), async (c) => {
      return ok(c, await service.login(c.req.valid('json'), c.req.header('User-Agent')))
    })
    .post('/refresh', validate('json', refreshSchema), async (c) => {
      return ok(c, await service.refresh(c.req.valid('json').refreshToken, c.req.header('User-Agent')))
    })
    .post('/logout', validate('json', refreshSchema), async (c) => {
      await service.logout(c.req.valid('json').refreshToken)
      return ok(c, { loggedOut: true })
    })
    .post('/logout-all', auth, async (c) => {
      await service.logoutAll(c.var.auth.sub)
      return ok(c, { loggedOut: true })
    })
    .get('/me', auth, async (c) => {
      return ok(c, await service.me(c.var.auth.sub))
    })
    .post('/change-password', auth, validate('json', changePasswordSchema), async (c) => {
      return ok(c, await service.changePassword(c.var.auth.sub, c.req.valid('json'), c.req.header('User-Agent')))
    })
    .post('/forgot-password', credentialLimit, validate('json', forgotPasswordSchema), async (c) => {
      await service.forgotPassword(c.req.valid('json').email)
      return ok(c, { sent: true })
    })
    .post('/reset-password', credentialLimit, validate('json', resetPasswordSchema), async (c) => {
      return ok(c, await service.resetPassword(c.req.valid('json'), c.req.header('User-Agent')))
    })
}
