import { serve } from '@hono/node-server'
import { sql } from 'drizzle-orm'

import { buildApp } from './app.ts'
import { createDb } from '@/db/client.ts'
import { loadEnv } from './env.ts'
import { createDrizzleAuthRepository } from '@/modules/auth/repository.ts'

const env = loadEnv()
const { db, close } = createDb(env.DATABASE_URL)

const app = buildApp({
  authRepository: createDrizzleAuthRepository(db),
  accessSecret: env.JWT_ACCESS_SECRET,
  accessTtlSeconds: env.ACCESS_TOKEN_TTL,
  refreshTtlSeconds: env.REFRESH_TOKEN_TTL,
  corsOrigins: env.CORS_ORIGINS,
  allowLocalhostOrigins: env.NODE_ENV === 'development',
  checkDatabase: async () => {
    await db.execute(sql`select 1`)
  },
  logRequests: env.NODE_ENV !== 'test',
})

// 0.0.0.0 để điện thoại thật trong cùng mạng LAN gọi được qua IP máy dev.
const server = serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`API đang chạy tại http://localhost:${info.port}/api/v1`)
})

async function shutdown() {
  server.close()
  await close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
