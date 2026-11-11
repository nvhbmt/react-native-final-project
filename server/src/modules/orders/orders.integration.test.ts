import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'

describe.skipIf(!commerceTestUrl)('lịch sử và huỷ đơn', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  beforeAll(async () => { t = await startCommerceTest() })
  afterAll(async () => { await t?.stop() })

  const place = (token: string, productId: string) => t.call('POST', '/orders', {
    token, body: { requestId: crypto.randomUUID(), paymentMethod: 'pm_visa', items: [{ productId, quantity: 1 }] },
  })

  it('liệt kê đơn mới nhất trước, phân trang, chỉ đơn của mình', async () => {
    const me = await t.register()
    const other = await t.register()
    const ids = []
    for (const product of ['banana', 'pear', 'orange']) ids.push((await place(me.token, product)).body.data.id)
    const first = (await t.call('GET', '/orders?limit=2', { token: me.token })).body.data
    expect(first.items.map((o: { id: string }) => o.id)).toEqual([ids[2], ids[1]])
    const second = (await t.call('GET', `/orders?limit=2&cursor=${first.nextCursor}`, { token: me.token })).body.data
    expect(second.items.map((o: { id: string }) => o.id)).toEqual([ids[0]])
    expect((await t.call('GET', '/orders', { token: other.token })).body.data.items).toEqual([])
  })

  it('huỷ đơn demo, idempotent, gửi thông báo và mất quyền đánh giá', async () => {
    const me = await t.register()
    const order = (await place(me.token, 'banana')).body.data
    expect(order.cancellable).toBe(true)
    const other = await t.register()
    expect((await t.call('POST', `/orders/${order.id}/cancel`, { token: other.token })).status).toBe(404)

    const cancelled = await t.call('POST', `/orders/${order.id}/cancel`, { token: me.token })
    expect(cancelled.body.data).toMatchObject({ status: 'cancelled', cancellable: false })
    expect((await t.call('POST', `/orders/${order.id}/cancel`, { token: me.token })).status).toBe(200)
    const inbox = (await t.call('GET', '/inbox', { token: me.token })).body.data.items.map((m: { title: string }) => m.title)
    expect(inbox[0]).toContain('Đã huỷ đơn')
    expect(inbox[1]).toContain('Đặt hàng thành công')
    expect((await t.call('GET', '/products/banana/reviews/eligibility', { token: me.token })).body.data.eligible).toBe(false)
  })
})
