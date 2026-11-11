/**
 * Tạo bucket Supabase Storage (public, ≤ 5MB, chỉ JPEG/PNG/WebP) nếu chưa có.
 *
 *   npm run storage:setup
 *
 * Cần SUPABASE_URL + SUPABASE_SECRET_KEY trong .env (key không được in ra).
 */
import { loadEnv, storageConfig } from '@/env.ts'
import { createSupabaseStorage } from '@/lib/storage.ts'

const config = storageConfig(loadEnv())
if (!config) {
  console.error('Chưa cấu hình Supabase Storage: đặt SUPABASE_URL và SUPABASE_SECRET_KEY trong server/.env.')
  process.exit(1)
}

const storage = createSupabaseStorage(config)
try {
  const result = await storage.ensureBucket()
  console.log(`Bucket "${config.bucket}": ${result === 'created' ? 'đã tạo (public)' : 'đã có sẵn'}`)
  console.log(`Ảnh mới sẽ có dạng: ${storage.publicUrl('<uuid>.jpg')}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
