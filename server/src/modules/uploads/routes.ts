import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { and, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { uploads, type UploadRow } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { rateLimit } from '@/lib/rateLimit.ts'
import { requireAuth, type AuthVariables } from '@/middleware/auth.ts'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const PURPOSES = ['avatar', 'feedback', 'review'] as const

/** Nhận diện ảnh bằng magic bytes — không tin Content-Type/đuôi file client gửi. */
export function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  const at = (i: number) => bytes[i]
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return { mime: 'image/png', ext: 'png' }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to))
  if (bytes.length > 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' }
  return null
}

/** URL tương đối mà app ghép với địa chỉ API (`/uploads/<file>`). */
export const uploadUrl = (row: Pick<UploadRow, 'fileName'>) => `/uploads/${row.fileName}`

export function serializeUpload(row: UploadRow) {
  return { id: row.id, url: uploadUrl(row), purpose: row.purpose, mimeType: row.mimeType, size: row.sizeBytes }
}

/** Lấy các upload thuộc user, đúng mục đích; ném 400 nếu có id lạ (của người khác / sai mục đích). */
export async function requireOwnUploads(db: Db, userId: string, ids: string[], purpose: UploadRow['purpose']) {
  if (!ids.length) return []
  const rows = await db.select().from(uploads)
    .where(and(eq(uploads.userId, userId), eq(uploads.purpose, purpose), inArray(uploads.id, ids)))
  if (rows.length !== new Set(ids).size) throw new AppError(400, 'INVALID_UPLOAD', 'Ảnh đính kèm không hợp lệ')
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.map((id) => byId.get(id)!)
}

export function uploadRoutes(db: Db, accessSecret: string, uploadDir: string) {
  const app = new Hono<{ Variables: AuthVariables }>()
  const perUser = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, key: (c) => `upload:${(c.get('auth' as never) as { sub?: string } | undefined)?.sub ?? 'anon'}` })

  return app
    .post(
      '/uploads',
      bodyLimit({ maxSize: Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 64 * 1024, onError: () => { throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Ảnh tối đa 5MB') } }),
      requireAuth(accessSecret),
      perUser,
      async (c) => {
        // Hai dạng: multipart (field `file`) hoặc JSON `{ purpose, data: <base64> }` — app mobile dùng base64
        // từ image picker vì gửi file qua FormData không ổn định giữa các nền tảng.
        const isJson = c.req.header('Content-Type')?.includes('application/json')
        const form: Record<string, unknown> = isJson
          ? await c.req.json().catch(() => ({}))
          : await c.req.parseBody().catch(() => {
              throw new AppError(400, 'BAD_REQUEST', 'Gửi ảnh dạng multipart/form-data (field "file") hoặc JSON { purpose, data }')
            })
        const purpose = z.enum(PURPOSES).safeParse(form.purpose)
        if (!purpose.success) throw new AppError(400, 'VALIDATION_ERROR', 'purpose phải là avatar, feedback hoặc review')
        let bytes: Uint8Array
        if (isJson) {
          const data = typeof form.data === 'string' ? form.data.replace(/^data:[^,]*,/, '') : ''
          if (!data || !/^[A-Za-z0-9+/=\s]+$/.test(data)) throw new AppError(400, 'VALIDATION_ERROR', 'Thiếu dữ liệu ảnh base64')
          bytes = new Uint8Array(Buffer.from(data, 'base64'))
        } else {
          const file = form.file
          if (!(file instanceof File)) throw new AppError(400, 'VALIDATION_ERROR', 'Thiếu file ảnh')
          bytes = new Uint8Array(await file.arrayBuffer())
        }
        if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Ảnh tối đa 5MB')

        const kind = sniffImage(bytes)
        if (!kind) throw new AppError(415, 'UNSUPPORTED_IMAGE', 'Chỉ nhận ảnh JPEG, PNG hoặc WebP')

        const fileName = `${randomUUID()}.${kind.ext}`
        await mkdir(uploadDir, { recursive: true })
        await writeFile(join(uploadDir, fileName), bytes)
        const [row] = await db.insert(uploads).values({
          userId: c.var.auth.sub, purpose: purpose.data, fileName, mimeType: kind.mime, sizeBytes: bytes.length,
        }).returning()
        return ok(c, serializeUpload(row!), 201)
      },
    )
}

/** Phục vụ file đã upload (công khai, tên file là UUID ngẫu nhiên nên không đoán được). */
export function uploadFileRoutes(uploadDir: string) {
  const types: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  return new Hono().get('/:name', async (c) => {
    const match = c.req.param('name').match(/^[0-9a-f-]{36}\.(jpg|png|webp)$/)
    if (!match) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh')
    const data = await readFile(join(uploadDir, match[0])).catch(() => null)
    if (!data) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh')
    return c.body(data, 200, {
      'Content-Type': types[match[1]!]!,
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })
}
