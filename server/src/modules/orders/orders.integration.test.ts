import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'

describe.skipIf(!commerceTestUrl)('lịch sử và huỷ đơn', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  beforeAll(async () => { t = await startCommerceTest() })
  afterAll(async () => { await t?.stop() })

  const place = ({ token, addressId }: { token: string; addressId: string }, productId: string) => t.call('POST', '/orders', {
    token, body: { requestId: crypto.randomUUID(), paymentMethod: 'pm_visa', addressId, items: [{ productId, quantity: 1 }] },
  })

  it('liệt kê đơn mới nhất trước, phân trang, chỉ đơn của mình', async () => {
    const me = await t.register()
    const other = await t.register()
    const ids = []
    for (const product of ['banana', 'pear', 'orange']) ids.push((await place(me, product)).body.data.id)
    const first = (await t.call('GET', '/orders?limit=2', { token: me.token })).body.data
    expect(first.items.map((o: { id: string }) => o.id)).toEqual([ids[2], ids[1]])
    const second = (await t.call('GET', `/orders?limit=2&cursor=${first.nextCursor}`, { token: me.token })).body.data
    expect(second.items.map((o: { id: string }) => o.id)).toEqual([ids[0]])
    expect((await t.call('GET', '/orders', { token: other.token })).body.data.items).toEqual([])
  })

  it('huỷ đơn demo, idempotent, gửi thông báo và mất quyền đánh giá', async () => {
    const me = await t.register()
    const order = (await place(me, 'banana')).body.data
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

  it('giao hàng: Đang xử lý → Đang giao → Đã giao, không huỷ khi đã gửi, có thông báo', async () => {
    const me = await t.register()
    const other = await t.register()
    const order = (await place(me, 'apple')).body.data
    expect(order).toMatchObject({ fulfillment: 'processing', shippedAt: null, deliveredAt: null, cancellable: true, advanceable: true })
    const advance = (token: string) => t.call('POST', `/orders/${order.id}/advance`, { token })

    expect((await advance(other.token)).status).toBe(404)
    const shipping = (await advance(me.token)).body.data
    expect(shipping).toMatchObject({ fulfillment: 'shipping', cancellable: false, deliveredAt: null })
    expect(shipping.shippedAt).toEqual(expect.any(Number))
    const cancel = await t.call('POST', `/orders/${order.id}/cancel`, { token: me.token })
    expect(cancel.body.error).toMatchObject({ code: 'ORDER_NOT_CANCELLABLE', message: 'Đơn đã được gửi đi nên không thể huỷ' })

    const delivered = (await advance(me.token)).body.data
    expect(delivered).toMatchObject({ fulfillment: 'delivered', advanceable: false })
    expect(delivered.deliveredAt).toBeGreaterThanOrEqual(delivered.shippedAt)
    expect((await advance(me.token)).body.error.code).toBe('ORDER_NOT_ADVANCEABLE')

    const inbox = (await t.call('GET', '/inbox', { token: me.token })).body.data.items.map((m: { title: string }) => m.title)
    expect(inbox.slice(0, 2)).toEqual([`Đơn #${order.code} đã giao thành công`, `Đơn #${order.code} đang được giao`])

    // Đơn đã huỷ không có tiến độ giao hàng và không chuyển bước được.
    const cancelled = (await place(me, 'pear')).body.data
    expect((await t.call('POST', `/orders/${cancelled.id}/cancel`, { token: me.token })).body.data.fulfillment).toBeNull()
    expect((await t.call('POST', `/orders/${cancelled.id}/advance`, { token: me.token })).body.error.code).toBe('ORDER_NOT_ADVANCEABLE')
  })

  it('phí ship theo hình thức giao, FREESHIP miễn phí ship, chặn hình thức không hỗ trợ', async () => {
    const phone = 'plug-samsung-galaxy-s24-ultra-5g-512gb-titanium-black-unlocked'
    const methods = (await t.call('GET', '/shipping-methods?products=pear,banana')).body.data
    expect(methods.map((m: { id: string; fee: number }) => [m.id, m.fee])).toEqual([['standard', 2.99], ['express', 5.99], ['instant', 9.99]])
    // Có một sản phẩm không hỗ trợ Hoả tốc thì cả đơn không chọn được Hoả tốc.
    expect((await t.call('GET', `/shipping-methods?products=pear,${phone}`)).body.data.map((m: { id: string }) => m.id)).toEqual(['standard', 'express'])
    expect((await t.call('GET', '/shipping-methods?products=pear,khong-ton-tai')).body.data).toEqual([])

    const me = await t.register()
    const order = (body: Record<string, unknown>) => t.call('POST', '/orders', {
      token: me.token, body: { requestId: crypto.randomUUID(), paymentMethod: 'pm_visa', addressId: me.addressId, items: [{ productId: 'pear', quantity: 1 }], ...body },
    })
    // pear $1.92: thuế 0.19; phí ship cộng sau thuế, không chịu thuế.
    expect((await order({})).body.data).toMatchObject({ fees: 2.99, tax: 0.19, total: 5.1, shippingMethod: { id: 'standard', label: 'Tiêu chuẩn' } })
    expect((await order({ shippingMethod: 'instant' })).body.data).toMatchObject({ fees: 9.99, total: 12.1, shippingMethod: { id: 'instant' } })
    expect((await order({ shippingMethod: 'express', voucher: 'FREESHIP' })).body.data).toMatchObject({ fees: 0, discount: 0, total: 2.11 })
    const blocked = await order({ shippingMethod: 'instant', items: [{ productId: phone, quantity: 1 }] })
    expect(blocked.body.error.code).toBe('SHIPPING_UNAVAILABLE')
  })

  it('bắt buộc địa chỉ của chính mình và lưu bản chụp không đổi theo sổ địa chỉ', async () => {
    const me = await t.register('Người mua')
    const other = await t.register()
    const body = { paymentMethod: 'pm_visa', items: [{ productId: 'pear', quantity: 1 }] }

    const missing = await t.call('POST', '/orders', { token: me.token, body: { ...body, requestId: crypto.randomUUID() } })
    expect(missing.status).toBe(400)
    const foreign = await t.call('POST', '/orders', { token: me.token, body: { ...body, requestId: crypto.randomUUID(), addressId: other.addressId } })
    expect(foreign.body.error.code).toBe('ADDRESS_NOT_FOUND')

    const order = (await place(me, 'pear')).body.data
    const snapshot = { recipientName: 'Người mua', phone: '0901234567', line1: '1 Lê Lợi, Quận 1', city: 'TP. Hồ Chí Minh' }
    expect(order.shippingAddress).toEqual(snapshot)

    await t.call('PATCH', `/users/me/addresses/${me.addressId}`, { token: me.token, body: { line1: '99 Nguyễn Huệ' } })
    await t.call('DELETE', `/users/me/addresses/${me.addressId}`, { token: me.token })
    expect((await t.call('GET', `/orders/${order.id}`, { token: me.token })).body.data.shippingAddress).toEqual(snapshot)
  })
})
