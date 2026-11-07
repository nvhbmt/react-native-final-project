import { buildApp, type AppDeps } from '@/app.ts'
import { createMemoryAuthRepository } from '@/modules/auth/memoryRepository.ts'

export const TEST_SECRET = 'test-secret-that-is-at-least-32-characters-long'

export function createTestApp(overrides: Partial<AppDeps> = {}) {
  const memory = createMemoryAuthRepository()
  const app = buildApp({
    authRepository: memory.repo,
    accessSecret: TEST_SECRET,
    accessTtlSeconds: 900,
    refreshTtlSeconds: 3600,
    corsOrigins: ['http://localhost:8081'],
    authRateLimitMax: 1000,
    ...overrides,
  })

  async function call(method: string, path: string, options: { body?: unknown; token?: string } = {}) {
    const headers: Record<string, string> = {}
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (options.token) headers.Authorization = `Bearer ${options.token}`
    const res = await app.request(`/api/v1${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    return { status: res.status, body: (await res.json()) as any }
  }

  return { app, call, memory }
}
