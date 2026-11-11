import { z } from 'zod'

import type { SepayConfig } from '@/modules/payments/sepay.ts'

// Đọc và kiểm tra biến môi trường một lần lúc khởi động — sai cấu hình thì dừng ngay,
// không để lỗi lộ ra giữa chừng khi có request.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET phải dài tối thiểu 32 ký tự'),
  ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(30 * 24 * 60 * 60),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:8081')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),
  // Email (mã đặt lại mật khẩu). Để trống SMTP_URL thì chỉ in ra console (dev).
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('Market <no-reply@market.local>'),
  UPLOAD_DIR: z.string().default('uploads'),
  // SePay — để trống SEPAY_WEBHOOK_API_KEY thì tắt thanh toán chuyển khoản.
  SEPAY_WEBHOOK_API_KEY: z.string().optional(),
  SEPAY_BANK: z.string().optional(),
  SEPAY_ACCOUNT_NUMBER: z.string().optional(),
  SEPAY_ACCOUNT_NAME: z.string().optional(),
  SEPAY_CODE_PREFIX: z.string().regex(/^[A-Z]{2,5}$/, 'SEPAY_CODE_PREFIX chỉ gồm 2–5 chữ in hoa').default('DH'),
  SEPAY_PAYMENT_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  USD_TO_VND_RATE: z.coerce.number().positive().default(25_000),
  AI_BASE_URL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
})

export type Env = z.infer<typeof schema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    throw new Error(`Biến môi trường không hợp lệ:\n${issues.join('\n')}`)
  }
  const env = parsed.data
  const sepayFields = [env.SEPAY_WEBHOOK_API_KEY, env.SEPAY_BANK, env.SEPAY_ACCOUNT_NUMBER, env.SEPAY_ACCOUNT_NAME]
  if (sepayFields.some(Boolean) && !sepayFields.every(Boolean)) {
    throw new Error('Cấu hình SePay thiếu: cần đủ SEPAY_WEBHOOK_API_KEY, SEPAY_BANK, SEPAY_ACCOUNT_NUMBER, SEPAY_ACCOUNT_NAME')
  }
  return env
}

export function sepayConfig(env: Env): SepayConfig | undefined {
  if (!env.SEPAY_WEBHOOK_API_KEY || !env.SEPAY_BANK || !env.SEPAY_ACCOUNT_NUMBER || !env.SEPAY_ACCOUNT_NAME) return undefined
  return {
    webhookApiKey: env.SEPAY_WEBHOOK_API_KEY,
    bank: env.SEPAY_BANK,
    accountNumber: env.SEPAY_ACCOUNT_NUMBER,
    accountName: env.SEPAY_ACCOUNT_NAME,
    codePrefix: env.SEPAY_CODE_PREFIX,
    ttlMinutes: env.SEPAY_PAYMENT_TTL_MINUTES,
    usdToVnd: env.USD_TO_VND_RATE,
  }
}
