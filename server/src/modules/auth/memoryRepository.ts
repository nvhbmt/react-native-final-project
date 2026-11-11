import { randomUUID } from 'node:crypto'

import type { PasswordResetRow, RefreshTokenRow, UserRow } from '@/db/schema.ts'
import type { AuthRepository } from './repository.ts'

/** Bản in-memory của AuthRepository — dùng cho unit test, không dùng ở production. */
export function createMemoryAuthRepository() {
  const users = new Map<string, UserRow>()
  const tokens = new Map<string, RefreshTokenRow>()
  const resets = new Map<string, PasswordResetRow>()

  const repo: AuthRepository = {
    async findUserByEmail(email) {
      return [...users.values()].find((user) => user.email === email)
    },
    async findUserById(id) {
      return users.get(id)
    },
    async createUser(input) {
      if ([...users.values()].some((user) => user.email === input.email)) return undefined
      const now = new Date()
      const user: UserRow = { id: randomUUID(), avatarUrl: null, phone: null, role: 'customer', createdAt: now, updatedAt: now, ...input }
      users.set(user.id, user)
      return user
    },
    async updatePassword(userId, passwordHash) {
      const user = users.get(userId)
      if (user) users.set(userId, { ...user, passwordHash, updatedAt: new Date() })
    },

    async insertRefreshToken(input) {
      const row: RefreshTokenRow = { id: randomUUID(), revokedAt: null, createdAt: new Date(), ...input }
      tokens.set(row.id, row)
    },
    async findRefreshToken(tokenHash) {
      return [...tokens.values()].find((token) => token.tokenHash === tokenHash)
    },
    async revokeRefreshToken(id) {
      const token = tokens.get(id)
      if (!token || token.revokedAt) return false
      token.revokedAt = new Date()
      return true
    },
    async revokeFamily(familyId) {
      for (const token of tokens.values()) if (token.familyId === familyId) token.revokedAt ??= new Date()
    },
    async revokeAllForUser(userId) {
      for (const token of tokens.values()) if (token.userId === userId) token.revokedAt ??= new Date()
    },

    async createPasswordReset(input) {
      for (const reset of resets.values()) if (reset.userId === input.userId) reset.usedAt ??= new Date()
      const row: PasswordResetRow = { id: randomUUID(), attempts: 0, usedAt: null, createdAt: new Date(), ...input }
      resets.set(row.id, row)
    },
    async findActivePasswordReset(userId) {
      return [...resets.values()].reverse().find((r) => r.userId === userId && !r.usedAt && r.expiresAt.getTime() > Date.now())
    },
    async recordPasswordResetAttempt(id) {
      const reset = resets.get(id)
      if (!reset) return Number.MAX_SAFE_INTEGER
      return ++reset.attempts
    },
    async consumePasswordReset(id) {
      const reset = resets.get(id)
      if (!reset || reset.usedAt) return false
      reset.usedAt = new Date()
      return true
    },
  }

  return { repo, users, tokens, resets }
}
