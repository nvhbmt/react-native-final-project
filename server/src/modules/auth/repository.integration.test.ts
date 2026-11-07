import { fileURLToPath } from 'node:url'

import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../../app.ts'
import { createDb } from '../../db/client.ts'
import { TEST_SECRET } from '../../test/helpers.ts'
import { createDrizzleAuthRepository } from './repository.ts'

// Chạy với Postgres thật: INTEGRATION=1 DATABASE_URL=postgres://market:market@localhost:5435/market_test
// Test xoá sạch dữ liệu, nên tên database bắt buộc chứa "test".
const url = process.env.DATABASE_URL ?? ''
const enabled = process.env.INTEGRATION === '1'
if (enabled && !/test/.test(new URL(url).pathname)) {
  throw new Error('Integration test chỉ chạy trên database có tên chứa "test"')
}

describe.skipIf(!enabled)('auth với Postgres', () => {
  const { db, close } = enabled ? createDb(url) : ({} as ReturnType<typeof createDb>)
  const app = enabled
    ? buildApp({
        authRepository: createDrizzleAuthRepository(db),
        accessSecret: TEST_SECRET,
        accessTtlSeconds: 900,
        refreshTtlSeconds: 3600,
        corsOrigins: [],
        authRateLimitMax: 1000,
      })
    : undefined!

  const post = async (path: string, body: unknown) => {
    const res = await app.request(`/api/v1${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: res.status, body: (await res.json()) as any }
  }

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)) })
  })
  beforeEach(async () => {
    await db.execute(sql`truncate table refresh_tokens, users cascade`)
  })
  afterAll(async () => {
    await close()
  })

  it('đăng ký, trùng email, đăng nhập, xoay vòng và phát hiện dùng lại token', async () => {
    const user = { email: 'it@example.com', password: 'password-123', fullName: 'Integration' }
    expect((await post('/auth/register', user)).status).toBe(201)
    expect((await post('/auth/register', { ...user, email: 'IT@example.com' })).status).toBe(409)

    const login = await post('/auth/login', user)
    expect(login.status).toBe(200)
    const original = login.body.data.tokens.refreshToken

    const rotated = await post('/auth/refresh', { refreshToken: original })
    expect(rotated.status).toBe(200)

    const reuse = await post('/auth/refresh', { refreshToken: original })
    expect(reuse.body.error.code).toBe('REFRESH_TOKEN_REUSED')
    expect((await post('/auth/refresh', { refreshToken: rotated.body.data.tokens.refreshToken })).status).toBe(401)
  })

  it('hai request refresh song song chỉ một bên thành công', async () => {
    const reg = await post('/auth/register', { email: 'race@example.com', password: 'password-123', fullName: 'Race' })
    const token = reg.body.data.tokens.refreshToken
    const results = await Promise.all([post('/auth/refresh', { refreshToken: token }), post('/auth/refresh', { refreshToken: token })])
    expect(results.map((r) => r.status).sort()).toEqual([200, 401])
  })
})
