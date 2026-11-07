import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'

import { AppError, fail, ok } from './lib/http.ts'
import { authRoutes } from './modules/auth/routes.ts'
import type { AuthRepository } from './modules/auth/repository.ts'
import { createAuthService } from './modules/auth/service.ts'
import { PLANNED_ENDPOINTS, plannedRoutes } from './modules/planned.ts'

export type AppDeps = {
  authRepository: AuthRepository
  accessSecret: string
  accessTtlSeconds: number
  refreshTtlSeconds: number
  corsOrigins: string[]
  /** Kiểm tra kết nối DB cho /healthz; bỏ trống trong unit test. */
  checkDatabase?: () => Promise<void>
  logRequests?: boolean
  authRateLimitMax?: number
}

/** Dựng Hono app mà không mở cổng, để test gọi thẳng qua `app.request()`. */
export function buildApp(deps: AppDeps) {
  const authService = createAuthService(deps.authRepository, {
    accessSecret: deps.accessSecret,
    accessTtlSeconds: deps.accessTtlSeconds,
    refreshTtlSeconds: deps.refreshTtlSeconds,
  })

  const app = new Hono()

  app.use('*', requestId())
  if (deps.logRequests) app.use('*', logger())
  app.use('*', secureHeaders())
  // App native không gửi Origin nên không bị CORS chặn; danh sách này chỉ dành cho Expo web.
  app.use('*', cors({ origin: deps.corsOrigins, allowHeaders: ['Content-Type', 'Authorization'], maxAge: 600 }))
  app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024, onError: () => { throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn') } }))

  app.get('/healthz', async (c) => {
    if (deps.checkDatabase) {
      try {
        await deps.checkDatabase()
      } catch {
        throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Không kết nối được cơ sở dữ liệu')
      }
    }
    return ok(c, { status: 'ok' })
  })

  const api = new Hono()
  api.get('/', (c) => ok(c, { name: 'market-api', version: 'v1', planned: PLANNED_ENDPOINTS }))
  // Thứ tự quan trọng: router đã triển khai mount trước router placeholder.
  api.route('/auth', authRoutes(authService, { accessSecret: deps.accessSecret, rateLimitMax: deps.authRateLimitMax }))
  api.route('/', plannedRoutes(deps.accessSecret))

  app.route('/api/v1', api)

  app.notFound((c) => fail(c, new AppError(404, 'NOT_FOUND', `Không tìm thấy ${c.req.method} ${c.req.path}`)))
  app.onError((error, c) => {
    if (error instanceof AppError) return fail(c, error)
    if (error instanceof HTTPException) {
      // Ví dụ: body JSON sai cú pháp
      return fail(c, new AppError(error.status, 'BAD_REQUEST', error.message || 'Yêu cầu không hợp lệ'))
    }
    console.error(`[${c.get('requestId')}]`, error)
    return fail(c, new AppError(500, 'INTERNAL_ERROR', 'Đã có lỗi xảy ra, vui lòng thử lại'))
  })

  return app
}
