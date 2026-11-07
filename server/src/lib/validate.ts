import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'

import { AppError } from './http.ts'

/** zValidator với lỗi trả về theo định dạng chung (400 VALIDATION_ERROR + danh sách field lỗi). */
export function validate<Target extends keyof ValidationTargets, Schema extends ZodType>(target: Target, schema: Schema) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      throw new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ', details)
    }
  })
}
