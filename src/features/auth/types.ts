/** Khớp `PublicUser` của server (`server/src/modules/auth/serialize.ts`). */
export type User = {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  phone: string | null
  role: 'customer' | 'admin'
  createdAt: string
}

export type AuthTokens = {
  tokenType: 'Bearer'
  accessToken: string
  expiresIn: number
  refreshToken: string
  refreshTokenExpiresAt: string
}

export type AuthSession = { user: User; tokens: AuthTokens }

export type LoginInput = { email: string; password: string }
export type RegisterInput = LoginInput & { fullName: string }
export type ChangePasswordInput = { currentPassword: string; newPassword: string }

/**
 * `unknown`: đang đọc phiên đã lưu lúc mở app.
 * `guest`: chưa đăng nhập (vẫn duyệt sản phẩm bình thường).
 */
export type AuthStatus = 'unknown' | 'guest' | 'authenticated'
