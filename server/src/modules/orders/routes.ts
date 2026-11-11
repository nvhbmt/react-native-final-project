import { createHash } from 'node:crypto'

import { and, desc, eq, lt, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { orders, type OrderRow } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth, type AuthVariables } from '@/middleware/auth.ts'
import { clearCart } from '@/modules/cart/routes.ts'
import { computeTotalsCents, priceLines, totalCents } from '@/modules/commerce/pricing.ts'
import { notify } from '@/modules/inbox/notify.ts'
import { createPaymentCode, qrImageUrl, toVnd, type SepayConfig } from '@/modules/payments/sepay.ts'

/** Thẻ demo (chỉ dev/test, không thu tiền). */
export const DEMO_METHODS = {
  pm_visa: { id: 'pm_visa', brand: 'visa', label: '2334', kind: 'demo_card' },
  pm_master: { id: 'pm_master', brand: 'mastercard', label: '3774', kind: 'demo_card' },
  pm_paypal: { id: 'pm_paypal', brand: 'paypal', label: 'demo@example.com', kind: 'demo_card' },
} as const
export const SEPAY_METHOD = { id: 'sepay', brand: 'vietqr', label: 'Chuyển khoản ngân hàng (VietQR)', kind: 'bank_transfer' } as const

const checkout = z.object({
  requestId: z.string().regex(/^[a-z0-9-]{12,100}$/),
  paymentMethod: z.enum(['sepay', 'pm_visa', 'pm_master', 'pm_paypal']),
  voucher: z.enum(['SALE10', 'FREESHIP']).optional(),
  items: z.array(z.object({
    productId: z.string().regex(/^[a-z0-9-]{1,160}$/),
    quantity: z.number().int().min(1).max(99),
    options: z.object({ color: z.string().min(1).max(100).optional(), size: z.string().min(1).max(40).optional() }).optional(),
  })).min(1).max(50),
})

const listQuery = z.object({
  limit: z.string().regex(/^\d{1,2}$/).transform(Number).pipe(z.number().int().min(1).max(50)).default(20),
  cursor: z.uuid().optional(),
})
const idParam = z.object({ id: z.uuid() })

export const shortId = (id: string) => id.slice(0, 8).toUpperCase()

/** Hướng dẫn chuyển khoản cho đơn đang chờ thanh toán SePay. */
function paymentInstructions(order: OrderRow, sepay?: SepayConfig) {
  if (order.status !== 'pending_payment' || !order.paymentCode || !order.amountVnd || !sepay) return null
  return {
    provider: 'sepay' as const,
    bank: sepay.bank,
    accountNumber: sepay.accountNumber,
    accountName: sepay.accountName,
    amountVnd: order.amountVnd,
    content: order.paymentCode,
    qrUrl: qrImageUrl(sepay, order.amountVnd, order.paymentCode),
    expiresAt: order.paymentExpiresAt?.getTime() ?? null,
    expired: Boolean(order.paymentExpiresAt && order.paymentExpiresAt.getTime() <= Date.now()),
  }
}

export function serializeOrder(order: OrderRow, sepay?: SepayConfig) {
  return {
    id: order.id,
    code: shortId(order.id),
    status: order.status,
    paymentMode: order.paymentMode,
    paymentMethod: order.paymentMethod === 'sepay' ? SEPAY_METHOD : DEMO_METHODS[order.paymentMethod as keyof typeof DEMO_METHODS],
    createdAt: order.createdAt.getTime(),
    paidAt: order.paidAt?.getTime() ?? null,
    cancelledAt: order.cancelledAt?.getTime() ?? null,
    // Đơn đã trả tiền thật cần hoàn tiền thủ công nên người dùng không tự huỷ được.
    cancellable: order.status === 'pending_payment' || (order.status === 'completed' && order.paymentMode === 'demo'),
    items: order.items.map(({ priceCents, ...item }) => ({ ...item, price: priceCents / 100 })),
    subtotal: order.subtotalCents / 100,
    discount: order.discountCents / 100,
    tax: order.taxCents / 100,
    fees: 0,
    total: totalCents(order) / 100,
    amountVnd: order.amountVnd,
    payment: paymentInstructions(order, sepay),
  }
}

