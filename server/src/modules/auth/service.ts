import { randomUUID } from 'node:crypto'

import type { UserRow } from '@/db/schema.ts'
import { AppError } from '@/lib/http.ts'
import { getDummyHash, hashPassword, verifyPassword } from '@/lib/password.ts'
import { createRefreshToken, hashRefreshToken, signAccessToken } from '@/lib/tokens.ts'
import type { AuthRepository } from './repository.ts'
import type { ChangePasswordInput, LoginInput, RegisterInput } from './schemas.ts'
import { toPublicUser, type PublicUser } from './serialize.ts'

export type AuthConfig = {
  accessSecret: string
  accessTtlSeconds: number
  refreshTtlSeconds: number
}

export type AuthTokens = {
  tokenType: 'Bearer'
  accessToken: string
  /** Số giây access token còn hiệu lực. */
  expiresIn: number
  refreshToken: string
  refreshTokenExpiresAt: string
}

export type AuthSession = { user: PublicUser; tokens: AuthTokens }

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng')
const invalidRefresh = () => new AppError(401, 'INVALID_REFRESH_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn')

export function createAuthService(repo: AuthRepository, config: AuthConfig) {
  async function issueTokens(user: UserRow, familyId: string, userAgent?: string): Promise<AuthTokens> {
    const accessToken = await signAccessToken({ sub: user.id, role: user.role }, config.accessSecret, config.accessTtlSeconds)
    const { token, hash } = createRefreshToken()
    const expiresAt = new Date(Date.now() + config.refreshTtlSeconds * 1000)

    await repo.insertRefreshToken({
      userId: user.id,
      familyId,
      tokenHash: hash,
      userAgent: userAgent?.slice(0, 255) ?? null,
      expiresAt,
    })

    return {
      tokenType: 'Bearer',
      accessToken,
      expiresIn: config.accessTtlSeconds,
      refreshToken: token,
      refreshTokenExpiresAt: expiresAt.toISOString(),
    }
  }

  async function startSession(user: UserRow, userAgent?: string): Promise<AuthSession> {
    return { user: toPublicUser(user), tokens: await issueTokens(user, randomUUID(), userAgent) }
  }

  return {
    async register(input: RegisterInput, userAgent?: string): Promise<AuthSession> {
      const passwordHash = await hashPassword(input.password)
      const user = await repo.createUser({ email: input.email, passwordHash, fullName: input.fullName })
      if (!user) throw new AppError(409, 'EMAIL_TAKEN', 'Email này đã được đăng ký')
      return startSession(user, userAgent)
    },

    async login(input: LoginInput, userAgent?: string): Promise<AuthSession> {
      const user = await repo.findUserByEmail(input.email)
      // Vẫn băm khi không có user để thời gian phản hồi không tiết lộ email nào tồn tại.
      const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()))
      if (!user || !valid) throw invalidCredentials()
      return startSession(user, userAgent)
    },

    /** Xoay vòng refresh token: thu hồi token cũ, cấp cặp token mới cùng family. */
    async refresh(refreshToken: string, userAgent?: string): Promise<AuthSession> {
      const stored = await repo.findRefreshToken(hashRefreshToken(refreshToken))
      if (!stored) throw invalidRefresh()

      if (stored.revokedAt) {
        // Token đã bị xoay vòng nhưng vẫn được dùng lại → có thể đã bị lộ. Huỷ cả chuỗi.
        await repo.revokeFamily(stored.familyId)
        throw new AppError(401, 'REFRESH_TOKEN_REUSED', 'Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại')
      }
      if (stored.expiresAt.getTime() <= Date.now()) throw invalidRefresh()

      // Hai request refresh song song với cùng token: chỉ một bên thắng, bên kia nhận 401
      // nhưng không huỷ family (đây là race hợp lệ phía client, không phải bị đánh cắp).
      if (!(await repo.revokeRefreshToken(stored.id))) throw invalidRefresh()

      const user = await repo.findUserById(stored.userId)
      if (!user) throw invalidRefresh()

      return { user: toPublicUser(user), tokens: await issueTokens(user, stored.familyId, userAgent) }
    },

    /** Đăng xuất thiết bị hiện tại. Idempotent: token không tồn tại cũng coi như thành công. */
    async logout(refreshToken: string): Promise<void> {
      const stored = await repo.findRefreshToken(hashRefreshToken(refreshToken))
      if (stored) await repo.revokeFamily(stored.familyId)
    },

    async logoutAll(userId: string): Promise<void> {
      await repo.revokeAllForUser(userId)
    },

    async me(userId: string): Promise<PublicUser> {
      const user = await repo.findUserById(userId)
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại')
      return toPublicUser(user)
    },

    /** Đổi mật khẩu → đăng xuất mọi thiết bị khác, trả phiên mới cho thiết bị hiện tại. */
    async changePassword(userId: string, input: ChangePasswordInput, userAgent?: string): Promise<AuthSession> {
      const user = await repo.findUserById(userId)
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại')
      if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
        throw new AppError(400, 'WRONG_PASSWORD', 'Mật khẩu hiện tại không đúng')
      }

      await repo.updatePassword(userId, await hashPassword(input.newPassword))
      await repo.revokeAllForUser(userId)
      const updated = (await repo.findUserById(userId)) ?? user
      return startSession(updated, userAgent)
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
