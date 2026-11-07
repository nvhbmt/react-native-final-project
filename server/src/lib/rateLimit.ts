import type { MiddlewareHandler } from 'hono'

import { AppError } from './http.ts'

/**
 * Giới hạn số request theo cửa sổ cố định, lưu trong bộ nhớ tiến trình.
 * Đủ cho một instance; khi chạy nhiều instance cần chuyển sang Redis.
 */
export function rateLimit(options: {
  windowMs: number
  max: number
  key: (c: Parameters<MiddlewareHandler>[0]) => string
}): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return async (c, next) => {
    const now = Date.now()
    const key = options.key(c)
    const entry = hits.get(key)

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs })
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
      }
    } else if (++entry.count > options.max) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      throw new AppError(429, 'RATE_LIMITED', 'Quá nhiều yêu cầu, vui lòng thử lại sau')
    }
    await next()
  }
}
