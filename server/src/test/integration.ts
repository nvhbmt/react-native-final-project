import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import { inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { expect } from 'vitest'

import type { AppDeps } from '@/app.ts'
import { createDb } from '@/db/client.ts'
import { users } from '@/db/schema.ts'
import { createDrizzleAuthRepository } from '@/modules/auth/repository.ts'
import { seedCatalog } from '@/modules/catalog/seed.ts'
import { createTestApp } from './helpers.ts'

/**
 * Integration test cho các module thương mại (giỏ, đơn, thanh toán, yêu thích...).
 * DB riêng, tên bắt buộc kết thúc bằng `_commerce_test`:
 *   docker compose exec db createdb -U market market_commerce_test
 *   COMMERCE_TEST_DATABASE_URL=postgres://market:market@localhost:5435/market_commerce_test npm test
 */
export const commerceTestUrl = process.env.COMMERCE_TEST_DATABASE_URL
if (commerceTestUrl && !new URL(commerceTestUrl).pathname.endsWith('_commerce_test')) {
  throw new Error('Commerce integration tests require a database ending in _commerce_test.')
}

export async function startCommerceTest(overrides: (db: ReturnType<typeof createDb>['db']) => Partial<AppDeps> = () => ({})) {
  const connection = createDb(commerceTestUrl!)
  await migrate(connection.db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) })
  await seedCatalog(connection.db)
  const test = createTestApp({
    authRepository: createDrizzleAuthRepository(connection.db),
    commerce: { db: connection.db, allowDemoCheckout: true },
    ...overrides(connection.db),
  })
  const userIds: string[] = []

  async function register(fullName = 'Test user') {
    const email = `${randomUUID()}@example.test`
    const result = await test.call('POST', '/auth/register', { body: { email, password: 'test-password-123', fullName } })
    expect(result.status).toBe(201)
    userIds.push(result.body.data.user.id)
    return { token: result.body.data.tokens.accessToken as string, id: result.body.data.user.id as string, email }
  }

  async function stop() {
    try {
      if (userIds.length) await connection.db.delete(users).where(inArray(users.id, userIds))
    } finally {
      await connection.close()
    }
  }

  return { ...test, db: connection.db, register, stop }
}
