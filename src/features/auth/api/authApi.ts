import { api } from '@/lib/api'

import type { AuthSession, ChangePasswordInput, LoginInput, RegisterInput, User } from '../types'

// Endpoint công khai gửi `auth: false` để không gắn token và không kích hoạt tự refresh.
export const authApi = {
  register: (input: RegisterInput) => api.post<AuthSession>('/auth/register', input, { auth: false }),
  login: (input: LoginInput) => api.post<AuthSession>('/auth/login', input, { auth: false }),
  refresh: (refreshToken: string) => api.post<AuthSession>('/auth/refresh', { refreshToken }, { auth: false }),
  logout: (refreshToken: string) => api.post<{ loggedOut: true }>('/auth/logout', { refreshToken }, { auth: false }),
  logoutAll: () => api.post<{ loggedOut: true }>('/auth/logout-all'),
  me: () => api.get<User>('/auth/me'),
  forgotPassword: (email: string) => api.post<{ sent: true }>('/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (input: { email: string; code: string; newPassword: string }) =>
    api.post<AuthSession>('/auth/reset-password', input, { auth: false }),
  changePassword: (input: ChangePasswordInput) => api.post<AuthSession>('/auth/change-password', input),
}
