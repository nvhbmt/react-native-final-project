import { describe, expect, it } from 'vitest'

import { createTestApp } from '../../test/helpers.ts'

const alice = { email: 'Alice@Example.com', password: 'correct horse', fullName: 'Alice Nguyễn' }

async function registered() {
  const ctx = createTestApp()
  const res = await ctx.call('POST', '/auth/register', { body: alice })
  return { ...ctx, session: res.body.data as { user: any; tokens: any } }
}

describe('đăng ký', () => {
  it('tạo tài khoản, chuẩn hoá email và trả cặp token', async () => {
    const { call } = createTestApp()
    const res = await call('POST', '/auth/register', { body: alice })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user).toMatchObject({ email: 'alice@example.com', fullName: 'Alice Nguyễn', role: 'customer' })
    expect(res.body.data.tokens).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 })
    expect(res.body.data.tokens.accessToken).toEqual(expect.any(String))
    expect(res.body.data.tokens.refreshToken).toEqual(expect.any(String))
  })

  it('không bao giờ trả passwordHash', async () => {
    const { session } = await registered()
    expect(JSON.stringify(session)).not.toContain('scrypt$')
    expect(session.user).not.toHaveProperty('passwordHash')
  })

  it('từ chối email đã tồn tại (không phân biệt hoa thường)', async () => {
    const { call } = await registered()
    const res = await call('POST', '/auth/register', { body: { ...alice, email: 'ALICE@example.com' } })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_TAKEN')
  })

  it('báo lỗi theo từng field khi dữ liệu không hợp lệ', async () => {
    const { call } = createTestApp()
    const res = await call('POST', '/auth/register', { body: { email: 'abc', password: '123', fullName: '' } })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details.map((d: any) => d.field).sort()).toEqual(['email', 'fullName', 'password'])
  })

  it('trả 400 khi body không phải JSON', async () => {
    const { app } = createTestApp()
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{oops',
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as any).success).toBe(false)
  })
})

describe('đăng nhập', () => {
  it('đăng nhập đúng mật khẩu', async () => {
    const { call } = await registered()
    const res = await call('POST', '/auth/login', { body: { email: ' alice@EXAMPLE.com ', password: alice.password } })
    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe('alice@example.com')
  })

  it('sai mật khẩu và email không tồn tại trả cùng một lỗi', async () => {
    const { call } = await registered()
    const wrong = await call('POST', '/auth/login', { body: { email: alice.email, password: 'nope-nope' } })
    const missing = await call('POST', '/auth/login', { body: { email: 'bob@example.com', password: 'nope-nope' } })
    expect(wrong.status).toBe(401)
    expect(missing.status).toBe(401)
    expect(wrong.body.error).toEqual(missing.body.error)
  })

  it('giới hạn số lần thử', async () => {
    const { call } = createTestApp({ authRateLimitMax: 2 })
    const body = { email: 'x@example.com', password: 'whatever1' }
    await call('POST', '/auth/login', { body })
    await call('POST', '/auth/login', { body })
    const res = await call('POST', '/auth/login', { body })
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })
})

describe('access token', () => {
  it('/auth/me trả user khi có token hợp lệ', async () => {
    const { call, session } = await registered()
    const res = await call('GET', '/auth/me', { token: session.tokens.accessToken })
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(session.user)
  })

  it('thiếu hoặc sai token bị 401', async () => {
    const { call } = await registered()
    expect((await call('GET', '/auth/me')).body.error.code).toBe('UNAUTHORIZED')
    const bad = await call('GET', '/auth/me', { token: 'not.a.jwt' })
    expect(bad.status).toBe(401)
    expect(bad.body.error.code).toBe('TOKEN_EXPIRED')
  })

  it('token hết hạn bị 401 TOKEN_EXPIRED', async () => {
    const { call } = createTestApp({ accessTtlSeconds: -10 })
    const res = await call('POST', '/auth/register', { body: alice })
    const me = await call('GET', '/auth/me', { token: res.body.data.tokens.accessToken })
    expect(me.status).toBe(401)
    expect(me.body.error.code).toBe('TOKEN_EXPIRED')
  })
})

