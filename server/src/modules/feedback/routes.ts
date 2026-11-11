import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { catalogProducts, feedback, orders } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { rateLimit } from '@/lib/rateLimit.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth, type AuthVariables } from '@/middleware/auth.ts'
import { notify } from '@/modules/inbox/notify.ts'
import { requireOwnUploads, uploadUrl } from '@/modules/uploads/routes.ts'

export const FEEDBACK_TOPICS = ['Service', 'Quantity', 'Payment', 'Delivery', 'Promotion', 'Gift'] as const

const feedbackInput = z.object({
  mood: z.enum(['sad', 'neutral', 'happy']).nullable().optional(),
  topics: z.array(z.enum(FEEDBACK_TOPICS)).max(FEEDBACK_TOPICS.length).default([]),
  comment: z.string().trim().max(2000).default(''),
  /** Id ảnh đã upload với `purpose=feedback`. */
  imageIds: z.array(z.uuid()).max(5).default([]),
  rating: z.number().int().min(1).max(5),
  productId: z.string().regex(/^[a-z0-9-]{1,160}$/).optional(),
  orderId: z.uuid().optional(),
})

const serialize = (row: typeof feedback.$inferSelect) => ({
  id: row.id, mood: row.mood, topics: row.topics, comment: row.comment, images: row.images, rating: row.rating,
  productId: row.productId, orderId: row.orderId, createdAt: row.createdAt.getTime(),
})

export function feedbackRoutes(db: Db, accessSecret: string) {
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/feedback', requireAuth(accessSecret))
  const limit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, key: (c) => `feedback:${(c.get('auth' as never) as { sub: string }).sub}` })

  return app
    .post('/feedback', limit, validate('json', feedbackInput), async (c) => {
      const userId = c.var.auth.sub
      const input = c.req.valid('json')
      const images = await requireOwnUploads(db, userId, input.imageIds, 'feedback')
      if (input.productId) {
        const [product] = await db.select({ id: catalogProducts.id }).from(catalogProducts).where(eq(catalogProducts.id, input.productId))
        if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm')
      }
      if (input.orderId) {
        const [order] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)))
        if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng')
      }
      const created = await db.transaction(async (tx) => {
        const [row] = await tx.insert(feedback).values({
          userId, mood: input.mood ?? null, topics: [...new Set(input.topics)], comment: input.comment,
          images: images.map(uploadUrl), rating: input.rating, productId: input.productId ?? null, orderId: input.orderId ?? null,
        }).returning()
        await notify(tx, userId, {
          kind: 'feedback',
          title: 'Cảm ơn bạn đã góp ý',
          body: 'Chúng tôi đã nhận được góp ý của bạn và sẽ dùng nó để cải thiện dịch vụ.',
          data: input.orderId ? { orderId: input.orderId } : undefined,
        })
        return row!
      })
      return ok(c, serialize(created), 201)
    })
    .get('/feedback', async (c) => {
      const rows = await db.select().from(feedback).where(eq(feedback.userId, c.var.auth.sub)).orderBy(desc(feedback.createdAt)).limit(100)
      return ok(c, rows.map(serialize))
    })
}
