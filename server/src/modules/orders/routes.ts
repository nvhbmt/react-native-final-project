import { createHash } from 'node:crypto'

import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { orders } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth } from '@/middleware/auth.ts'
import { clearCart } from '@/modules/cart/routes.ts'
import { computeTotalsCents, priceLines } from '@/modules/commerce/pricing.ts'

const paymentMethods = {
  pm_visa: { id: 'pm_visa', brand: 'visa', label: '2334' },
  pm_master: { id: 'pm_master', brand: 'mastercard', label: '3774' },
  pm_paypal: { id: 'pm_paypal', brand: 'paypal', label: 'demo@example.com' },
} as const

const checkout = z.object({
  requestId: z.string().regex(/^[a-z0-9-]{12,100}$/),
  paymentMethod: z.enum(['pm_visa', 'pm_master', 'pm_paypal']),
  voucher: z.enum(['SALE10', 'FREESHIP']).optional(),
  items: z.array(z.object({
    productId: z.string().regex(/^[a-z0-9-]{1,160}$/),
    quantity: z.number().int().min(1).max(99),
    options: z.object({ color: z.string().min(1).max(100).optional(), size: z.string().min(1).max(40).optional() }).optional(),
  })).min(1).max(50),
})

function serialize(order: typeof orders.$inferSelect) {
  return {
    id: order.id,
    status: order.status,
    paymentMode: order.paymentMode,
    paymentMethod: paymentMethods[order.paymentMethod as keyof typeof paymentMethods],
    createdAt: order.createdAt.getTime(),
    items: order.items.map(({ priceCents, ...item }) => ({ ...item, price: priceCents / 100 })),
    subtotal: order.subtotalCents / 100,
    discount: order.discountCents / 100,
    tax: order.taxCents / 100,
    fees: 0,
    total: (order.subtotalCents - order.discountCents + order.taxCents) / 100,
  }
}

export function orderRoutes(db: Db, accessSecret: string, allowDemo: boolean) {
  const auth = requireAuth(accessSecret)
  return new Hono()
    .post('/orders', auth, validate('json', checkout), async (c) => {
      if (!allowDemo) throw new AppError(503, 'CHECKOUT_UNAVAILABLE', 'Payment is unavailable.')

      const userId = c.var.auth.sub
      const input = c.req.valid('json')
      const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
      const lookup = and(eq(orders.userId, userId), eq(orders.requestId, input.requestId))
      const [existing] = await db.select().from(orders).where(lookup)
      if (existing) {
        if (existing.requestHash !== requestHash) throw new AppError(409, 'ORDER_REQUEST_CONFLICT', 'This checkout request has already been used.')
        return ok(c, serialize(existing))
      }

      const items = await priceLines(db, input.items)
      if (new Set(items.map(({ key }) => key)).size !== items.length) {
        throw new AppError(400, 'DUPLICATE_ORDER_ITEM', 'Combine matching items before checkout.')
      }
      const { subtotalCents, discountCents, taxCents } = computeTotalsCents(items, input.voucher)
      if (subtotalCents > 2_000_000_000) throw new AppError(400, 'ORDER_LIMIT', 'This order exceeds the checkout limit.')
      const [created] = await db.insert(orders).values({
        userId, requestId: input.requestId, requestHash, paymentMethod: input.paymentMethod,
        status: 'completed', paymentMode: 'demo', items, subtotalCents, discountCents, taxCents,
      }).onConflictDoNothing({ target: [orders.userId, orders.requestId] }).returning()
      if (created) {
        await clearCart(db, userId)
        return ok(c, serialize(created), 201)
      }
      const [replayed] = await db.select().from(orders).where(lookup)
      if (!replayed || replayed.requestHash !== requestHash) throw new AppError(409, 'ORDER_REQUEST_CONFLICT', 'This checkout request has already been used.')
      return ok(c, serialize(replayed))
    })
    .get('/orders/:id', auth, validate('param', z.object({ id: z.uuid() })), async (c) => {
      const [order] = await db.select().from(orders).where(and(eq(orders.id, c.req.valid('param').id), eq(orders.userId, c.var.auth.sub)))
      if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.')
      return ok(c, serialize(order))
    })
}
