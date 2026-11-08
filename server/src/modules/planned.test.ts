import { describe, expect, it } from 'vitest'

import { createTestApp } from '@/test/helpers.ts'
import { PLANNED_ENDPOINTS } from './planned.ts'

describe('endpoint placeholder', () => {
  it('endpoint public trả 501 NOT_IMPLEMENTED', async () => {
    const { call } = createTestApp()
    const res = await call('GET', '/products/example/reviews')
    expect(res.status).toBe(501)
    expect(res.body.error.code).toBe('NOT_IMPLEMENTED')
    expect(res.body.error.details.module).toBe('reviews')
  })

  it('endpoint cần đăng nhập kiểm tra token trước khi trả 501', async () => {
    const { call } = createTestApp()
    expect((await call('GET', '/cart')).status).toBe(401)

    const reg = await call('POST', '/auth/register', { body: { email: 'a@b.co', password: 'password1', fullName: 'A' } })
    const res = await call('POST', '/ai/conversations/abc/messages', { token: reg.body.data.tokens.accessToken, body: {} })
    expect(res.status).toBe(501)
    expect(res.body.error.details.module).toBe('ai-chat')
  })

  it('mọi endpoint trong danh sách đều được mount', async () => {
    const { app } = createTestApp()
    for (const endpoint of PLANNED_ENDPOINTS.filter((e) => !e.auth)) {
      const res = await app.request(`/api/v1${endpoint.path.replace(/:\w+/g, 'x')}`, { method: endpoint.method })
      expect(res.status, `${endpoint.method} ${endpoint.path}`).toBe(501)
    }
    for (const endpoint of PLANNED_ENDPOINTS.filter((e) => e.auth)) {
      const res = await app.request(`/api/v1${endpoint.path.replace(/:\w+/g, 'x')}`, { method: endpoint.method })
      expect(res.status, `${endpoint.method} ${endpoint.path}`).toBe(401)
    }
  })

  it('GET /api/v1 liệt kê các endpoint dự kiến', async () => {
    const { call } = createTestApp()
    const res = await call('GET', '')
    expect(res.status).toBe(200)
    expect(res.body.data.planned.length).toBe(PLANNED_ENDPOINTS.length)
  })

  it('đường dẫn không tồn tại trả 404 theo định dạng chung', async () => {
    const { call } = createTestApp()
    const res = await call('GET', '/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
  })
})

describe('CORS', () => {
  const preflight = (app: ReturnType<typeof createTestApp>['app'], origin: string) =>
    app.request('/api/v1/auth/login', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } })

  it('chỉ cho origin trong danh sách', async () => {
    const { app } = createTestApp()
    expect((await preflight(app, 'http://localhost:8081')).headers.get('access-control-allow-origin')).toBe('http://localhost:8081')
    expect((await preflight(app, 'http://localhost:8082')).headers.get('access-control-allow-origin')).toBeNull()
    expect((await preflight(app, 'https://evil.example')).headers.get('access-control-allow-origin')).toBeNull()
  })

  it('dev cho mọi cổng localhost nhưng không cho domain lạ', async () => {
    const { app } = createTestApp({ allowLocalhostOrigins: true })
    expect((await preflight(app, 'http://localhost:8082')).headers.get('access-control-allow-origin')).toBe('http://localhost:8082')
    expect((await preflight(app, 'http://localhost.evil.example')).headers.get('access-control-allow-origin')).toBeNull()
  })
})
