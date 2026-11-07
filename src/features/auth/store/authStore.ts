import { create } from 'zustand'

import { ApiError, configureApiAuth } from '@/lib/api'

import { authApi } from '../api/authApi'
import { tokenStorage } from '../lib/tokenStorage'
import type { AuthSession, AuthStatus, ChangePasswordInput, LoginInput, RegisterInput, User } from '../types'

type AuthState = {
  status: AuthStatus
  user: User | null
  /** Chỉ giữ trong bộ nhớ; refresh token mới được lưu xuống máy. */
  accessToken: string | null

  /** Gọi một lần khi mở app: khôi phục phiên từ refresh token đã lưu. */
  bootstrap: () => Promise<void>
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  changePassword: (input: ChangePasswordInput) => Promise<void>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  /** Làm mới access token. Trả về token mới, hoặc null nếu phiên đã hết (chuyển về guest). */
  refresh: () => Promise<string | null>
}

// Gộp các lần refresh đồng thời: server xoay vòng refresh token, nên hai request refresh song song
// với cùng một token sẽ có một bên bị từ chối. Mọi nơi cần refresh cùng chờ một promise.
let inflightRefresh: Promise<string | null> | null = null

export const useAuthStore = create<AuthState>((set, get) => {
  async function applySession(session: AuthSession) {
    await tokenStorage.set(session.tokens.refreshToken)
    set({ status: 'authenticated', user: session.user, accessToken: session.tokens.accessToken })
  }

  async function clearSession() {
    set({ status: 'guest', user: null, accessToken: null })
    await tokenStorage.clear().catch(() => undefined)
  }

  async function doRefresh(): Promise<string | null> {
    const stored = await tokenStorage.get().catch(() => null)
    if (!stored) {
      await clearSession()
      return null
    }
    try {
      const session = await authApi.refresh(stored)
      await applySession(session)
      return session.tokens.accessToken
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession()
      } else if (get().status === 'unknown') {
        // Mất mạng lúc mở app: tạm coi là guest nhưng GIỮ refresh token để lần sau thử lại.
        set({ status: 'guest' })
      }
      return null
    }
  }

  return {
    status: 'unknown',
    user: null,
    accessToken: null,

    async bootstrap() {
      if (get().status !== 'unknown') return
      await get().refresh()
    },

    async login(input) {
      await applySession(await authApi.login(input))
    },

    async register(input) {
      await applySession(await authApi.register(input))
    },

    async changePassword(input) {
      await applySession(await authApi.changePassword(input))
    },

    async logout() {
      const stored = await tokenStorage.get().catch(() => null)
      await clearSession()
      // Thu hồi phía server; lỗi mạng thì bỏ qua — máy này đã xoá token rồi.
      if (stored) await authApi.logout(stored).catch(() => undefined)
    },

    async logoutAll() {
      await authApi.logoutAll()
      await clearSession()
    },

    refresh() {
      inflightRefresh ??= doRefresh().finally(() => {
        inflightRefresh = null
      })
      return inflightRefresh
    },
  }
})

configureApiAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refresh: () => useAuthStore.getState().refresh(),
})
