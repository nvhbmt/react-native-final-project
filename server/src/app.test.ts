import { describe, expect, it } from 'vitest'

import { createTestApp } from '@/test/helpers.ts'

describe('app', () => {
  it('GET /api/v1 trả thông tin API', async () => {
    const { call } = createTestApp()
    const res = await call('GET', '')
    expect(res.body.data).toEqual({ name: 'market-api', version: 'v1' })
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
