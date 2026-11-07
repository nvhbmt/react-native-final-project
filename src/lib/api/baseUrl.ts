import Constants from 'expo-constants'
import { Platform } from 'react-native'

const API_PORT = 4000

/**
 * Địa chỉ backend:
 * 1. `EXPO_PUBLIC_API_URL` nếu có (bắt buộc khi build production).
 * 2. Dev: lấy IP máy đang chạy Metro (`hostUri`) để điện thoại thật trong cùng LAN gọi được.
 * 3. Web / còn lại: localhost.
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')

  if (Platform.OS !== 'web') {
    const host = Constants.expoConfig?.hostUri?.split(':')[0]
    if (host) return `http://${host}:${API_PORT}`
    if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`
  }
  return `http://localhost:${API_PORT}`
}
