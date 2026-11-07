import type { UserRow } from '../../db/schema.ts'

/**
 * Cổng duy nhất để dữ liệu user rời server. Liệt kê tường minh từng field
 * để `passwordHash` (và field nhạy cảm thêm sau này) không bao giờ lọt ra ngoài.
 */
export type PublicUser = {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  role: UserRow['role']
  createdAt: string
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  }
}
