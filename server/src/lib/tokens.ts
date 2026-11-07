import { createHash, randomBytes } from 'node:crypto'

import { sign, verify } from 'hono/jwt'

export type AccessTokenClaims = {
  sub: string
  role: 'customer' | 'admin'
}

const ISSUER = 'market-api'
const ALG = 'HS256'

export async function signAccessToken(claims: AccessTokenClaims, secret: string, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000)
  return sign({ ...claims, iss: ISSUER, iat: now, exp: now + ttlSeconds }, secret, ALG)
}

/** Ném lỗi nếu token sai chữ ký, hết hạn hoặc sai issuer. */
export async function verifyAccessToken(token: string, secret: string): Promise<AccessTokenClaims> {
  const payload = await verify(token, secret, { alg: ALG, iss: ISSUER })
  if (typeof payload.sub !== 'string' || (payload.role !== 'customer' && payload.role !== 'admin')) {
    throw new Error('Access token thiếu claim')
  }
  return { sub: payload.sub, role: payload.role }
}

/** Refresh token: chuỗi ngẫu nhiên 256 bit trả cho client; server chỉ lưu SHA-256. */
export function createRefreshToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashRefreshToken(token) }
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
