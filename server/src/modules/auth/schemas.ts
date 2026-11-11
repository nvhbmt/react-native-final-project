import { z } from 'zod'

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'Email không hợp lệ' }).max(254))

// Giới hạn trên để tránh request băm mật khẩu dài bất thường làm nghẽn CPU.
const password = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(128, 'Mật khẩu tối đa 128 ký tự')

export const registerSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(100),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).max(512),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{6}$/, 'Mã gồm 6 chữ số'),
  newPassword: password,
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
