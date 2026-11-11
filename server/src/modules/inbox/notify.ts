import type { Db } from '@/db/client.ts'
import { inboxMessages, type InboxMessageRow } from '@/db/schema.ts'

export type Notification = Pick<InboxMessageRow, 'kind' | 'title' | 'body'> & { data?: InboxMessageRow['data'] }

/** Gửi thông báo vào hộp thư của user. Dùng được trong transaction (truyền `tx`). */
export async function notify(db: Pick<Db, 'insert'>, userId: string, message: Notification) {
  await db.insert(inboxMessages).values({ userId, ...message, data: message.data ?? null })
}
