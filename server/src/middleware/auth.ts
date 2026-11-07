import { createMiddleware } from 'hono/factory'

import { AppError } from '@/lib/http.ts'
import { verifyAccessToken, type AccessTokenClaims } from '@/lib/tokens.ts'

export type AuthVariables = { auth: AccessTokenClaims }

/** Bắt buộc header `Authorization: Bearer <accessToken>`; gắn claims vào `c.var.auth`. */
export function requireAuth(secret: string) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const header = c.req.header('Authorization')
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Thiếu access token')

    try {
      c.set('auth', await verifyAccessToken(token, secret))
    } catch {
      // Client nhận mã này thì gọi /auth/refresh rồi thử lại request.
      throw new AppError(401, 'TOKEN_EXPIRED', 'Access token không hợp lệ hoặc đã hết hạn')
    }
    await next()
  })
}

export function requireRole(role: AccessTokenClaims['role']) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    if (c.var.auth.role !== role) throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
    await next()
  })
}
