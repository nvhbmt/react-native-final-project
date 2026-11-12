import { describe, expect, it } from 'vitest'

import type { AppDeps } from '@/app.ts'
import { createTestApp } from '@/test/helpers.ts'

// Không cần DB: GET /payment-methods và kiểm tra phương thức chạy trước mọi truy vấn.
const fakeDb = {} as never
const sepay = { webhookApiKey: 'k', bank: 'MBBank', accountNumber: '0123456789', accountName: 'A', codePrefix: 'MM', ttlMinutes: 30, usdToVnd: 25_000 }

async function methods(commerce: AppDeps['commerce']) {
  const t = createTestApp({ commerce })
  const reg = await t.call('POST', '/auth/register', { body: { email: 'a@b.co', password: 'password1', fullName: 'A' } })
  const token = reg.body.data.tokens.accessToken
  const list = (await t.call('GET', '/payment-methods', { token })).body.data.map((m: { id: string }) => m.id)
  const card = await t.call('POST', '/orders', { token, body: { requestId: 'request-000000001', paymentMethod: 'pm_visa', addressId: crypto.randomUUID(), items: [{ productId: 'banana', quantity: 1 }] } })
  return { list, cardStatus: card.status }
}

describe('phương thức thanh toán', () => {
  it('app chạy thật chỉ có SePay, kể cả khi bật chế độ demo; thẻ demo bị từ chối', async () => {
    expect(await methods({ db: fakeDb, allowDemoCheckout: true, demoCards: false, sepay })).toEqual({ list: ['sepay'], cardStatus: 503 })
  })

  it('chưa cấu hình SePay thì không có phương thức nào', async () => {
    expect((await methods({ db: fakeDb, allowDemoCheckout: true, demoCards: false })).list).toEqual([])
  })
})
