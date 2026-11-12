import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const address = { recipientName: 'Nguyễn Văn A', phone: '0901234567', line1: '1 Lê Lợi, Q1', city: 'TP.HCM' }

describe.skipIf(!commerceTestUrl)('tài khoản', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  let dir: string
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'uploads-'))
    t = await startCommerceTest((db) => ({ commerce: { db, allowDemoCheckout: true, uploadDir: dir } }))
  })
  afterAll(async () => {
    await t?.stop()
    await rm(dir, { recursive: true, force: true })
  })

  it('cập nhật hồ sơ và kiểm tra dữ liệu', async () => {
    const { token } = await t.register('Old name')
    const res = await t.call('PATCH', '/users/me', { token, body: { fullName: ' New name ', phone: '0901 234 567' } })
    expect(res.body.data).toMatchObject({ fullName: 'New name', phone: '0901 234 567' })
    expect(res.body.data).not.toHaveProperty('passwordHash')
    expect((await t.call('PATCH', '/users/me', { token, body: { phone: 'abc' } })).status).toBe(400)
    expect((await t.call('PATCH', '/users/me', { token, body: {} })).status).toBe(400)
    expect((await t.call('GET', '/auth/me', { token })).body.data.fullName).toBe('New name')
  })

  it('lưu lựa chọn nhận thông báo khuyến mãi theo tài khoản', async () => {
    const { token } = await t.register()
    expect((await t.call('GET', '/auth/me', { token })).body.data.promoNotifications).toBe(false)
    const on = await t.call('PATCH', '/users/me', { token, body: { promoNotifications: true } })
    expect(on.body.data).toMatchObject({ promoNotifications: true, fullName: 'Test user' })
    expect((await t.call('GET', '/auth/me', { token })).body.data.promoNotifications).toBe(true)
    expect((await t.call('PATCH', '/users/me', { token, body: { promoNotifications: 'yes' } })).status).toBe(400)
    expect((await t.call('PATCH', '/users/me', { token, body: { promoNotifications: false } })).body.data.promoNotifications).toBe(false)
  })

  it('đổi avatar chỉ bằng ảnh avatar của chính mình', async () => {
    const a = await t.register()
    const b = await t.register()
    const form = new FormData()
    form.set('purpose', 'avatar')
    form.set('file', new Blob([PNG]), 'a.png')
    const upload = await (await t.app.request('/api/v1/uploads', { method: 'POST', body: form, headers: { Authorization: `Bearer ${a.token}` } })).json() as { data: { id: string; url: string } }
    expect((await t.call('PUT', '/users/me/avatar', { token: b.token, body: { uploadId: upload.data.id } })).status).toBe(400)
    expect((await t.call('PUT', '/users/me/avatar', { token: a.token, body: { uploadId: upload.data.id } })).body.data.avatarUrl).toBe(upload.data.url)
    expect((await t.call('PUT', '/users/me/avatar', { token: a.token, body: { uploadId: null } })).body.data.avatarUrl).toBeNull()
  })

  it('địa chỉ: địa chỉ đầu là mặc định, đổi mặc định, xoá thì chuyển mặc định', async () => {
    const { token } = await t.register('Test user', { withAddress: false })
    const first = (await t.call('POST', '/users/me/addresses', { token, body: address })).body.data
    expect(first[0].isDefault).toBe(true)
    const two = (await t.call('POST', '/users/me/addresses', { token, body: { ...address, line1: '2 Hai Bà Trưng', isDefault: true } })).body.data
    expect(two.map((a: { line1: string; isDefault: boolean }) => [a.line1, a.isDefault])).toEqual([['2 Hai Bà Trưng', true], ['1 Lê Lợi, Q1', false]])
    const other = await t.register('Other', { withAddress: false })
    expect((await t.call('DELETE', `/users/me/addresses/${two[0].id}`, { token: other.token })).body.data).toEqual([])
    const left = (await t.call('DELETE', `/users/me/addresses/${two[0].id}`, { token })).body.data
    expect(left).toHaveLength(1)
    expect(left[0].isDefault).toBe(true)
    expect((await t.call('PATCH', `/users/me/addresses/${left[0].id}`, { token, body: { city: 'Hà Nội' } })).body.data[0].city).toBe('Hà Nội')
  })

  it('xoá tài khoản cần đúng mật khẩu', async () => {
    const { token } = await t.register()
    expect((await t.call('DELETE', '/users/me', { token, body: { password: 'wrong' } })).body.error.code).toBe('WRONG_PASSWORD')
    expect((await t.call('DELETE', '/users/me', { token, body: { password: 'test-password-123' } })).status).toBe(200)
    expect((await t.call('GET', '/auth/me', { token })).status).toBe(401)
  })
})
