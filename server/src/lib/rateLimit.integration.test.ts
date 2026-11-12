import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'

import { createPostgresRateLimitStore } from './rateLimit.ts'

describe.skipIf(!commerceTestUrl)('giới hạn request dùng chung qua PostgreSQL', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  beforeAll(async () => { t = await startCommerceTest() })
  afterAll(async () => { await t?.stop() })

  it('đếm tăng dần, không mất lượt khi gọi song song, hết cửa sổ thì đặt lại', async () => {
    const store = createPostgresRateLimitStore(t.db)
    const key = `test:${randomUUID()}`

    expect((await store.hit(key, 60_000)).count).toBe(1)
    // 10 request song song (như nhiều instance) → đúng 11 lượt, không ghi đè lẫn nhau.
    const counts = await Promise.all(Array.from({ length: 10 }, () => store.hit(key, 60_000)))
    expect(Math.max(...counts.map((c) => c.count))).toBe(11)
    expect(new Set(counts.map((c) => c.count)).size).toBe(10)

    const shortKey = `test:${randomUUID()}`
    await store.hit(shortKey, 50)
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect((await store.hit(shortKey, 50)).count).toBe(1)
  })
})
