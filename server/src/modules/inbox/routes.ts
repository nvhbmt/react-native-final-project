import { and, count, desc, eq, isNull, lt, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { inboxMessages, type InboxMessageRow } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth, type AuthVariables } from '@/middleware/auth.ts'

const listQuery = z.object({
  limit: z.string().regex(/^\d{1,2}$/).transform(Number).pipe(z.number().int().min(1).max(50)).default(20),
  cursor: z.uuid().optional(),
  unread: z.enum(['1', 'true']).optional(),
})

const serialize = (row: InboxMessageRow) => ({
  id: row.id, kind: row.kind, title: row.title, body: row.body, data: row.data ?? {},
  read: row.readAt !== null, createdAt: row.createdAt.getTime(),
})

export function inboxRoutes(db: Db, accessSecret: string) {
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/inbox', requireAuth(accessSecret))
  app.use('/inbox/*', requireAuth(accessSecret))

  const unreadCount = async (userId: string) => {
    const [row] = await db.select({ total: count() }).from(inboxMessages)
      .where(and(eq(inboxMessages.userId, userId), isNull(inboxMessages.readAt)))
    return row?.total ?? 0
  }

  return app
    .get('/inbox', validate('query', listQuery), async (c) => {
      const userId = c.var.auth.sub
      const { limit, cursor, unread } = c.req.valid('query')
      const mine = and(eq(inboxMessages.userId, userId), unread ? isNull(inboxMessages.readAt) : undefined)
      const [anchor] = cursor
        ? await db.select({ id: inboxMessages.id, createdAt: inboxMessages.createdAt }).from(inboxMessages).where(and(mine, eq(inboxMessages.id, cursor)))
        : []
      if (cursor && !anchor) throw new AppError(400, 'INVALID_CURSOR', 'Cursor không hợp lệ')
      const rows = await db.select().from(inboxMessages)
        .where(and(mine, anchor ? or(
          lt(inboxMessages.createdAt, anchor.createdAt),
          and(eq(inboxMessages.createdAt, anchor.createdAt), lt(inboxMessages.id, anchor.id)),
        ) : undefined))
        .orderBy(desc(inboxMessages.createdAt), desc(inboxMessages.id))
        .limit(limit + 1)
      const items = rows.slice(0, limit)
      return ok(c, {
        items: items.map(serialize),
        nextCursor: rows.length > limit ? items.at(-1)!.id : null,
        unreadCount: await unreadCount(userId),
      })
    })
    .get('/inbox/unread-count', async (c) => ok(c, { unreadCount: await unreadCount(c.var.auth.sub) }))
    .post('/inbox/read-all', async (c) => {
      const userId = c.var.auth.sub
      await db.update(inboxMessages).set({ readAt: new Date() }).where(and(eq(inboxMessages.userId, userId), isNull(inboxMessages.readAt)))
      return ok(c, { unreadCount: 0 })
    })
    .post('/inbox/:id/read', validate('param', z.object({ id: z.uuid() })), async (c) => {
      const userId = c.var.auth.sub
      const where = and(eq(inboxMessages.id, c.req.valid('param').id), eq(inboxMessages.userId, userId))
      const [row] = await db.select({ id: inboxMessages.id }).from(inboxMessages).where(where)
      if (!row) throw new AppError(404, 'MESSAGE_NOT_FOUND', 'Không tìm thấy tin nhắn')
      await db.update(inboxMessages).set({ readAt: new Date() }).where(and(where, isNull(inboxMessages.readAt)))
      return ok(c, { unreadCount: await unreadCount(userId) })
    })
}
