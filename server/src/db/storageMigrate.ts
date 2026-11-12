/**
 * Chuyển ảnh cũ đang nằm trên ổ đĩa (UPLOAD_DIR) lên Supabase Storage và cập nhật URL trong DB.
 *
 *   npm run storage:migrate            # chạy thử: chỉ liệt kê, không ghi gì
 *   npm run storage:migrate -- --apply # tải lên và cập nhật DB
 *
 * Chạy lại an toàn: chỉ xử lý bản ghi `uploads.url` còn trống. Cập nhật cả `users.avatar_url` và
 * `feedback.images` đang trỏ `/uploads/<file>`. File không còn trên ổ đĩa thì bỏ qua và báo lại.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { eq, isNull, sql } from 'drizzle-orm'

import { loadEnv, storageConfig } from '@/env.ts'
import { createSupabaseStorage } from '@/lib/storage.ts'

import { createDb } from './client.ts'
import { feedback, uploads, users } from './schema.ts'

const env = loadEnv()
const config = storageConfig(env)
if (!config) {
  console.error('Chưa cấu hình Supabase Storage: đặt SUPABASE_URL và SUPABASE_SECRET_KEY trong server/.env.')
  process.exit(1)
}
const apply = process.argv.includes('--apply')
const storage = createSupabaseStorage(config)
const { db, close } = createDb(env.DATABASE_URL)

try {
  const pending = await db.select().from(uploads).where(isNull(uploads.url))
  console.log(`${pending.length} ảnh chưa có trên Supabase Storage${apply ? '' : ' (chạy thử — thêm `-- --apply` để ghi)'}`)
  let moved = 0
  const missing: string[] = []
  for (const row of pending) {
    const bytes = await readFile(join(env.UPLOAD_DIR, row.fileName)).catch(() => null)
    if (!bytes) { missing.push(row.fileName); continue }
    if (!apply) { moved++; continue }
    const oldUrl = `/uploads/${row.fileName}`
    const newUrl = storage.publicUrl(row.fileName)
    await storage.put(row.fileName, new Uint8Array(bytes), row.mimeType)
    await db.transaction(async (tx) => {
      await tx.update(uploads).set({ url: newUrl }).where(eq(uploads.id, row.id))
      await tx.update(users).set({ avatarUrl: newUrl }).where(eq(users.avatarUrl, oldUrl))
      await tx.update(feedback).set({ images: sql`array_replace(${feedback.images}, ${oldUrl}, ${newUrl})` })
        .where(sql`${oldUrl} = any(${feedback.images})`)
    })
    moved++
  }
  console.log(`${apply ? 'Đã chuyển' : 'Sẽ chuyển'}: ${moved}. Không tìm thấy file trên ổ đĩa: ${missing.length}${missing.length ? ` (${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''})` : ''}`)
} finally {
  await close()
}
