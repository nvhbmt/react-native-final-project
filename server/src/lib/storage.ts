import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Nơi lưu ảnh upload. Tên file là UUID ngẫu nhiên do server đặt (không lấy từ client).
 * - Ổ đĩa: dev/test; ảnh mất khi deploy lại trên host không có volume bền vững.
 * - Supabase Storage: production; bucket public, URL tuyệt đối dùng thẳng trong app.
 */
export interface ObjectStorage {
  readonly kind: 'disk' | 'supabase'
  put(name: string, bytes: Uint8Array, mimeType: string): Promise<void>
  /** URL lưu vào DB và trả cho app: tương đối (`/uploads/…`, app ghép với địa chỉ API) hoặc tuyệt đối. */
  publicUrl(name: string): string
}

export function createDiskStorage(dir: string): ObjectStorage {
  return {
    kind: 'disk',
    async put(name, bytes) {
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, name), bytes)
    },
    publicUrl: (name) => `/uploads/${name}`,
  }
}

export type SupabaseStorageConfig = {
  /** URL dự án, vd. `https://abcd1234.supabase.co`. */
  url: string
  /**
   * Secret key mới (`sb_secret_…`) hoặc khoá `service_role` cũ (JWT `eyJ…`) — chỉ ở server, không bao giờ gửi về app.
   */
  serviceKey: string
  bucket: string
  fetch?: typeof fetch
}

/** Supabase Storage qua REST API (không cần thêm thư viện). */
export function createSupabaseStorage(config: SupabaseStorageConfig): ObjectStorage & { ensureBucket(): Promise<'created' | 'exists'> } {
  const base = config.url.replace(/\/+$/, '')
  const http = config.fetch ?? fetch
  // Khoá mới không phải JWT: Supabase yêu cầu gửi trong `apikey`, KHÔNG gửi qua `Authorization: Bearer`.
  // Khoá service_role cũ (JWT) cần cả hai header.
  const isLegacyJwt = config.serviceKey.startsWith('eyJ')
  const headers: Record<string, string> = isLegacyJwt
    ? { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` }
    : { apikey: config.serviceKey }
  const object = (name: string) => `${base}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodeURIComponent(name)}`

  async function failure(response: Response, action: string) {
    const body = await response.text().catch(() => '')
    // Không đưa key vào lỗi; body của Supabase chỉ có thông báo lỗi.
    return new Error(`Supabase Storage ${action} lỗi ${response.status}: ${body.slice(0, 200)}`)
  }

  return {
    kind: 'supabase',
    async put(name, bytes, mimeType) {
      const response = await http(object(name), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': mimeType, 'Cache-Control': 'max-age=31536000', 'x-upsert': 'false' },
        body: bytes,
      })
      if (!response.ok) throw await failure(response, 'upload')
    },
    publicUrl: (name) => `${base}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${encodeURIComponent(name)}`,
    /** Tạo bucket public nếu chưa có (giới hạn 5MB, chỉ JPEG/PNG/WebP — khớp kiểm tra của API). */
    async ensureBucket() {
      const existing = await http(`${base}/storage/v1/bucket/${encodeURIComponent(config.bucket)}`, { headers })
      if (existing.ok) return 'exists'
      const created = await http(`${base}/storage/v1/bucket`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: config.bucket, name: config.bucket, public: true,
          file_size_limit: 5 * 1024 * 1024, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      })
      if (!created.ok) throw await failure(created, 'tạo bucket')
      return 'created'
    },
  }
}
