/**
 * Cấp hoặc thu quyền admin (trang Quản lý giao hàng) cho một tài khoản đã đăng ký.
 *
 *   npm run admin:grant -- admin@example.com            # cấp quyền
 *   npm run admin:grant -- admin@example.com --revoke   # thu quyền
 *
 * Dùng được ở mọi môi trường (kể cả production) vì app không có màn đăng ký admin.
 * Thu quyền có hiệu lực ngay (API kiểm tra role trong DB mỗi request). Cấp quyền: người dùng mở lại app
 * hoặc đăng nhập lại để menu "Quản lý giao hàng" hiện ra.
 */
import { eq } from 'drizzle-orm'

import { createDb } from './client.ts'
import { users } from './schema.ts'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Thiếu DATABASE_URL')

const args = process.argv.slice(2)
const email = args.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase()
const revoke = args.includes('--revoke')
if (!email) {
  console.error('Cách dùng: npm run admin:grant -- <email> [--revoke]')
  process.exit(1)
}

const { db, close } = createDb(databaseUrl)
try {
  const [user] = await db.update(users).set({ role: revoke ? 'customer' : 'admin', updatedAt: new Date() })
    .where(eq(users.email, email)).returning({ fullName: users.fullName, role: users.role })
  if (!user) {
    console.error(`Không tìm thấy tài khoản ${email}. Tài khoản cần đăng ký trong app trước.`)
    process.exitCode = 1
  } else {
    console.log(`${user.fullName} <${email}> → role: ${user.role}`)
  }
} finally {
  await close()
}
