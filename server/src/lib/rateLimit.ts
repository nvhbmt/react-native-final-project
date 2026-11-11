import { sql } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'

import type { Db } from '@/db/client.ts'

import { AppError } from './http.ts'

/** Đếm số lần gọi trong cửa sổ cố định; trả số lần đã gọi (kể cả lần này) và thời điểm cửa sổ hết hạn. */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>
}

/** Bộ đếm trong bộ nhớ tiến trình — đủ cho một instance và cho test. */
export function createMemoryRateLimitStore(): RateLimitStore {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return {
    async hit(key, windowMs) {
      const now = Date.now()
      const entry = hits.get(key)
      if (!entry || entry.resetAt <= now) {
        const fresh = { count: 1, resetAt: now + windowMs }
        hits.set(key, fresh)
        if (hits.size > 10_000) {
          for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
        }
        return fresh
      }
      entry.count++
      return entry
    },
  }
}

/**
 * Bộ đếm dùng chung qua PostgreSQL (bảng `rate_limits`) — nhiều instance API dùng chung một hạn mức.
 * Một câu UPSERT nguyên tử: hết cửa sổ thì đặt lại về 1, còn cửa sổ thì cộng thêm.
 */
export function createPostgresRateLimitStore(db: Db): RateLimitStore {
  return {
    async hit(key, windowMs) {
      const rows = await db.execute<{ count: number; reset_at: Date }>(sql`
        insert into rate_limits (key, count, reset_at)
        values (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}))
        on conflict (key) do update set
          count = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
          reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end
        returning count, reset_at`)
      // Dọn bản ghi hết hạn thỉnh thoảng (≈1% request) để bảng không phình.
      if (Math.random() < 0.01) await db.execute(sql`delete from rate_limits where reset_at < now()`).catch(() => undefined)
      const row = rows[0]!
      return { count: Number(row.count), resetAt: new Date(row.reset_at).getTime() }
    },
  }
}

// Mặc định bộ nhớ; server production gọi `useRateLimitStore(createPostgresRateLimitStore(db))` lúc khởi động.
let defaultStore: RateLimitStore = createMemoryRateLimitStore()
export function useRateLimitStore(store: RateLimitStore) {
  defaultStore = store
}

/**
 * Giới hạn số request theo cửa sổ cố định. Store đọc lúc có request (không phải lúc tạo middleware),
 * nên đổi store khi khởi động vẫn áp dụng cho route đã dựng.
 */
export function rateLimit(options: {
  windowMs: number
  max: number
  key: (c: Parameters<MiddlewareHandler>[0]) => string
  store?: RateLimitStore
}): MiddlewareHandler {
  const ownStore = options.store
  return async (c, next) => {
    const { count, resetAt } = await (ownStore ?? defaultStore).hit(options.key(c), options.windowMs)
    if (count > options.max) {
      c.header('Retry-After', String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))))
      throw new AppError(429, 'RATE_LIMITED', 'Quá nhiều yêu cầu, vui lòng thử lại sau')
    }
    await next()
  }
}
