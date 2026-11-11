import { randomInt, timingSafeEqual } from 'node:crypto'

import { z } from 'zod'

/**
 * Tích hợp SePay (https://sepay.vn): khách chuyển khoản qua VietQR với nội dung là mã đơn,
 * SePay theo dõi tài khoản ngân hàng và gọi webhook khi có tiền vào.
 */
export type SepayConfig = {
  /** API key đặt ở mục Webhook của SePay; SePay gửi header `Authorization: Apikey <key>`. */
  webhookApiKey: string
  /** Mã/tên ngân hàng theo SePay, vd. `MBBank`, `Vietcombank`, `TPBank`. */
  bank: string
  accountNumber: string
  accountName: string
  /** Tỉ giá quy đổi giá USD của catalog sang VND. */
  usdToVnd: number
  /** Tiền tố mã thanh toán; phải trùng cấu hình "Cấu trúc mã thanh toán" trên SePay. */
  codePrefix: string
  ttlMinutes: number
  /** Cấu hình giả để thử luồng ở máy dev (webhook gửi bằng `npm run sepay:simulate`); app hiện cảnh báo không chuyển tiền thật. */
  simulated?: boolean
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function createPaymentCode(prefix: string) {
  let code = prefix
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return code
}

/** Tìm mã thanh toán trong nội dung chuyển khoản (ngân hàng có thể thêm chữ trước/sau, bỏ dấu cách). */
export function extractPaymentCode(prefix: string, ...texts: (string | null | undefined)[]) {
  const pattern = new RegExp(`${prefix.replace(/[^A-Za-z0-9]/g, '')}[${CODE_ALPHABET}]{8}`, 'i')
  for (const text of texts) {
    const match = text?.replace(/\s+/g, '').match(pattern)
    if (match) return match[0].toUpperCase()
  }
  return null
}

export const toVnd = (cents: number, config: Pick<SepayConfig, 'usdToVnd'>) => Math.round((cents / 100) * config.usdToVnd)

export function qrImageUrl(config: SepayConfig, amountVnd: number, content: string) {
  const query = new URLSearchParams({ acc: config.accountNumber, bank: config.bank, amount: String(amountVnd), des: content })
  return `https://qr.sepay.vn/img?${query}`
}

export function verifyApiKey(header: string | undefined, key: string) {
  const expected = Buffer.from(`Apikey ${key}`)
  const actual = Buffer.from(header?.trim() ?? '')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** Payload webhook SePay (https://docs.sepay.vn/tich-hop-webhooks.html). */
export const sepayWebhookSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  gateway: z.string().optional(),
  transactionDate: z.string().optional(),
  accountNumber: z.string().nullish(),
  code: z.string().nullish(),
  content: z.string().default(''),
  transferType: z.enum(['in', 'out']),
  transferAmount: z.number().int().nonnegative(),
  referenceCode: z.string().nullish(),
  description: z.string().nullish(),
}).loose()

export type SepayWebhook = z.infer<typeof sepayWebhookSchema>
