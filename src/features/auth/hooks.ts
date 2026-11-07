import { router, useFocusEffect, type Href } from 'expo-router'
import { useCallback } from 'react'

import { useAuthStore } from './store/authStore'

export function useCurrentUser() {
  return useAuthStore((s) => s.user)
}

export function useAuthStatus() {
  return useAuthStore((s) => s.status)
}

/**
 * Màn cần đăng nhập: khi focus mà là guest thì thay bằng /login (replace, để bấm back
 * từ Login không quay lại màn này rồi bị đẩy sang Login lần nữa).
 */
export function useRequireAuth(redirectTo: Href = '/login') {
  const status = useAuthStatus()
  useFocusEffect(
    useCallback(() => {
      if (status === 'guest') router.replace(redirectTo)
    }, [status, redirectTo]),
  )
  return status
}
