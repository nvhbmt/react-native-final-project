import { serve } from '@hono/node-server'
import { sql } from 'drizzle-orm'

import { buildApp } from './app.ts'
import { createDb } from '@/db/client.ts'
import { consoleMailer, createSmtpMailer } from '@/lib/mailer.ts'
import { loadEnv, sepayConfig } from './env.ts'
import { createDrizzleAuthRepository } from '@/modules/auth/repository.ts'
import { createCatalogRepository } from '@/modules/catalog/repository.ts'
import { createCatalogService } from '@/modules/catalog/service.ts'
import { createOpenAiCompatibleProvider } from '@/modules/ai/provider.ts'

const env = loadEnv()
const { db, close } = createDb(env.DATABASE_URL)

const app = buildApp({
  authRepository: createDrizzleAuthRepository(db),
  mailer: env.SMTP_URL ? createSmtpMailer(env.SMTP_URL, env.MAIL_FROM) : consoleMailer,
  catalog: createCatalogService(createCatalogRepository(db)),
  ai: env.AI_BASE_URL && env.AI_API_KEY && env.AI_MODEL
    ? createOpenAiCompatibleProvider({ baseUrl: env.AI_BASE_URL, apiKey: env.AI_API_KEY, model: env.AI_MODEL })
    : undefined,
  commerce: { db, allowDemoCheckout: env.NODE_ENV !== 'production', uploadDir: env.UPLOAD_DIR, sepay: sepayConfig(env) },
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
