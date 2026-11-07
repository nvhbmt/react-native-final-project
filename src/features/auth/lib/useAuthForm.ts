import { useState } from 'react'

import { ApiError } from '@/lib/api'

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

/**
 * Trạng thái chung của form auth: đang gửi, lỗi theo field (client + server), lỗi chung.
 * `validate` trả lỗi client; lỗi VALIDATION_ERROR từ server được map về đúng field.
 */
export function useAuthForm<Field extends string>(validate: () => FieldErrors<Field>) {
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function submit(action: () => Promise<void>) {
    if (submitting) return
    const errors = validate()
    setFieldErrors(errors)
    setFormError(null)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await action()
    } catch (error) {
      if (error instanceof ApiError) {
        const fromServer = error.fieldErrors
        if (Object.keys(fromServer).length > 0) setFieldErrors(fromServer as FieldErrors<Field>)
        else setFormError(error.message)
      } else {
        setFormError('Đã có lỗi xảy ra, vui lòng thử lại')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function clearError(field: Field) {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
    setFormError(null)
  }

  return { submitting, fieldErrors, formError, submit, clearError }
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD = 8