describe('refresh token', () => {
  it('xoay vòng: cấp token mới, token cũ không dùng lại được', async () => {
    const { call, session } = await registered()
    const first = await call('POST', '/auth/refresh', { body: { refreshToken: session.tokens.refreshToken } })
    expect(first.status).toBe(200)
    expect(first.body.data.tokens.refreshToken).not.toBe(session.tokens.refreshToken)

    const reused = await call('POST', '/auth/refresh', { body: { refreshToken: session.tokens.refreshToken } })
    expect(reused.status).toBe(401)
    expect(reused.body.error.code).toBe('REFRESH_TOKEN_REUSED')
  })

  it('dùng lại token cũ sẽ thu hồi cả chuỗi, kể cả token mới nhất', async () => {
    const { call, session } = await registered()
    const rotated = await call('POST', '/auth/refresh', { body: { refreshToken: session.tokens.refreshToken } })
    await call('POST', '/auth/refresh', { body: { refreshToken: session.tokens.refreshToken } })

    const latest = await call('POST', '/auth/refresh', { body: { refreshToken: rotated.body.data.tokens.refreshToken } })
    expect(latest.status).toBe(401)
  })

  it('không ảnh hưởng phiên trên thiết bị khác', async () => {
    const { call, session } = await registered()
    const other = await call('POST', '/auth/login', { body: alice })
    await call('POST', '/auth/refresh', { body: { refreshToken: session.tokens.refreshToken } })
    await call('POST', '/auth/refresh', { body: { refreshToken: session.tokens.refreshToken } })

    const res = await call('POST', '/auth/refresh', { body: { refreshToken: other.body.data.tokens.refreshToken } })
    expect(res.status).toBe(200)
  })

  it('token lạ hoặc hết hạn bị từ chối', async () => {
    const unknown = await createTestApp().call('POST', '/auth/refresh', { body: { refreshToken: 'abc' } })
    expect(unknown.body.error.code).toBe('INVALID_REFRESH_TOKEN')

    const { call } = createTestApp({ refreshTtlSeconds: -1 })
    const res = await call('POST', '/auth/register', { body: alice })
    const expired = await call('POST', '/auth/refresh', { body: { refreshToken: res.body.data.tokens.refreshToken } })
    expect(expired.status).toBe(401)
    expect(expired.body.error.code).toBe('INVALID_REFRESH_TOKEN')
  })
})

describe('đăng xuất', () => {
  it('logout thu hồi refresh token của thiết bị đó và idempotent', async () => {
    const { call, session } = await registered()
    expect((await call('POST', '/auth/logout', { body: { refreshToken: session.tokens.refreshToken } })).status).toBe(200)
    expect((await call('POST', '/auth/logout', { body: { refreshToken: session.tokens.refreshToken } })).status).toBe(200)
    const res = await call('POST', '/auth/refresh', { body: { refreshToken: session.tokens.refreshToken } })
    expect(res.status).toBe(401)
  })

  it('logout-all thu hồi mọi thiết bị', async () => {
    const { call, session } = await registered()
    const other = await call('POST', '/auth/login', { body: alice })
    await call('POST', '/auth/logout-all', { token: session.tokens.accessToken })

    for (const token of [session.tokens.refreshToken, other.body.data.tokens.refreshToken]) {
      expect((await call('POST', '/auth/refresh', { body: { refreshToken: token } })).status).toBe(401)
    }
  })
})

describe('đổi mật khẩu', () => {
  it('đổi xong thì mật khẩu cũ hết hiệu lực và thiết bị khác bị đăng xuất', async () => {
    const { call, session } = await registered()
    const other = await call('POST', '/auth/login', { body: alice })

    const res = await call('POST', '/auth/change-password', {
      token: session.tokens.accessToken,
      body: { currentPassword: alice.password, newPassword: 'new password 1' },
    })
    expect(res.status).toBe(200)
    expect(res.body.data.tokens.refreshToken).toEqual(expect.any(String))

    expect((await call('POST', '/auth/login', { body: alice })).status).toBe(401)
    expect((await call('POST', '/auth/login', { body: { ...alice, password: 'new password 1' } })).status).toBe(200)
    expect((await call('POST', '/auth/refresh', { body: { refreshToken: other.body.data.tokens.refreshToken } })).status).toBe(401)
    expect((await call('POST', '/auth/refresh', { body: { refreshToken: res.body.data.tokens.refreshToken } })).status).toBe(200)
  })

  it('sai mật khẩu hiện tại bị từ chối', async () => {
    const { call, session } = await registered()
    const res = await call('POST', '/auth/change-password', {
      token: session.tokens.accessToken,
      body: { currentPassword: 'wrong-one', newPassword: 'new password 1' },
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('WRONG_PASSWORD')
  })
})
