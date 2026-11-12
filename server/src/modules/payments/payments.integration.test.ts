import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { SepayConfig } from '@/modules/payments/sepay.ts'
import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'

const sepay: SepayConfig = {
  webhookApiKey: 'test-sepay-key', bank: 'MBBank', accountNumber: '0123456789', accountName: 'CONG TY TEST',
  codePrefix: 'DH', ttlMinutes: 30, usdToVnd: 25_000,
}

describe.skipIf(!commerceTestUrl)('thanh toán SePay', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  beforeAll(async () => { t = await startCommerceTest((db) => ({ commerce: { db, allowDemoCheckout: false, sepay } })) })
  afterAll(async () => { await t?.stop() })

  let txnId = Date.now()
  const webhook = (body: Record<string, unknown>, key = sepay.webhookApiKey) => t.app.request('/api/v1/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Apikey ${key}` },
    body: JSON.stringify({ id: ++txnId, gateway: 'MBBank', accountNumber: sepay.accountNumber, transferType: 'in', code: null, ...body }),
  })
  const order = async ({ token, addressId }: { token: string; addressId: string }) => (await t.call('POST', '/orders', {
    token, body: { requestId: crypto.randomUUID(), paymentMethod: 'sepay', addressId, items: [{ productId: 'banana', quantity: 3 }] },
  })).body.data

  it('chỉ có SePay khi tắt demo; đơn chờ thanh toán có QR và số tiền VND', async () => {
    const user = await t.register()
    const { token } = user
    expect((await t.call('GET', '/payment-methods', { token })).body.data.map((m: { id: string }) => m.id)).toEqual(['sepay'])
    expect((await t.call('POST', '/orders', { token, body: { requestId: crypto.randomUUID(), paymentMethod: 'pm_visa', addressId: user.addressId, items: [{ productId: 'banana', quantity: 1 }] } })).status).toBe(503)
    const created = await order(user)
    expect(created).toMatchObject({ status: 'pending_payment', paymentMode: 'verified', cancellable: true })
    expect(created.amountVnd).toBe(Math.round(created.total * 25_000))
    expect(created.payment).toMatchObject({ provider: 'sepay', accountNumber: sepay.accountNumber, amountVnd: created.amountVnd, expired: false })
    expect(created.payment.content).toMatch(/^DH[A-Z2-9]{8}$/)
    expect(created.payment.qrUrl).toContain('qr.sepay.vn')
  })

  it('webhook sai key bị từ chối; đúng key ghi nhận tiền một lần và xác nhận đơn', async () => {
    const user = await t.register()
    const { token } = user
    const created = await order(user)
    const body = { content: `NGUYEN VAN A CHUYEN TIEN ${created.payment.content}`, transferAmount: created.amountVnd }
    expect((await webhook(body, 'wrong-key')).status).toBe(401)
    expect(await (await webhook({ ...body, accountNumber: '9999999999' })).json()).toMatchObject({ result: 'ignored' })
    expect(await (await webhook({ ...body, accountNumber: null })).json()).toMatchObject({ result: 'ignored' })
    expect((await t.call('GET', `/orders/${created.id}`, { token })).body.data.status).toBe('pending_payment')

    const first = await webhook(body)
    expect(await first.json()).toEqual({ success: true, result: 'matched' })
    const paid = (await t.call('GET', `/orders/${created.id}`, { token })).body.data
    expect(paid).toMatchObject({ status: 'completed', payment: null, cancellable: false, fulfillment: 'processing', advanceable: false })
    expect(paid.paidAt).toBeTypeOf('number')
    // Môi trường không bật demo → không tự chuyển bước giao hàng được.
    expect((await t.call('POST', `/orders/${created.id}/advance`, { token })).body.error.code).toBe('DEMO_ONLY')

    // SePay gửi lại cùng id giao dịch → không xử lý lần hai
    const replay = await t.app.request('/api/v1/payments/webhook', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Apikey ${sepay.webhookApiKey}` },
      body: JSON.stringify({ id: txnId, accountNumber: sepay.accountNumber, transferType: 'in', content: body.content, transferAmount: body.transferAmount }),
    })
    expect((await replay.json() as { result: string }).result).toBe('duplicate')
    expect((await t.call('POST', `/orders/${created.id}/cancel`, { token })).body.error.code).toBe('ORDER_NOT_CANCELLABLE')
    const inbox = (await t.call('GET', '/inbox', { token })).body.data.items.map((m: { title: string }) => m.title)
    expect(inbox[0]).toContain('Đã nhận thanh toán')
    expect((await t.call('GET', '/products/banana/reviews/eligibility', { token })).body.data.eligible).toBe(true)
  })

  it('thiếu tiền, không khớp mã, tiền ra và tiền đến sau khi huỷ', async () => {
    const user = await t.register()
    const { token } = user
    const created = await order(user)
    const content = created.payment.content
    expect(await (await webhook({ content, transferAmount: created.amountVnd - 1 })).json()).toMatchObject({ result: 'underpaid' })
    expect((await t.call('GET', `/orders/${created.id}`, { token })).body.data.status).toBe('pending_payment')
    expect(await (await webhook({ content: 'DHZZZZZZZZ', transferAmount: 1000 })).json()).toMatchObject({ result: 'unmatched' })
    expect(await (await webhook({ content, transferAmount: created.amountVnd, transferType: 'out' })).json()).toMatchObject({ result: 'ignored' })

    expect((await t.call('POST', `/orders/${created.id}/cancel`, { token })).body.data.status).toBe('cancelled')
    expect(await (await webhook({ content, transferAmount: created.amountVnd })).json()).toMatchObject({ result: 'late' })
    expect((await t.call('GET', `/orders/${created.id}`, { token })).body.data.status).toBe('cancelled')
  })

  it('chuyển thiếu rồi chuyển bù: cộng dồn, QR hiện phần còn thiếu, đủ tiền thì xác nhận', async () => {
    const user = await t.register()
    const created = await order(user)
    const content = created.payment.content
    const first = Math.floor(created.amountVnd / 3)
    expect(await (await webhook({ content, transferAmount: first })).json()).toMatchObject({ result: 'underpaid' })

    const partial = (await t.call('GET', `/orders/${created.id}`, { token: user.token })).body.data
    expect(partial.status).toBe('pending_payment')
    expect(partial.payment).toMatchObject({ totalVnd: created.amountVnd, receivedVnd: first, amountVnd: created.amountVnd - first })
    expect(new URL(partial.payment.qrUrl).searchParams.get('amount')).toBe(String(created.amountVnd - first))
    const notice = (await t.call('GET', '/inbox', { token: user.token })).body.data.items[0]
    expect(notice.body).toContain(`Chuyển thêm ${(created.amountVnd - first).toLocaleString('vi-VN')}₫`)

    // Lần 2 vẫn thiếu 1đ → vẫn chờ; lần 3 bù 1đ → xác nhận
    expect(await (await webhook({ content, transferAmount: created.amountVnd - first - 1 })).json()).toMatchObject({ result: 'underpaid' })
    expect(await (await webhook({ content, transferAmount: 1 })).json()).toMatchObject({ result: 'matched' })
    const paid = (await t.call('GET', `/orders/${created.id}`, { token: user.token })).body.data
    expect(paid).toMatchObject({ status: 'completed', payment: null })

    // Giao dịch thiếu bị gửi lại (duplicate) không được cộng thêm lần nữa
    const other = await order(user)
    const id = ++txnId
    const send = async () => (await t.app.request('/api/v1/payments/webhook', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Apikey ${sepay.webhookApiKey}` },
      body: JSON.stringify({ id, accountNumber: sepay.accountNumber, transferType: 'in', content: other.payment.content, transferAmount: Math.ceil(other.amountVnd / 2) }),
    })).json()
    expect(await send()).toMatchObject({ result: 'underpaid' })
    expect(await send()).toMatchObject({ result: 'duplicate' })
    expect((await t.call('GET', `/orders/${other.id}`, { token: user.token })).body.data.status).toBe('pending_payment')
  })

  it('POST /orders/:id/pay trả lại hướng dẫn chuyển khoản cho đơn đang chờ', async () => {
    const user = await t.register()
    const { token } = user
    const created = await order(user)
    const pay = (await t.call('POST', `/orders/${created.id}/pay`, { token })).body.data
    expect(pay.payment.content).toBe(created.payment.content)
    const other = await t.register()
    expect((await t.call('POST', `/orders/${created.id}/pay`, { token: other.token })).status).toBe(404)
  })
})
