import { and, asc, count, desc, eq, ne } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { addresses, users, type AddressRow } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { verifyPassword } from '@/lib/password.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth, type AuthVariables } from '@/middleware/auth.ts'
import { toPublicUser } from '@/modules/auth/serialize.ts'
import { requireOwnUploads, uploadUrl } from '@/modules/uploads/routes.ts'

const MAX_ADDRESSES = 10
const phone = z.string().trim().regex(/^\+?[0-9 .-]{8,20}$/, 'Số điện thoại không hợp lệ')
const profileInput = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(100).optional(),
  phone: phone.nullable().optional(),
  promoNotifications: z.boolean().optional(),
}).refine((value) => Object.values(value).some((field) => field !== undefined), 'Không có gì để cập nhật')
const addressInput = z.object({
  recipientName: z.string().trim().min(1, 'Vui lòng nhập tên người nhận').max(100),
  phone,
  line1: z.string().trim().min(1, 'Vui lòng nhập địa chỉ').max(200),
  city: z.string().trim().min(1, 'Vui lòng nhập tỉnh/thành phố').max(100),
  isDefault: z.boolean().optional(),
})
const idParam = z.object({ id: z.uuid() })

const serializeAddress = (row: AddressRow) => ({
  id: row.id, recipientName: row.recipientName, phone: row.phone, line1: row.line1, city: row.city, isDefault: row.isDefault,
})

export function userRoutes(db: Db, accessSecret: string) {
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/users/*', requireAuth(accessSecret))

  async function currentUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id))
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại')
    return user
  }
  const listAddresses = async (userId: string) =>
    (await db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.isDefault), asc(addresses.createdAt)))
      .map(serializeAddress)

  return app
    .patch('/users/me', validate('json', profileInput), async (c) => {
      const { fullName, phone: newPhone, promoNotifications } = c.req.valid('json')
      const [user] = await db.update(users).set({
        ...(fullName === undefined ? {} : { fullName }),
        ...(newPhone === undefined ? {} : { phone: newPhone }),
        ...(promoNotifications === undefined ? {} : { promoNotifications }),
        updatedAt: new Date(),
      }).where(eq(users.id, c.var.auth.sub)).returning()
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại')
      return ok(c, toPublicUser(user))
    })
    /** Đổi avatar bằng ảnh đã upload (`purpose=avatar`); `uploadId: null` để xoá avatar. */
    .put('/users/me/avatar', validate('json', z.object({ uploadId: z.uuid().nullable() })), async (c) => {
      const userId = c.var.auth.sub
      const { uploadId } = c.req.valid('json')
      const [upload] = uploadId ? await requireOwnUploads(db, userId, [uploadId], 'avatar') : []
      const [user] = await db.update(users).set({ avatarUrl: upload ? uploadUrl(upload) : null, updatedAt: new Date() })
        .where(eq(users.id, userId)).returning()
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại')
      return ok(c, toPublicUser(user))
    })
    /** Xoá tài khoản vĩnh viễn — yêu cầu nhập lại mật khẩu. Dữ liệu liên quan xoá theo cascade. */
    .delete('/users/me', validate('json', z.object({ password: z.string().min(1).max(128) })), async (c) => {
      const user = await currentUser(c.var.auth.sub)
      if (!(await verifyPassword(c.req.valid('json').password, user.passwordHash))) {
        throw new AppError(400, 'WRONG_PASSWORD', 'Mật khẩu không đúng')
      }
      await db.delete(users).where(eq(users.id, user.id))
      return ok(c, { deleted: true })
    })
    .get('/users/me/addresses', async (c) => ok(c, await listAddresses(c.var.auth.sub)))
    .post('/users/me/addresses', validate('json', addressInput), async (c) => {
      const userId = c.var.auth.sub
      const input = c.req.valid('json')
      await db.transaction(async (tx) => {
        const [{ total } = { total: 0 }] = await tx.select({ total: count() }).from(addresses).where(eq(addresses.userId, userId))
        if (total >= MAX_ADDRESSES) throw new AppError(400, 'ADDRESS_LIMIT', 'Tối đa 10 địa chỉ')
        const isDefault = input.isDefault || total === 0
        if (isDefault) await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId))
        await tx.insert(addresses).values({ ...input, userId, isDefault })
      })
      return ok(c, await listAddresses(userId), 201)
    })
    .patch('/users/me/addresses/:id', validate('param', idParam), validate('json', addressInput.partial()), async (c) => {
      const userId = c.var.auth.sub
      const { id } = c.req.valid('param')
      const { isDefault, ...fields } = c.req.valid('json')
      await db.transaction(async (tx) => {
        if (isDefault) await tx.update(addresses).set({ isDefault: false }).where(and(eq(addresses.userId, userId), ne(addresses.id, id)))
        const rows = await tx.update(addresses).set({ ...fields, ...(isDefault ? { isDefault: true } : {}) })
          .where(and(eq(addresses.id, id), eq(addresses.userId, userId))).returning({ id: addresses.id })
        if (!rows.length) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Không tìm thấy địa chỉ')
      })
      return ok(c, await listAddresses(userId))
    })
    .delete('/users/me/addresses/:id', validate('param', idParam), async (c) => {
      const userId = c.var.auth.sub
      await db.transaction(async (tx) => {
        const [removed] = await tx.delete(addresses).where(and(eq(addresses.id, c.req.valid('param').id), eq(addresses.userId, userId))).returning()
        if (removed?.isDefault) {
          const [next] = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, userId)).orderBy(asc(addresses.createdAt)).limit(1)
          if (next) await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id))
        }
      })
      return ok(c, await listAddresses(userId))
    })
}
