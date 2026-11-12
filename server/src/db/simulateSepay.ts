/**
 * Giả lập SePay gọi webhook "có tiền vào" cho một đơn đang chờ chuyển khoản — chỉ dùng ở máy dev.
 *
 *   npm run sepay:simulate                    # liệt kê đơn đang chờ chuyển khoản
 *   npm run sepay:simulate -- DH7K2M9QXA      # trả đủ tiền theo mã chuyển khoản (hoặc mã đơn #AB12CD34)
 *   npm run sepay:simulate -- DH7K2M9QXA --amount 10000   # trả thiếu để thử trường hợp "chưa đủ"
 *
 * Gửi đúng định dạng và header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>` như SePay,
 * nên đi qua toàn bộ logic webhook thật của server đang chạy.
 */
import { and, desc, eq, sql } from 'drizzle-orm'

import { loadEnv, sepayConfig } from '@/env.ts'

import { createDb } from './client.ts'
import { orders } from './schema.ts'

const env = loadEnv()
if (env.NODE_ENV === 'production') {
  console.error('Không chạy giả lập SePay trên production.')
  process.exit(1)
}
const sepay = sepayConfig(env)
if (!sepay) {
  console.error('Chưa cấu hình SePay trong server/.env (SEPAY_WEBHOOK_API_KEY, SEPAY_BANK, SEPAY_ACCOUNT_NUMBER, SEPAY_ACCOUNT_NAME).')
  process.exit(1)
}

const args = process.argv.slice(2)
const amountIndex = args.indexOf('--amount')
const amountArg = amountIndex >= 0 ? Number(args[amountIndex + 1]) : undefined
if (amountArg !== undefined && (!Number.isInteger(amountArg) || amountArg <= 0)) {
  console.error('--amount phải là số nguyên VND dương.')
  process.exit(1)
}
// Bỏ qua cờ và giá trị đi sau `--amount`; tham số còn lại là mã chuyển khoản/mã đơn.
const code = args.find((arg, i) => !arg.startsWith('--') && !(amountIndex >= 0 && i === amountIndex + 1))?.replace(/^#/, '')

const { db, close } = createDb(env.DATABASE_URL)
const vnd = (value: number) => `${value.toLocaleString('vi-VN')}₫`

try {
  if (!code) {
    const pending = await db.select().from(orders).where(eq(orders.status, 'pending_payment')).orderBy(desc(orders.createdAt)).limit(10)
    if (!pending.length) console.log('Không có đơn nào đang chờ chuyển khoản. Đặt đơn bằng "Chuyển khoản ngân hàng (VietQR)" trong app trước.')
    for (const order of pending) {
      console.log(`#${order.id.slice(0, 8).toUpperCase()}  mã CK ${order.paymentCode}  ${vnd(order.amountVnd ?? 0)}${order.receivedVnd ? ` (đã nhận ${vnd(order.receivedVnd)})` : ''}  ${order.createdAt.toLocaleString('vi-VN')}`)
    }
    if (pending.length) console.log('\nChạy: npm run sepay:simulate -- <mã CK>')
  } else {
    const upper = code.toUpperCase()
    const [order] = await db.select().from(orders)
      .where(and(sql`${orders.paymentCode} = ${upper} or ${orders.id}::text like ${`${code.toLowerCase()}%`}`, sql`${orders.paymentCode} is not null`))
      .orderBy(desc(orders.createdAt)).limit(1)
    if (!order?.paymentCode) {
      console.error(`Không tìm thấy đơn chuyển khoản với mã "${code}".`)
      process.exitCode = 1
    } else {
      // Mặc định chuyển đúng phần còn thiếu (đơn có thể đã nhận một phần).
      const transferAmount = amountArg ?? Math.max((order.amountVnd ?? 0) - order.receivedVnd, 0)
      const transactionId = Date.now()
      const response = await fetch(`http://localhost:${env.PORT}/api/v1/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Apikey ${sepay.webhookApiKey}` },
        body: JSON.stringify({
          id: transactionId,
          gateway: sepay.bank,
          transactionDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
          accountNumber: sepay.accountNumber,
          code: null,
          // Ngân hàng thường thêm chữ quanh nội dung; server tự tìm mã trong đó.
          content: `${order.paymentCode} thanh toan don hang`,
          transferType: 'in',
          transferAmount,
          referenceCode: `SIM${transactionId}`,
          description: 'Giao dịch giả lập từ npm run sepay:simulate',
        }),
      })
      const body = await response.json().catch(() => null) as { result?: string; error?: { message?: string } } | null
      if (!response.ok) {
        console.error(`Webhook lỗi ${response.status}: ${body?.error?.message ?? 'không rõ'}`)
        process.exitCode = 1
      } else {
        const meaning: Record<string, string> = {
          matched: 'đã xác nhận thanh toán, app sẽ tự chuyển sang "Thanh toán thành công"',
          underpaid: 'chuyển thiếu tiền, đơn vẫn chờ thanh toán — chạy lại không kèm --amount để chuyển bù phần còn thiếu',
          late: 'đơn đã thanh toán hoặc đã huỷ trước đó',
          unmatched: 'không khớp đơn nào',
          duplicate: 'giao dịch đã được xử lý',
        }
        console.log(`Đơn #${order.id.slice(0, 8).toUpperCase()} · chuyển ${vnd(transferAmount)} · đã nhận trước đó ${vnd(order.receivedVnd)} / cần ${vnd(order.amountVnd ?? 0)}`)
        console.log(`Kết quả: ${body?.result} — ${meaning[body?.result ?? ''] ?? ''}`)
      }
    }
  }
} catch (error) {
  console.error(error instanceof TypeError ? `Không gọi được server tại cổng ${env.PORT}. Server đã chạy chưa (npm run dev)?` : error)
  process.exitCode = 1
} finally {
  await close()
}
