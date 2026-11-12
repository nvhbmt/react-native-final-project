import { z } from 'zod'

import type { SmtpTransport } from '@/lib/mailer.ts'
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
  // Email (mã đặt lại mật khẩu). Chọn MỘT cách:
  // - SMTP_URL (vd. Mailpit `smtp://localhost:1025`, hoặc URL đầy đủ của nhà cung cấp);
  // - SMTP_USER + SMTP_PASS (Gmail App Password; mặc định smtp.gmail.com:465, dấu cách trong mật khẩu tự bỏ).
  // Không đặt gì thì chỉ in email ra console (dev).
  SMTP_URL: z.string().optional(),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().transform((value) => value.replace(/\s+/g, '')).optional(),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  /** Mặc định `MobiMart <SMTP_USER>` khi dùng SMTP_USER (Gmail buộc người gửi trùng tài khoản đăng nhập). */
  MAIL_FROM: z.string().optional(),
  UPLOAD_DIR: z.string().default('uploads'),
  // Thẻ demo + nút "(Demo) Chuyển sang". Mặc định: bật khi NODE_ENV khác production. Bản demo online đặt true.
  ALLOW_DEMO_CHECKOUT: z.enum(['true', 'false']).optional().transform((value) => (value === undefined ? undefined : value === 'true')),
  // Lưu ảnh bền vững trên Supabase Storage (production). Thiếu thì lưu ổ đĩa UPLOAD_DIR (mất khi deploy lại).
  // Dòng trống `SUPABASE_URL=` (như .env.example) = chưa cấu hình, không phải URL sai.
  SUPABASE_URL: z.preprocess((value) => (value === '' ? undefined : value), z.string().url().optional()),
  // Secret key (`sb_secret_…`, Project Settings → API Keys). Tên cũ SUPABASE_SERVICE_ROLE_KEY (khoá JWT legacy) vẫn nhận.
  SUPABASE_SECRET_KEY: z.string().trim().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().regex(/^[a-z0-9-]{3,63}$/, 'Tên bucket chỉ gồm chữ thường, số, gạch ngang').default('uploads'),
  // SePay — để trống SEPAY_WEBHOOK_API_KEY thì tắt thanh toán chuyển khoản.
  SEPAY_WEBHOOK_API_KEY: z.string().optional(),
  SEPAY_BANK: z.string().optional(),
  SEPAY_ACCOUNT_NUMBER: z.string().optional(),
  SEPAY_ACCOUNT_NAME: z.string().optional(),
  SEPAY_CODE_PREFIX: z.string().regex(/^[A-Z]{2,5}$/, 'SEPAY_CODE_PREFIX chỉ gồm 2–5 chữ in hoa').default('DH'),
  SEPAY_PAYMENT_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  USD_TO_VND_RATE: z.coerce.number().positive().default(25_000),
  // true = SePay giả lập ở máy dev: tài khoản ngân hàng giả, webhook gửi bằng `npm run sepay:simulate`.
  SEPAY_SIMULATED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  AI_PROVIDER: z.enum(['anthropic', 'openai-compatible']).default('openai-compatible'),
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
  if (env.SEPAY_SIMULATED && env.NODE_ENV === 'production') {
    throw new Error('SEPAY_SIMULATED=true chỉ dùng ở môi trường dev, không bật trên production')
  }
  if (!env.SEPAY_SIMULATED && env.SEPAY_ACCOUNT_NUMBER && /^0+$/.test(env.SEPAY_ACCOUNT_NUMBER)) {
    throw new Error('SEPAY_ACCOUNT_NUMBER vẫn là tài khoản giả; không thể bật SePay thật')
  }
  if (env.AI_API_KEY || env.AI_MODEL) {
    if (!env.AI_API_KEY || !env.AI_MODEL) throw new Error('Cấu hình AI thiếu: cần đủ AI_API_KEY và AI_MODEL')
    if (env.AI_PROVIDER === 'openai-compatible' && !env.AI_BASE_URL) {
      throw new Error('AI_BASE_URL bắt buộc khi AI_PROVIDER=openai-compatible')
    }
  }
  if (Boolean(env.SUPABASE_URL) !== Boolean(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Cấu hình lưu ảnh thiếu: cần đủ SUPABASE_URL và SUPABASE_SECRET_KEY')
  }
  if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASS)) {
    throw new Error('Cấu hình email thiếu: cần đủ SMTP_USER và SMTP_PASS (hoặc dùng SMTP_URL)')
  }
  if (env.SMTP_URL && env.SMTP_USER) {
    throw new Error('Chỉ chọn một cách cấu hình email: SMTP_URL hoặc SMTP_USER/SMTP_PASS')
  }
  return env
}

/** Bật thanh toán demo (thẻ giả, không thu tiền): theo ALLOW_DEMO_CHECKOUT, mặc định chỉ ngoài production. */
export const allowDemoCheckout = (env: Env) => env.ALLOW_DEMO_CHECKOUT ?? env.NODE_ENV !== 'production'

/** Supabase Storage khi đã cấu hình; `undefined` = lưu ổ đĩa. */
export function storageConfig(env: Env) {
  const serviceKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  if (!env.SUPABASE_URL || !serviceKey) return undefined
  return { url: env.SUPABASE_URL, serviceKey, bucket: env.SUPABASE_STORAGE_BUCKET }
}

/** Cấu hình gửi mail từ env; `undefined` = chưa cấu hình (in email ra console). */
export function smtpConfig(env: Env): { transport: SmtpTransport; from: string } | undefined {
  if (env.SMTP_URL) return { transport: env.SMTP_URL, from: env.MAIL_FROM ?? 'MobiMart <no-reply@mobimart.local>' }
  if (!env.SMTP_USER || !env.SMTP_PASS) return undefined
  return {
    transport: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    },
    from: env.MAIL_FROM ?? `MobiMart <${env.SMTP_USER}>`,
  }
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
    simulated: env.SEPAY_SIMULATED,
  }
}
