import { describe, expect, it } from 'vitest'

import { createPaymentCode, extractPaymentCode, qrImageUrl, toVnd, verifyApiKey } from './sepay.ts'

describe('SePay helpers', () => {
  it('tạo mã đúng định dạng và tìm lại được trong nội dung ngân hàng', () => {
    const code = createPaymentCode('DH')
    expect(code).toMatch(/^DH[A-Z2-9]{8}$/)
    expect(extractPaymentCode('DH', null, `MBVCB.123.${code.toLowerCase()} chuyen tien`)).toBe(code)
    expect(extractPaymentCode('DH', null, 'DH 7K2M 9QXA')).toBe('DH7K2M9QXA')
    expect(extractPaymentCode('DH', 'DHABCDEFGH', 'khác')).toBe('DHABCDEFGH')
    expect(extractPaymentCode('DH', null, 'không có mã')).toBeNull()
  })

  it('quy đổi VND, dựng URL QR và so khớp API key', () => {
    expect(toVnd(1234, { usdToVnd: 25_000 })).toBe(308_500)
    const url = new URL(qrImageUrl({ bank: 'MBBank', accountNumber: '0123', accountName: 'A', webhookApiKey: 'k', codePrefix: 'DH', ttlMinutes: 30, usdToVnd: 1 }, 50_000, 'DHABCDEFGH'))
    expect(url.host).toBe('qr.sepay.vn')
    expect(Object.fromEntries(url.searchParams)).toEqual({ acc: '0123', bank: 'MBBank', amount: '50000', des: 'DHABCDEFGH' })
    expect(verifyApiKey('Apikey secret', 'secret')).toBe(true)
    expect(verifyApiKey('Apikey wrong!', 'secret')).toBe(false)
    expect(verifyApiKey(undefined, 'secret')).toBe(false)
  })
})
