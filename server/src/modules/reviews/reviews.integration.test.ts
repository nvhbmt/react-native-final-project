import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import { inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createDb } from '@/db/client.ts'
import { users } from '@/db/schema.ts'
import { createDrizzleAuthRepository } from '@/modules/auth/repository.ts'
import { seedCatalog } from '@/modules/catalog/seed.ts'
import { createTestApp } from '@/test/helpers.ts'

const url = process.env.REVIEWS_TEST_DATABASE_URL
if (url && !new URL(url).pathname.endsWith('_reviews_test')) {
  throw new Error('Review tests require a database ending in _reviews_test.')
}

describe.skipIf(!url)('orders and reviews with PostgreSQL', () => {
  let connection: ReturnType<typeof createDb>
  let call: ReturnType<typeof createTestApp>['call']
  const userIds: string[] = []

  beforeAll(async () => {
    connection = createDb(url!)
    await migrate(connection.db, { migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)) })
    await seedCatalog(connection.db)
    call = createTestApp({
      authRepository: createDrizzleAuthRepository(connection.db),
      commerce: { db: connection.db, allowDemoCheckout: true },
    }).call
  })

  afterAll(async () => {
    if (!connection) return
    try {
      if (userIds.length) await connection.db.delete(users).where(inArray(users.id, userIds))
    } finally {
      await connection.close()
    }
  })

  async function register(fullName: string) {
    const result = await call('POST', '/auth/register', {
      body: { email: `${randomUUID()}@example.test`, password: 'test-password-123', fullName },
    })
    expect(result.status).toBe(201)
    userIds.push(result.body.data.user.id)
    return result.body.data.tokens.accessToken as string
  }

  const checkout = (productId: string) => ({
    requestId: randomUUID(), paymentMethod: 'pm_visa', items: [{ productId, quantity: 2 }],
  })

  it('computes prices on the server and replays checkout without duplicating private orders', async () => {
    const buyer = await register('Buyer')
    const other = await register('Other customer')
    const body = { ...checkout('banana'), voucher: 'SALE10', total: 0 }
    const responses = await Promise.all([
      call('POST', '/orders', { body, token: buyer }),
      call('POST', '/orders', { body, token: buyer }),
    ])
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 201])
    const order = responses[0]!.body.data
    expect(responses[1]!.body.data.id).toBe(order.id)
    expect(order).toMatchObject({ subtotal: 1.22, discount: 0.12, tax: 0.11, total: 1.21, paymentMode: 'demo' })
    expect((await call('GET', `/orders/${order.id}`, { token: buyer })).body.data.id).toBe(order.id)
    expect((await call('GET', `/orders/${order.id}`, { token: other })).status).toBe(404)
    expect((await call('POST', '/orders', { body: { ...body, paymentMethod: 'pm_master' }, token: buyer })).status).toBe(409)
    expect((await call('POST', '/orders', { body: checkout('vuori-strato-tech-tee-black'), token: buyer })).body.error.code).toBe('INVALID_VARIANT')
  })

  it('blocks guests, wrong orders and duplicates, and publishes an eligible review', async () => {
    const productPath = '/products/banana/reviews'
    const buyer = await register('Verified Demo Buyer')
    const other = await register('Non-buyer')
    const body = { rating: 5, content: '  Fresh bananas.  ' }
    expect((await call('POST', productPath, { body })).status).toBe(401)
    expect((await call('POST', productPath, { body, token: buyer })).status).toBe(403)

    const order = (await call('POST', '/orders', { body: checkout('banana'), token: buyer })).body.data
    expect((await call('GET', `${productPath}/eligibility?orderId=${order.id}`, { token: other })).body.data.eligible).toBe(false)
    expect((await call('POST', productPath, { body: { ...body, orderId: order.id }, token: other })).status).toBe(403)
    expect((await call('POST', '/products/pear/reviews', { body: { ...body, orderId: order.id }, token: buyer })).status).toBe(403)
    expect((await call('POST', productPath, { body: { ...body, rating: 6 }, token: buyer })).status).toBe(400)
    expect((await call('GET', `${productPath}/eligibility`, { token: buyer })).body.data.eligible).toBe(true)

    const writes = await Promise.all([
      call('POST', productPath, { body: { ...body, orderId: order.id }, token: buyer }),
      call('POST', productPath, { body, token: buyer }),
    ])
    expect(writes.map(({ status }) => status).sort()).toEqual([201, 409])
    expect((await call('GET', `${productPath}/eligibility`, { token: buyer })).body.data.reason).toBe('already_reviewed')
    const listing = await call('GET', productPath)
    expect(listing.body.data.summary).toEqual({ rating: 5, reviewCount: 1, breakdown: [1, 0, 0, 0, 0] })
    expect(listing.body.data.items[0]).toMatchObject({ author: 'Verified Demo Buyer', content: 'Fresh bananas.', purchaseMode: 'demo' })
    expect(listing.body.data.items[0]).not.toHaveProperty('orderId')
    expect(listing.body.data.items[0]).not.toHaveProperty('email')
  })

  it('filters by stars and pages without changing the full product summary', async () => {
    const path = '/products/orange/reviews'
    for (const rating of [3, 5]) {
      const token = await register(`Buyer ${rating}`)
      expect((await call('POST', '/orders', { body: checkout('orange'), token })).status).toBe(201)
      expect((await call('POST', path, { body: { rating, content: 'Orange review' }, token })).status).toBe(201)
    }
    const first = (await call('GET', `${path}?limit=1`)).body.data
    const second = (await call('GET', `${path}?limit=1&cursor=${first.nextCursor}`)).body.data
    expect(first.items[0].id).not.toBe(second.items[0].id)
    expect(second.nextCursor).toBeNull()
    const filtered = (await call('GET', `${path}?rating=3`)).body.data
    expect(filtered.items.map(({ rating }: { rating: number }) => rating)).toEqual([3])
    expect(filtered.summary).toEqual({ rating: 4, reviewCount: 2, breakdown: [1, 0, 1, 0, 0] })
  })

  it('disallows demo checkout and demo proof of purchase when the demo flag is off', async () => {
    const token = await register('Demo customer')
    const body = checkout('pear')
    expect((await call('POST', '/orders', { body, token })).status).toBe(201)
    const secure = createTestApp({ commerce: { db: connection.db, allowDemoCheckout: false } }).call
    expect((await secure('POST', '/orders', { body, token })).status).toBe(503)
    expect((await secure('POST', '/products/pear/reviews', { body: { rating: 5, content: 'Pear review' }, token })).status).toBe(403)
  })
})
