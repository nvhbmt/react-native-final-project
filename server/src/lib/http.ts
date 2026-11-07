import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

/**
 * Định dạng phản hồi thống nhất cho mọi endpoint:
 *   thành công → { success: true, data }
 *   thất bại   → { success: false, error: { code, message, details? } }
 */
export type ErrorBody = {
  success: false
  error: { code: string; message: string; details?: unknown }
}

export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ success: true as const, data }, status)
}

export function fail(c: Context, error: AppError) {
  const body: ErrorBody = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  }
  return c.json(body, error.status)
}
