import { and, count, desc, eq, lt, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { catalogProducts, orders, productReviews, users } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth } from '@/middleware/auth.ts'

const productParams = z.object({ id: z.string().regex(/^[a-z0-9-]{1,160}$/) })
const reviewQuery = z.object({
  rating: z.enum(['1', '2', '3', '4', '5']).transform(Number).optional(),
  limit: z.string().regex(/^\d{1,2}$/).transform(Number).pipe(z.number().int().min(1).max(30)).default(10),
  cursor: z.uuid().optional(),
})
const reviewInput = z.object({ rating: z.number().int().min(1).max(5), content: z.string().trim().min(1).max(1000), orderId: z.uuid().optional() })

export function reviewRoutes(db: Db, accessSecret: string, allowDemo: boolean) {
  const auth = requireAuth(accessSecret)
  const purchaseMatches = (userId: string, productId: string, orderId?: string) => and(
    eq(orders.userId, userId),
    eq(orders.status, 'completed'),
    allowDemo ? undefined : eq(orders.paymentMode, 'verified'),
    orderId ? eq(orders.id, orderId) : undefined,
    sql`${orders.items} @> ${JSON.stringify([{ productId }])}::jsonb`,
  )
  async function requireProduct(id: string) {
    const [product] = await db.select({ id: catalogProducts.id }).from(catalogProducts).where(eq(catalogProducts.id, id))
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.')
  }

  return new Hono()
    .get('/products/:id/reviews', validate('param', productParams), validate('query', reviewQuery), async (c) => {
      const { id } = c.req.valid('param')
      const { rating, limit, cursor } = c.req.valid('query')
      await requireProduct(id)
      const productFilter = eq(productReviews.productId, id)
      const filter = and(productFilter, rating === undefined ? undefined : eq(productReviews.rating, rating))
      const [anchor] = cursor ? await db.select({ id: productReviews.id, createdAt: productReviews.createdAt })
        .from(productReviews).where(and(filter, eq(productReviews.id, cursor))) : []
      if (cursor && !anchor) throw new AppError(400, 'INVALID_CURSOR', 'This review cursor is invalid.')
      const [rows, totals] = await Promise.all([
        db.select({
          id: productReviews.id, content: productReviews.content, rating: productReviews.rating,
          author: users.fullName, avatar: users.avatarUrl, createdAt: productReviews.createdAt, purchaseMode: orders.paymentMode,
        }).from(productReviews)
          .innerJoin(users, eq(productReviews.userId, users.id))
          .innerJoin(orders, eq(productReviews.orderId, orders.id))
          .where(and(filter, anchor ? or(
            lt(productReviews.createdAt, anchor.createdAt),
            and(eq(productReviews.createdAt, anchor.createdAt), lt(productReviews.id, anchor.id)),
          ) : undefined))
          .orderBy(desc(productReviews.createdAt), desc(productReviews.id)).limit(limit + 1),
        db.select({ rating: productReviews.rating, total: count() }).from(productReviews).where(productFilter).groupBy(productReviews.rating),
      ])
      const breakdown: [number, number, number, number, number] = [0, 0, 0, 0, 0]
      let sum = 0
      let reviewCount = 0
      for (const row of totals) {
        breakdown[5 - row.rating] = row.total
        reviewCount += row.total
        sum += row.rating * row.total
      }
      const items = rows.slice(0, limit)
      return ok(c, {
        items,
        summary: { rating: reviewCount ? Math.round(sum * 10 / reviewCount) / 10 : null, reviewCount, breakdown },
        nextCursor: rows.length > limit ? items.at(-1)!.id : null,
      })
    })
    .get('/products/:id/reviews/eligibility', auth, validate('param', productParams), validate('query', z.object({ orderId: z.uuid().optional() })), async (c) => {
      const { id } = c.req.valid('param')
      await requireProduct(id)
      const userId = c.var.auth.sub
      const [review] = await db.select({ id: productReviews.id }).from(productReviews)
        .where(and(eq(productReviews.userId, userId), eq(productReviews.productId, id)))
      if (review) return ok(c, { eligible: false, reason: 'already_reviewed' })
      const [purchase] = await db.select({ id: orders.id }).from(orders).where(purchaseMatches(userId, id, c.req.valid('query').orderId)).limit(1)
      return ok(c, { eligible: Boolean(purchase), reason: purchase ? null : 'purchase_required' })
    })
    .post('/products/:id/reviews', auth, validate('param', productParams), validate('json', reviewInput), async (c) => {
      const { id } = c.req.valid('param')
      const { rating, content, orderId } = c.req.valid('json')
      await requireProduct(id)
      const userId = c.var.auth.sub
      const created = await db.transaction(async (tx) => {
        const [order] = await tx.select({ id: orders.id }).from(orders)
          .where(purchaseMatches(userId, id, orderId)).orderBy(desc(orders.createdAt), desc(orders.id)).limit(1).for('share')
        if (!order) throw new AppError(403, 'PURCHASE_REQUIRED', 'You can only review products from your completed orders.')
        const [review] = await tx.insert(productReviews).values({ userId, productId: id, orderId: order.id, rating, content })
          .onConflictDoNothing({ target: [productReviews.userId, productReviews.productId] }).returning({ id: productReviews.id })
        if (!review) throw new AppError(409, 'REVIEW_EXISTS', 'You have already reviewed this product.')
        return review
      })
      return ok(c, created, 201)
    })
}
