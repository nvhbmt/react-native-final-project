import { and, desc, eq, lt, or, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { orders, users, type OrderRow } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth, type AuthVariables } from '@/middleware/auth.ts'
import { advanceFulfillment, nextFulfillment, serializeOrder } from '@/modules/orders/routes.ts'
import type { SepayConfig } from '@/modules/payments/sepay.ts'

const FULFILLMENT = ['processing', 'shipping', 'delivered'] as const
const STATUS = ['pending_payment', 'completed', 'cancelled'] as const

const listQuery = z.object({
  fulfillment: z.enum(FULFILLMENT).optional(),
  status: z.enum(STATUS).optional(),
  limit: z.string().regex(/^\d{1,2}$/).transform(Number).pipe(z.number().int().min(1).max(50)).default(20),
  cursor: z.uuid().optional(),
})
const idParam = z.object({ id: z.uuid() })
const fulfillmentInput = z.object({ to: z.enum(['shipping', 'delivered']) })

/**
 * Quyền admin kiểm tra lại trong DB ở mỗi request (không chỉ tin `role` trong access token),
 * để thu quyền bằng `npm run admin:grant -- <email> --revoke` có hiệu lực ngay.
 */
function requireAdmin(db: Db) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, c.var.auth.sub))
    if (user?.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
    await next()
  })
}

type Customer = { id: string; fullName: string; email: string }

/**
 * Trang quản trị giao hàng (production): xem đơn của mọi khách, chuyển bước Đang xử lý → Đang giao → Đã giao.
 * Mỗi lần chuyển ghi `fulfillmentUpdatedBy` và báo khách qua hộp thư.
 */
export function adminRoutes(db: Db, accessSecret: string, sepay?: SepayConfig) {
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/admin/*', requireAuth(accessSecret), requireAdmin(db))

  const serialize = (order: OrderRow, customer: Customer | null) => ({
    ...serializeOrder(order, sepay),
    customer,
    nextFulfillment: nextFulfillment(order),
    fulfillmentUpdatedBy: order.fulfillmentUpdatedBy,
  })

  async function findWithCustomer(id: string) {
    const [row] = await db.select({ order: orders, customer: { id: users.id, fullName: users.fullName, email: users.email } })
      .from(orders).leftJoin(users, eq(users.id, orders.userId)).where(eq(orders.id, id))
    if (!row) throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng')
    return row
  }

  return app
    /** Danh sách đơn mới nhất trước. Lọc `fulfillment` chỉ áp cho đơn đã thanh toán. */
    .get('/admin/orders', validate('query', listQuery), async (c) => {
      const { fulfillment, status, limit, cursor } = c.req.valid('query')
      const filters: SQL[] = []
      if (fulfillment) filters.push(eq(orders.status, 'completed'), eq(orders.fulfillment, fulfillment))
      if (status) filters.push(eq(orders.status, status))
      if (cursor) {
        const [anchor] = await db.select({ id: orders.id, createdAt: orders.createdAt }).from(orders).where(eq(orders.id, cursor))
        if (!anchor) throw new AppError(400, 'INVALID_CURSOR', 'Cursor không hợp lệ')
        filters.push(or(lt(orders.createdAt, anchor.createdAt), and(eq(orders.createdAt, anchor.createdAt), lt(orders.id, anchor.id)))!)
      }
      const rows = await db.select({ order: orders, customer: { id: users.id, fullName: users.fullName, email: users.email } })
        .from(orders).leftJoin(users, eq(users.id, orders.userId))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(orders.createdAt), desc(orders.id)).limit(limit + 1)
      const page = rows.slice(0, limit)
      return ok(c, {
        items: page.map(({ order, customer }) => serialize(order, customer)),
        nextCursor: rows.length > limit ? page.at(-1)!.order.id : null,
      })
    })
    .get('/admin/orders/:id', validate('param', idParam), async (c) => {
      const { order, customer } = await findWithCustomer(c.req.valid('param').id)
      return ok(c, serialize(order, customer))
    })
    /**
     * Chuyển sang bước giao hàng kế tiếp. `to` phải đúng bước kế tiếp (không nhảy cóc, không lùi):
     * gửi lại cùng `to` sau khi đã chuyển → `409 ORDER_CHANGED`, giúp hai admin không ghi đè nhau.
     */
    .post('/admin/orders/:id/fulfillment', validate('param', idParam), validate('json', fulfillmentInput), async (c) => {
      const { order, customer } = await findWithCustomer(c.req.valid('param').id)
      const next = nextFulfillment(order)
      if (!next) throw new AppError(409, 'ORDER_NOT_ADVANCEABLE', 'Đơn hàng không thể chuyển sang bước tiếp theo')
      if (next !== c.req.valid('json').to) {
        throw new AppError(409, 'ORDER_CHANGED', 'Đơn hàng vừa thay đổi trạng thái, vui lòng tải lại')
      }
      return ok(c, serialize(await advanceFulfillment(db, order, c.var.auth.sub), customer))
    })
}
