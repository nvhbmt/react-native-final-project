import { and, desc, eq, isNull, sql } from 'drizzle-orm'

import type { Db } from '@/db/client.ts'
import { passwordResets, refreshTokens, users, type PasswordResetRow, type RefreshTokenRow, type UserRow } from '@/db/schema.ts'

export type NewRefreshToken = Pick<RefreshTokenRow, 'userId' | 'familyId' | 'tokenHash' | 'userAgent' | 'expiresAt'>

/**
 * Lớp truy cập dữ liệu của auth. Service chỉ phụ thuộc interface này, nên unit test dùng
 * bản in-memory còn production dùng Postgres qua Drizzle.
 */
export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRow | undefined>
  findUserById(id: string): Promise<UserRow | undefined>
  /** Trả về `undefined` nếu email đã tồn tại. */
  createUser(input: { email: string; passwordHash: string; fullName: string }): Promise<UserRow | undefined>
  updatePassword(userId: string, passwordHash: string): Promise<void>

  insertRefreshToken(input: NewRefreshToken): Promise<void>
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | undefined>
  /** Thu hồi nguyên tử; `true` nếu lần gọi này là lần thu hồi (token còn hiệu lực trước đó). */
  revokeRefreshToken(id: string): Promise<boolean>
  revokeFamily(familyId: string): Promise<void>
  revokeAllForUser(userId: string): Promise<void>

  /** Tạo mã đặt lại mật khẩu mới và vô hiệu các mã cũ của user. */
  createPasswordReset(input: { userId: string; codeHash: string; expiresAt: Date }): Promise<void>
  /** Mã mới nhất còn hiệu lực (chưa dùng, chưa hết hạn). */
  findActivePasswordReset(userId: string): Promise<PasswordResetRow | undefined>
  /** Tăng số lần nhập sai, trả về số lần sau khi tăng. */
  recordPasswordResetAttempt(id: string): Promise<number>
  /** Đánh dấu đã dùng; `true` nếu lần gọi này là lần dùng đầu tiên. */
  consumePasswordReset(id: string): Promise<boolean>
}

const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } })?.code
    ?? (error as { cause?: { code?: string } })?.cause?.code
  return code === UNIQUE_VIOLATION
}

export function createDrizzleAuthRepository(db: Db): AuthRepository {
  return {
    async findUserByEmail(email) {
      const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1)
      return row
    },
    async findUserById(id) {
      const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      return row
    },
    async createUser(input) {
      try {
        const [row] = await db.insert(users).values(input).returning()
        return row
      } catch (error) {
        if (isUniqueViolation(error)) return undefined
        throw error
      }
    },
    async updatePassword(userId, passwordHash) {
      await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId))
    },

    async insertRefreshToken(input) {
      await db.insert(refreshTokens).values(input)
    },
    async findRefreshToken(tokenHash) {
      const [row] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1)
      return row
    },
    async revokeRefreshToken(id) {
      const rows = await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)))
        .returning({ id: refreshTokens.id })
      return rows.length > 0
    },
    async revokeFamily(familyId) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)))
    },
    async revokeAllForUser(userId) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
    },

    async createPasswordReset(input) {
      await db.transaction(async (tx) => {
        await tx.update(passwordResets).set({ usedAt: new Date() })
          .where(and(eq(passwordResets.userId, input.userId), isNull(passwordResets.usedAt)))
        await tx.insert(passwordResets).values(input)
      })
    },
    async findActivePasswordReset(userId) {
      const [row] = await db.select().from(passwordResets)
        .where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt), sql`${passwordResets.expiresAt} > now()`))
        .orderBy(desc(passwordResets.createdAt)).limit(1)
      return row
    },
    async recordPasswordResetAttempt(id) {
      const [row] = await db.update(passwordResets).set({ attempts: sql`${passwordResets.attempts} + 1` })
        .where(eq(passwordResets.id, id)).returning({ attempts: passwordResets.attempts })
      return row?.attempts ?? Number.MAX_SAFE_INTEGER
    },
    async consumePasswordReset(id) {
      const rows = await db.update(passwordResets).set({ usedAt: new Date() })
        .where(and(eq(passwordResets.id, id), isNull(passwordResets.usedAt))).returning({ id: passwordResets.id })
      return rows.length > 0
    },
  }
}
