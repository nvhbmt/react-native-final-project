import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'

describe.skipIf(!commerceTestUrl)('giỏ hàng theo tài khoản', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  beforeAll(async () => { t = await startCommerceTest() })
  afterAll(async () => { await t?.stop() })

  it('yêu cầu đăng nhập', async () => {
    expect((await t.call('GET', '/cart')).status).toBe(401)
  })

  it('thêm, cộng dồn, đổi số lượng, xoá và tính tiền theo giá server', async () => {
    const { token } = await t.register()
    expect((await t.call('GET', '/cart', { token })).body.data).toMatchObject({ items: [], voucher: null })

    await t.call('POST', '/cart/items', { token, body: { productId: 'banana', quantity: 2 } })
    const added = await t.call('POST', '/cart/items', { token, body: { productId: 'banana', quantity: 1 } })
    expect(added.body.data.items).toHaveLength(1)
    expect(added.body.data.items[0]).toMatchObject({ key: 'banana', quantity: 3, available: true })
    expect(added.body.data.totals.subtotal).toBeCloseTo(added.body.data.items[0].price * 3)

    const voucher = await t.call('POST', '/cart/voucher', { token, body: { code: ' sale10 ' } })
    expect(voucher.body.data.voucher).toEqual({ code: 'SALE10', rate: 0.1 })
    expect((await t.call('POST', '/cart/voucher', { token, body: { code: 'NOPE' } })).body.error.code).toBe('INVALID_VOUCHER')

    expect((await t.call('PATCH', '/cart/items/banana', { token, body: { quantity: 5 } })).body.data.items[0].quantity).toBe(5)
    expect((await t.call('PATCH', '/cart/items/missing', { token, body: { quantity: 5 } })).status).toBe(404)
    expect((await t.call('PATCH', '/cart/items/banana', { token, body: { quantity: 0 } })).body.data.items).toEqual([])
  })

  it('từ chối biến thể sai và giỏ của người khác tách biệt', async () => {
    const a = await t.register()
    const b = await t.register()
    expect((await t.call('POST', '/cart/items', { token: a.token, body: { productId: 'vuori-strato-tech-tee-black' } })).body.error.code).toBe('INVALID_VARIANT')
    await t.call('POST', '/cart/items', { token: a.token, body: { productId: 'pear' } })
    expect((await t.call('GET', '/cart', { token: b.token })).body.data.items).toEqual([])
  })

  it('gộp giỏ khách, bỏ qua dòng lỗi; đặt hàng xong thì giỏ trống', async () => {
    const { token } = await t.register()
    const merged = await t.call('POST', '/cart/merge', {
      token,
      body: { items: [{ productId: 'orange', quantity: 2 }, { productId: 'does-not-exist', quantity: 1 }], voucher: 'SALE10' },
    })
    expect(merged.body.data.items.map((i: { key: string }) => i.key)).toEqual(['orange'])
    expect(merged.body.data.voucher.code).toBe('SALE10')

    const order = await t.call('POST', '/orders', {
      token,
      body: { requestId: crypto.randomUUID(), paymentMethod: 'pm_visa', items: [{ productId: 'orange', quantity: 2 }] },
    })
    expect(order.status).toBe(201)
    expect((await t.call('GET', '/cart', { token })).body.data).toMatchObject({ items: [], voucher: null })
  })
})
