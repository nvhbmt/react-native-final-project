import { and, asc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { cartItems, cartVouchers } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth, type AuthVariables } from '@/middleware/auth.ts'
import { computeTotalsCents, normalizeVoucher, priceLines, serializeItem, toDollars, VOUCHERS } from '@/modules/commerce/pricing.ts'

const MAX_QUANTITY = 99
const MAX_LINES = 50

const productId = z.string().regex(/^[a-z0-9-]{1,160}$/)
const options = z.object({
  color: z.string().min(1).max(100).optional(),
  size: z.string().min(1).max(40).optional(),
}).optional()
const lineInput = z.object({ productId, quantity: z.number().int().min(1).max(MAX_QUANTITY).default(1), options })
const keyParam = z.object({ key: z.string().min(1).max(320) })

export type CartView = Awaited<ReturnType<typeof loadCart>>

/** Đọc giỏ, định giá lại theo catalog hiện tại. Dòng có sản phẩm đã ngừng bán được đánh dấu `available: false`. */
export async function loadCart(db: Db, userId: string) {
  const [rows, [voucherRow]] = await Promise.all([
    db.select().from(cartItems).where(eq(cartItems.userId, userId)).orderBy(asc(cartItems.createdAt)),
    db.select().from(cartVouchers).where(eq(cartVouchers.userId, userId)),
  ])
  const priced = []
  for (const row of rows) {
    const line = { productId: row.productId, quantity: row.quantity, options: { color: row.color ?? undefined, size: row.size ?? undefined } }
    try {
      const [item] = await priceLines(db, [line])
      priced.push({ ...serializeItem(item!), available: true })
    } catch {
      priced.push({ key: row.key, productId: row.productId, name: row.productId, subtitle: '', image: '', price: 0, quantity: row.quantity, available: false })
    }
  }
  const voucher = voucherRow && VOUCHERS[voucherRow.code] ? { code: voucherRow.code, rate: VOUCHERS[voucherRow.code]!.rate } : null
  const payable = priced.filter((item) => item.available).map((item) => ({ priceCents: Math.round(item.price * 100), quantity: item.quantity }))
  return { items: priced, voucher, totals: toDollars(computeTotalsCents(payable, voucher?.code)) }
}

/** Cộng dồn số lượng (tối đa 99/dòng); dùng cho thêm sản phẩm và gộp giỏ khách khi đăng nhập. */
async function addLines(db: Db, userId: string, lines: z.infer<typeof lineInput>[]) {
  const priced = await priceLines(db, lines)
  const existing = new Set((await db.select({ key: cartItems.key }).from(cartItems).where(eq(cartItems.userId, userId))).map(({ key }) => key))
  const added = new Set(priced.map(({ key }) => key).filter((key) => !existing.has(key)))
  if (existing.size + added.size > MAX_LINES) throw new AppError(400, 'CART_LIMIT', 'Giỏ hàng tối đa 50 dòng sản phẩm')
  for (const item of priced) {
    await db.insert(cartItems).values({
      userId, key: item.key, productId: item.productId,
      color: item.options?.color ?? null, size: item.options?.size ?? null, quantity: item.quantity,
    }).onConflictDoUpdate({
      target: [cartItems.userId, cartItems.key],
      set: { quantity: sql`least(${cartItems.quantity} + excluded.quantity, ${MAX_QUANTITY})`, updatedAt: new Date() },
    })
  }
}

export async function clearCart(db: Pick<Db, 'delete'>, userId: string) {
  await db.delete(cartItems).where(eq(cartItems.userId, userId))
  await db.delete(cartVouchers).where(eq(cartVouchers.userId, userId))
}

export function cartRoutes(db: Db, accessSecret: string) {
  const auth = requireAuth(accessSecret)
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/cart', auth)
  app.use('/cart/*', auth)

  return app
    .get('/cart', async (c) => ok(c, await loadCart(db, c.var.auth.sub)))
    .post('/cart/items', validate('json', lineInput), async (c) => {
      await addLines(db, c.var.auth.sub, [c.req.valid('json')])
      return ok(c, await loadCart(db, c.var.auth.sub))
    })
    /** Gộp giỏ của khách (lưu trên máy) vào giỏ tài khoản sau khi đăng nhập. Bỏ qua dòng không hợp lệ. */
    .post('/cart/merge', validate('json', z.object({ items: z.array(lineInput).max(MAX_LINES), voucher: z.string().max(40).optional() })), async (c) => {
      const userId = c.var.auth.sub
      const { items, voucher } = c.req.valid('json')
      for (const line of items) {
        try {
          await addLines(db, userId, [line])
        } catch (error) {
          if (!(error instanceof AppError) || error.status >= 500) throw error
        }
      }
      const code = voucher ? normalizeVoucher(voucher) : null
      if (code) await db.insert(cartVouchers).values({ userId, code }).onConflictDoNothing()
      return ok(c, await loadCart(db, userId))
    })
    .patch('/cart/items/:key', validate('param', keyParam), validate('json', z.object({ quantity: z.number().int().min(0).max(MAX_QUANTITY) })), async (c) => {
      const userId = c.var.auth.sub
      const where = and(eq(cartItems.userId, userId), eq(cartItems.key, c.req.valid('param').key))
      const { quantity } = c.req.valid('json')
      const rows = quantity === 0
        ? await db.delete(cartItems).where(where).returning({ key: cartItems.key })
        : await db.update(cartItems).set({ quantity, updatedAt: new Date() }).where(where).returning({ key: cartItems.key })
      if (!rows.length) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Không tìm thấy sản phẩm trong giỏ')
      return ok(c, await loadCart(db, userId))
    })
    .delete('/cart/items/:key', validate('param', keyParam), async (c) => {
      const userId = c.var.auth.sub
      await db.delete(cartItems).where(and(eq(cartItems.userId, userId), eq(cartItems.key, c.req.valid('param').key)))
      return ok(c, await loadCart(db, userId))
    })
    .delete('/cart', async (c) => {
      await clearCart(db, c.var.auth.sub)
      return ok(c, await loadCart(db, c.var.auth.sub))
    })
    .post('/cart/voucher', validate('json', z.object({ code: z.string().min(1).max(40) })), async (c) => {
      const code = normalizeVoucher(c.req.valid('json').code)
      if (!code) throw new AppError(400, 'INVALID_VOUCHER', 'Mã giảm giá không hợp lệ')
      const userId = c.var.auth.sub
      await db.insert(cartVouchers).values({ userId, code })
        .onConflictDoUpdate({ target: cartVouchers.userId, set: { code, appliedAt: new Date() } })
      return ok(c, await loadCart(db, userId))
    })
    .delete('/cart/voucher', async (c) => {
      await db.delete(cartVouchers).where(eq(cartVouchers.userId, c.var.auth.sub))
      return ok(c, await loadCart(db, c.var.auth.sub))
    })
}
