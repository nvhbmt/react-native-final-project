import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { users } from '@/db/schema.ts'
import { createTestApp } from '@/test/helpers.ts'
import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'

describe.skipIf(!commerceTestUrl)('quản trị giao hàng', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  beforeAll(async () => { t = await startCommerceTest() })
  afterAll(async () => { await t?.stop() })

  const setRole = (id: string, role: 'admin' | 'customer') => t.db.update(users).set({ role }).where(eq(users.id, id))
  const place = (user: { token: string; addressId: string }, productId = 'pear') => t.call('POST', '/orders', {
    token: user.token, body: { requestId: crypto.randomUUID(), paymentMethod: 'pm_visa', addressId: user.addressId, items: [{ productId, quantity: 1 }] },
  })

  it('chỉ admin xem được đơn của mọi khách; thu quyền có hiệu lực ngay', async () => {
    const customer = await t.register('Khách A')
    const admin = await t.register('Quản trị')
    const order = (await place(customer)).body.data

    expect((await t.call('GET', '/admin/orders', { token: customer.token })).body.error.code).toBe('FORBIDDEN')
    expect((await t.call('GET', '/admin/orders', {})).status).toBe(401)

    await setRole(admin.id, 'admin')
    const list = (await t.call('GET', '/admin/orders?fulfillment=processing&limit=50', { token: admin.token })).body.data
    const found = list.items.find((o: { id: string }) => o.id === order.id)
    expect(found).toMatchObject({ customer: { id: customer.id, fullName: 'Khách A', email: customer.email }, fulfillment: 'processing', nextFulfillment: 'shipping' })
    expect(found.shippingAddress).toMatchObject({ recipientName: 'Khách A' })
    expect(list.items.every((o: { fulfillment: string }) => o.fulfillment === 'processing')).toBe(true)
    expect((await t.call('GET', `/admin/orders/${crypto.randomUUID()}`, { token: admin.token })).status).toBe(404)

    // Token cũ vẫn mang role cũ, nhưng API kiểm tra DB nên thu quyền chặn ngay.
    await setRole(admin.id, 'customer')
    expect((await t.call('GET', '/admin/orders', { token: admin.token })).body.error.code).toBe('FORBIDDEN')
  })

  it('chuyển đúng từng bước, ghi người thực hiện, báo khách; chặn nhảy cóc và gửi trùng', async () => {
    const customer = await t.register('Khách B')
    const admin = await t.register('Quản trị B')
    await setRole(admin.id, 'admin')
    const order = (await place(customer)).body.data
    const move = (to: string) => t.call('POST', `/admin/orders/${order.id}/fulfillment`, { token: admin.token, body: { to } })

    expect((await move('delivered')).body.error.code).toBe('ORDER_CHANGED')
    expect((await move('processing')).status).toBe(400)

    const shipping = (await move('shipping')).body.data
    expect(shipping).toMatchObject({ fulfillment: 'shipping', nextFulfillment: 'delivered', fulfillmentUpdatedBy: admin.id, cancellable: false })
    expect((await move('shipping')).body.error.code).toBe('ORDER_CHANGED')

    const delivered = (await move('delivered')).body.data
    expect(delivered).toMatchObject({ fulfillment: 'delivered', nextFulfillment: null })
    expect(delivered.deliveredAt).toBeGreaterThanOrEqual(delivered.shippedAt)
    expect((await move('delivered')).body.error.code).toBe('ORDER_NOT_ADVANCEABLE')

    // Khách thấy đơn đã giao và nhận thông báo cho từng bước.
    expect((await t.call('GET', `/orders/${order.id}`, { token: customer.token })).body.data.fulfillment).toBe('delivered')
    const inbox = (await t.call('GET', '/inbox', { token: customer.token })).body.data.items.map((m: { title: string }) => m.title)
    expect(inbox.slice(0, 2)).toEqual([`Đơn #${order.code} đã giao thành công`, `Đơn #${order.code} đang được giao`])
  })

  it('đơn đã huỷ không chuyển được; vẫn hoạt động khi tắt checkout demo (production)', async () => {
    const customer = await t.register()
    const admin = await t.register()
    await setRole(admin.id, 'admin')
    const cancelled = (await place(customer)).body.data
    await t.call('POST', `/orders/${cancelled.id}/cancel`, { token: customer.token })
    const blocked = await t.call('POST', `/admin/orders/${cancelled.id}/fulfillment`, { token: admin.token, body: { to: 'shipping' } })
    expect(blocked.body.error.code).toBe('ORDER_NOT_ADVANCEABLE')

    const order = (await place(customer)).body.data
    const production = createTestApp({ commerce: { db: t.db, allowDemoCheckout: false } })
    // Nút demo của khách bị chặn ở production, nhưng admin vẫn chuyển bước được.
    expect((await production.call('POST', `/orders/${order.id}/advance`, { token: customer.token })).body.error.code).toBe('DEMO_ONLY')
    expect((await production.call('POST', `/admin/orders/${order.id}/fulfillment`, { token: admin.token, body: { to: 'shipping' } })).body.data.fulfillment).toBe('shipping')
  })
})
