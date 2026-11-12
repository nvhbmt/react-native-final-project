import { serve } from '@hono/node-server'
import { sql } from 'drizzle-orm'

import { buildApp } from './app.ts'
import { createDb } from '@/db/client.ts'
import { consoleMailer, createSmtpMailer } from '@/lib/mailer.ts'
import { allowDemoCheckout, loadEnv, sepayConfig, smtpConfig, storageConfig } from './env.ts'
import { createPostgresRateLimitStore, useRateLimitStore } from '@/lib/rateLimit.ts'
import { createDiskStorage, createSupabaseStorage } from '@/lib/storage.ts'
import { createDrizzleAuthRepository } from '@/modules/auth/repository.ts'
import { createCatalogRepository } from '@/modules/catalog/repository.ts'
import { createCatalogService } from '@/modules/catalog/service.ts'
import { createOpenAiCompatibleProvider } from '@/modules/ai/provider.ts'
import { createAnthropicProvider } from '@/modules/ai/anthropicProvider.ts'

const env = loadEnv()
const smtp = smtpConfig(env)
const storageCfg = storageConfig(env)
const storage = storageCfg ? createSupabaseStorage(storageCfg) : createDiskStorage(env.UPLOAD_DIR)
if (!storageCfg && env.NODE_ENV === 'production') {
  console.warn('[storage] Đang lưu ảnh trên ổ đĩa (UPLOAD_DIR). Ảnh sẽ mất khi deploy lại — đặt SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.')
}
const { db, close } = createDb(env.DATABASE_URL)
// Giới hạn request dùng chung qua DB để nhiều instance API cùng một hạn mức.
useRateLimitStore(createPostgresRateLimitStore(db))

const app = buildApp({
  authRepository: createDrizzleAuthRepository(db),
  mailer: smtp ? createSmtpMailer(smtp.transport, smtp.from) : consoleMailer,
  catalog: createCatalogService(createCatalogRepository(db)),
  ai: env.AI_API_KEY && env.AI_MODEL
    ? env.AI_PROVIDER === 'anthropic'
      ? createAnthropicProvider({ apiKey: env.AI_API_KEY, model: env.AI_MODEL })
      : createOpenAiCompatibleProvider({ baseUrl: env.AI_BASE_URL!, apiKey: env.AI_API_KEY, model: env.AI_MODEL })
    : undefined,
  commerce: { db, allowDemoCheckout: allowDemoCheckout(env), uploadDir: env.UPLOAD_DIR, storage, sepay: sepayConfig(env) },
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
