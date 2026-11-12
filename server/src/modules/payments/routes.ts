import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'

import type { Db } from '@/db/client.ts'
import { orders, paymentTransactions } from '@/db/schema.ts'
import { AppError } from '@/lib/http.ts'
import { notify } from '@/modules/inbox/notify.ts'
import { shortId } from '@/modules/orders/routes.ts'
import { extractPaymentCode, sepayWebhookSchema, verifyApiKey, type SepayConfig, type SepayWebhook } from './sepay.ts'

type Result = 'matched' | 'underpaid' | 'late' | 'unmatched' | 'duplicate' | 'ignored'

/** Ghi nhận một giao dịch tiền vào. Idempotent theo id giao dịch SePay. */
export async function applySepayTransaction(db: Db, config: SepayConfig, txn: SepayWebhook): Promise<Result> {
  if (txn.transferType !== 'in') return 'ignored'
  // Một SePay account có thể theo dõi nhiều tài khoản ngân hàng. Chỉ tài khoản
  // đang hiển thị trên QR của app mới được phép xác nhận đơn hàng.
  if (!txn.accountNumber || txn.accountNumber.replace(/\s/g, '') !== config.accountNumber.replace(/\s/g, '')) return 'ignored'
  const code = extractPaymentCode(config.codePrefix, txn.code, txn.content, txn.description)

  return db.transaction(async (tx) => {
    const [order] = code
      ? await tx.select().from(orders).where(eq(orders.paymentCode, code)).for('update')
      : []
    let result: Exclude<Result, 'duplicate' | 'ignored'> = 'unmatched'
    if (order) {
      if (order.status !== 'pending_payment') result = 'late'
      else if (txn.transferAmount < (order.amountVnd ?? Infinity)) result = 'underpaid'
      else result = 'matched'
    }

    const [recorded] = await tx.insert(paymentTransactions).values({
      provider: 'sepay', providerTxnId: txn.id, orderId: order?.id ?? null, amountVnd: txn.transferAmount,
      content: txn.content, referenceCode: txn.referenceCode ?? null, result, raw: txn,
    }).onConflictDoNothing().returning({ id: paymentTransactions.id })
    if (!recorded) return 'duplicate'
    if (!order) return result

    if (result === 'matched') {
      await tx.update(orders).set({ status: 'completed', paidAt: new Date() })
        .where(and(eq(orders.id, order.id), eq(orders.status, 'pending_payment')))
      await notify(tx, order.userId, {
        kind: 'payment',
        title: `Đã nhận thanh toán đơn #${shortId(order.id)}`,
        body: `Đã nhận ${txn.transferAmount.toLocaleString('vi-VN')}₫. Đơn hàng của bạn đã được xác nhận.`,
        data: { orderId: order.id },
      })
    } else if (result === 'underpaid') {
      await notify(tx, order.userId, {
        kind: 'payment',
        title: `Thanh toán chưa đủ cho đơn #${shortId(order.id)}`,
        body: `Đã nhận ${txn.transferAmount.toLocaleString('vi-VN')}₫, còn thiếu so với ${order.amountVnd?.toLocaleString('vi-VN')}₫. Vui lòng liên hệ hỗ trợ.`,
        data: { orderId: order.id },
      })
    } else {
      await notify(tx, order.userId, {
        kind: 'payment',
        title: `Nhận tiền cho đơn #${shortId(order.id)} đã ${order.status === 'cancelled' ? 'huỷ' : 'thanh toán'}`,
        body: 'Chúng tôi sẽ liên hệ để hoàn lại khoản tiền này.',
        data: { orderId: order.id },
      })
    }
    return result
  })
}

/**
 * Webhook SePay. Trả 200 `{ success: true }` cho mọi giao dịch hợp lệ (kể cả không khớp đơn)
 * để SePay không gửi lại; chỉ trả lỗi khi sai API key hoặc payload hỏng.
 */
export function paymentWebhookRoutes(db: Db, config: SepayConfig) {
  return new Hono().post('/payments/webhook', async (c) => {
    if (!verifyApiKey(c.req.header('Authorization'), config.webhookApiKey)) {
      throw new AppError(401, 'UNAUTHORIZED', 'API key không hợp lệ')
    }
    const parsed = sepayWebhookSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Payload webhook không hợp lệ')
    const result = await applySepayTransaction(db, config, parsed.data)
    return c.json({ success: true, result })
  })
}
