import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { catalogProducts, favorites } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth, type AuthVariables } from '@/middleware/auth.ts'
import { productSummary } from '@/modules/catalog/service.ts'

const params = z.object({ productId: z.string().regex(/^[a-z0-9-]{1,160}$/) })

export function favoriteRoutes(db: Db, accessSecret: string) {
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/favorites', requireAuth(accessSecret))
  app.use('/favorites/*', requireAuth(accessSecret))

  return app
    /** Danh sách đầy đủ (mới nhất trước) + mảng id để app tô tim nhanh. */
    .get('/favorites', async (c) => {
      const rows = await db.select({ product: catalogProducts, likedAt: favorites.createdAt }).from(favorites)
        .innerJoin(catalogProducts, eq(favorites.productId, catalogProducts.id))
        .where(eq(favorites.userId, c.var.auth.sub))
        .orderBy(desc(favorites.createdAt))
        .limit(500)
      return ok(c, {
        items: rows.map(({ product, likedAt }) => ({ ...productSummary(product), likedAt: likedAt.getTime() })),
        ids: rows.map(({ product }) => product.id),
      })
    })
    .put('/favorites/:productId', validate('param', params), async (c) => {
      const { productId } = c.req.valid('param')
      const [product] = await db.select({ id: catalogProducts.id }).from(catalogProducts).where(eq(catalogProducts.id, productId))
      if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm')
      await db.insert(favorites).values({ userId: c.var.auth.sub, productId }).onConflictDoNothing()
      return ok(c, { productId, favorite: true })
    })
    .delete('/favorites/:productId', validate('param', params), async (c) => {
      const { productId } = c.req.valid('param')
      await db.delete(favorites).where(and(eq(favorites.userId, c.var.auth.sub), eq(favorites.productId, productId)))
      return ok(c, { productId, favorite: false })
    })
}
