import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'

import type { Db } from '@/db/client.ts'
import type { SepayConfig } from '@/modules/payments/sepay.ts'
import { paymentWebhookRoutes } from '@/modules/payments/routes.ts'
import { AppError, fail, ok } from '@/lib/http.ts'
import type { Mailer } from '@/lib/mailer.ts'
import { createDiskStorage, type ObjectStorage } from '@/lib/storage.ts'
import { cartRoutes } from '@/modules/cart/routes.ts'
import { favoriteRoutes } from '@/modules/favorites/routes.ts'
import { uploadFileRoutes, uploadRoutes } from '@/modules/uploads/routes.ts'
import { userRoutes } from '@/modules/users/routes.ts'
import { inboxRoutes } from '@/modules/inbox/routes.ts'
import { feedbackRoutes } from '@/modules/feedback/routes.ts'
import { aiRoutes } from '@/modules/ai/routes.ts'
import { adminRoutes } from '@/modules/admin/routes.ts'
import type { ChatProvider } from '@/modules/ai/provider.ts'
import { authRoutes } from '@/modules/auth/routes.ts'
import type { AuthRepository } from '@/modules/auth/repository.ts'
import { createAuthService } from '@/modules/auth/service.ts'
import { catalogRoutes } from '@/modules/catalog/routes.ts'
import type { CatalogService } from '@/modules/catalog/service.ts'
import { orderRoutes } from '@/modules/orders/routes.ts'
import { reviewRoutes } from '@/modules/reviews/routes.ts'

export type AppDeps = {
  authRepository: AuthRepository
  /** Gửi email (mã đặt lại mật khẩu). Mặc định in ra console. */
  mailer?: Mailer
  catalog?: CatalogService
  /** Model cho trợ lý AI; bỏ trống thì /ai/* vẫn chạy nhưng gửi tin trả 503 AI_UNAVAILABLE. */
  ai?: ChatProvider
  aiMessagesPerHour?: number
  commerce?: {
    db: Db
    allowDemoCheckout: boolean
    /** Nhận thẻ demo (không thu tiền) khi đặt hàng. Chỉ test tự động bật; app chạy thật luôn tắt. */
    demoCards?: boolean
    /** Thư mục lưu ảnh upload trên ổ đĩa (và phục vụ ảnh cũ ở `/uploads`). Mặc định `./uploads`. */
    uploadDir?: string
    /** Nơi lưu ảnh mới; mặc định ổ đĩa `uploadDir`. Production dùng Supabase Storage. */
    storage?: ObjectStorage
    /** Bật thanh toán chuyển khoản qua SePay khi có cấu hình. */
    sepay?: SepayConfig
  }
  accessSecret: string
  accessTtlSeconds: number
  refreshTtlSeconds: number
  corsOrigins: string[]
  /** Dev: chấp nhận mọi `http://localhost:<cổng>` (Expo web có thể chạy ở cổng khác 8081). */
  allowLocalhostOrigins?: boolean
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
    mailer: deps.mailer,
  })

  const app = new Hono()

  app.use('*', requestId())
  if (deps.logRequests) app.use('*', logger())
  app.use('*', secureHeaders())
  // App native không gửi Origin nên không bị CORS chặn; danh sách này chỉ dành cho Expo web.
  const localhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
  const allowOrigin = (origin: string) =>
    deps.corsOrigins.includes(origin) || (deps.allowLocalhostOrigins && localhost.test(origin)) ? origin : null
  app.use('*', cors({ origin: allowOrigin, allowHeaders: ['Content-Type', 'Authorization'], maxAge: 600 }))
  const jsonLimit = bodyLimit({ maxSize: 1024 * 1024, onError: () => { throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn') } })
  // Upload ảnh có giới hạn riêng (5MB) trong route của nó.
  app.use('/api/*', (c, next) => (c.req.path === '/api/v1/uploads' ? next() : jsonLimit(c, next)))

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
  api.get('/', (c) => ok(c, { name: 'market-api', version: 'v1' }))
  api.route('/auth', authRoutes(authService, { accessSecret: deps.accessSecret, rateLimitMax: deps.authRateLimitMax }))
  if (deps.catalog) api.route('/', catalogRoutes(deps.catalog))
  const uploadDir = deps.commerce?.uploadDir ?? 'uploads'
  if (deps.commerce) {
    api.route('/', uploadRoutes(deps.commerce.db, deps.accessSecret, deps.commerce.storage ?? createDiskStorage(uploadDir)))
    api.route('/', userRoutes(deps.commerce.db, deps.accessSecret))
    api.route('/', inboxRoutes(deps.commerce.db, deps.accessSecret))
    api.route('/', feedbackRoutes(deps.commerce.db, deps.accessSecret))
    api.route('/', cartRoutes(deps.commerce.db, deps.accessSecret))
    api.route('/', favoriteRoutes(deps.commerce.db, deps.accessSecret))
    api.route('/', orderRoutes(deps.commerce.db, deps.accessSecret, { allowDemo: deps.commerce.allowDemoCheckout, demoCards: deps.commerce.demoCards, sepay: deps.commerce.sepay }))
    if (deps.commerce.sepay) api.route('/', paymentWebhookRoutes(deps.commerce.db, deps.commerce.sepay))
    api.route('/', adminRoutes(deps.commerce.db, deps.accessSecret, deps.commerce.sepay))
    api.route('/', aiRoutes({ db: deps.commerce.db, accessSecret: deps.accessSecret, provider: deps.ai, catalog: deps.catalog, messagesPerHour: deps.aiMessagesPerHour }))
    api.route('/', reviewRoutes(deps.commerce.db, deps.accessSecret, deps.commerce.allowDemoCheckout))
  }

  app.route('/api/v1', api)
  if (deps.commerce) app.route('/uploads', uploadFileRoutes(uploadDir))

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