export type OrderOptions = { allowDemo: boolean; sepay?: SepayConfig }

export function orderRoutes(db: Db, accessSecret: string, options: OrderOptions) {
  const { allowDemo, sepay } = options
  const serialize = (order: OrderRow) => serializeOrder(order, sepay)
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/orders', requireAuth(accessSecret))
  app.use('/orders/*', requireAuth(accessSecret))
  app.use('/payment-methods', requireAuth(accessSecret))

  async function findOwn(id: string, userId: string) {
    const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, userId)))
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng')
    return order
  }

  return app
    /** Phương thức thanh toán khả dụng: SePay khi đã cấu hình, thẻ demo khi chạy dev/test. */
    .get('/payment-methods', (c) => ok(c, [
      ...(sepay ? [SEPAY_METHOD] : []),
      ...(allowDemo ? Object.values(DEMO_METHODS) : []),
    ]))
    .post('/orders', validate('json', checkout), async (c) => {
      const userId = c.var.auth.sub
      const input = c.req.valid('json')
      const viaSepay = input.paymentMethod === 'sepay'
      if (viaSepay ? !sepay : !allowDemo) throw new AppError(503, 'CHECKOUT_UNAVAILABLE', 'Phương thức thanh toán này hiện không khả dụng')

      const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
      const lookup = and(eq(orders.userId, userId), eq(orders.requestId, input.requestId))
      const [existing] = await db.select().from(orders).where(lookup)
      if (existing) {
        if (existing.requestHash !== requestHash) throw new AppError(409, 'ORDER_REQUEST_CONFLICT', 'Yêu cầu đặt hàng này đã được dùng')
        return ok(c, serialize(existing))
      }

      const items = await priceLines(db, input.items)
      if (new Set(items.map(({ key }) => key)).size !== items.length) {
        throw new AppError(400, 'DUPLICATE_ORDER_ITEM', 'Gộp các dòng giống nhau trước khi thanh toán')
      }
      const totals = computeTotalsCents(items, input.voucher)
      if (totals.subtotalCents > 2_000_000_000) throw new AppError(400, 'ORDER_LIMIT', 'Đơn hàng vượt quá giới hạn thanh toán')

      const payment = viaSepay && sepay
        ? {
            status: 'pending_payment' as const,
            paymentMode: 'verified' as const,
            paymentCode: createPaymentCode(sepay.codePrefix),
            amountVnd: toVnd(totalCents(totals), sepay),
            paymentExpiresAt: new Date(Date.now() + sepay.ttlMinutes * 60_000),
          }
        : { status: 'completed' as const, paymentMode: 'demo' as const }
      const [created] = await db.insert(orders).values({
        userId, requestId: input.requestId, requestHash, paymentMethod: input.paymentMethod, items, ...totals, ...payment,
      }).onConflictDoNothing({ target: [orders.userId, orders.requestId] }).returning()

      if (created) {
        await clearCart(db, userId)
        const count = items.reduce((n, item) => n + item.quantity, 0)
        await notify(db, userId, viaSepay
          ? {
              kind: 'payment',
              title: `Chờ thanh toán đơn #${shortId(created.id)}`,
              body: `Chuyển ${created.amountVnd?.toLocaleString('vi-VN')}₫ với nội dung ${created.paymentCode} để hoàn tất đơn ${count} sản phẩm.`,
              data: { orderId: created.id },
            }
          : {
              kind: 'order',
              title: `Đặt hàng thành công #${shortId(created.id)}`,
              body: `Đơn gồm ${count} sản phẩm đã được ghi nhận.`,
              data: { orderId: created.id },
            })
        return ok(c, serialize(created), 201)
      }
      const [replayed] = await db.select().from(orders).where(lookup)
      if (!replayed || replayed.requestHash !== requestHash) throw new AppError(409, 'ORDER_REQUEST_CONFLICT', 'Yêu cầu đặt hàng này đã được dùng')
      return ok(c, serialize(replayed))
    })
    .get('/orders', validate('query', listQuery), async (c) => {
      const userId = c.var.auth.sub
      const { limit, cursor } = c.req.valid('query')
      const mine = eq(orders.userId, userId)
      const [anchor] = cursor ? await db.select({ id: orders.id, createdAt: orders.createdAt }).from(orders).where(and(mine, eq(orders.id, cursor))) : []
      if (cursor && !anchor) throw new AppError(400, 'INVALID_CURSOR', 'Cursor không hợp lệ')
      const rows = await db.select().from(orders)
        .where(and(mine, anchor ? or(lt(orders.createdAt, anchor.createdAt), and(eq(orders.createdAt, anchor.createdAt), lt(orders.id, anchor.id))) : undefined))
        .orderBy(desc(orders.createdAt), desc(orders.id)).limit(limit + 1)
      const page = rows.slice(0, limit)
      return ok(c, { items: page.map(serialize), nextCursor: rows.length > limit ? page.at(-1)!.id : null })
    })
    .get('/orders/:id', validate('param', idParam), async (c) => ok(c, serialize(await findOwn(c.req.valid('param').id, c.var.auth.sub))))
    /**
     * Lấy (hoặc gia hạn khi đã hết hạn) hướng dẫn chuyển khoản cho đơn đang chờ thanh toán.
     * Mã chuyển khoản giữ nguyên nên tiền chuyển theo QR cũ vẫn được ghi nhận.
     */
    .post('/orders/:id/pay', validate('param', idParam), async (c) => {
      const order = await findOwn(c.req.valid('param').id, c.var.auth.sub)
      if (order.status !== 'pending_payment' || !sepay) throw new AppError(409, 'ORDER_NOT_PAYABLE', 'Đơn hàng không ở trạng thái chờ thanh toán')
      if (order.paymentExpiresAt && order.paymentExpiresAt.getTime() > Date.now()) return ok(c, serialize(order))
      const [renewed] = await db.update(orders).set({ paymentExpiresAt: new Date(Date.now() + sepay.ttlMinutes * 60_000) })
        .where(and(eq(orders.id, order.id), eq(orders.status, 'pending_payment'))).returning()
      return ok(c, serialize(renewed ?? (await findOwn(order.id, order.userId))))
    })
    .post('/orders/:id/cancel', validate('param', idParam), async (c) => {
      const userId = c.var.auth.sub
      const order = await findOwn(c.req.valid('param').id, userId)
      if (order.status === 'cancelled') return ok(c, serialize(order))
      if (!serialize(order).cancellable) {
        throw new AppError(409, 'ORDER_NOT_CANCELLABLE', 'Đơn đã thanh toán không thể tự huỷ, vui lòng liên hệ hỗ trợ để hoàn tiền')
      }
      // Điều kiện status trong WHERE: nếu webhook vừa ghi nhận tiền thì không huỷ đè lên.
      const [cancelled] = await db.update(orders).set({ status: 'cancelled', cancelledAt: new Date() })
        .where(and(eq(orders.id, order.id), eq(orders.status, order.status))).returning()
      if (!cancelled) throw new AppError(409, 'ORDER_CHANGED', 'Đơn hàng vừa thay đổi trạng thái, vui lòng tải lại')
      await notify(db, userId, {
        kind: 'order', title: `Đã huỷ đơn #${shortId(cancelled.id)}`, body: 'Đơn hàng của bạn đã được huỷ.', data: { orderId: cancelled.id },
      })
      return ok(c, serialize(cancelled))
    })
}
