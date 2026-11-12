import { router } from 'expo-router'
import { useRef, useState } from 'react'

import { useAuthStore, useCurrentUser } from '@/features/auth'
import { ApiError } from '@/lib/api'

import { accountApi } from '../api/accountApi'

/**
 * Lựa chọn "Nhận thông báo khuyến mãi" lưu theo tài khoản trên server.
 * Đổi ngay trên giao diện rồi mới gọi API; lỗi thì trả về trạng thái cũ. Khách bấm → mở đăng nhập.
 */
export function usePromoNotifications() {
  const user = useCurrentUser()
  const setUser = useAuthStore((s) => s.setUser)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Ref chặn ngay trong cùng một lần bấm (công tắc nằm trong hàng bấm được → có thể gọi hai lần).
  const inFlight = useRef(false)

  const setEnabled = async (value: boolean) => {
    if (!user) { router.push('/login'); return }
    if (inFlight.current) return
    inFlight.current = true
    setSaving(true)
    setError(null)
    setUser({ ...user, promoNotifications: value })
    try {
      setUser(await accountApi.updateProfile({ promoNotifications: value }))
    } catch (e) {
      setUser({ ...user, promoNotifications: !value })
      setError(e instanceof ApiError ? e.message : 'Không lưu được lựa chọn, vui lòng thử lại')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return { enabled: user?.promoNotifications ?? false, setEnabled, saving, error }
}
