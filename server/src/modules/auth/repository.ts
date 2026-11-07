import { and, eq, isNull } from 'drizzle-orm'

import type { Db } from '@/db/client.ts'
import { refreshTokens, users, type RefreshTokenRow, type UserRow } from '@/db/schema.ts'

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
  }
}
