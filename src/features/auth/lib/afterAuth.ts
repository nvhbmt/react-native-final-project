import { router } from 'expo-router'

/**
 * Đăng nhập/đăng ký xong: quay về màn đã mở luồng auth (vd. Account).
 * Login ↔ Register chuyển qua nhau bằng `replace`, nên luôn chỉ cần back một bước.
 */
export function leaveAuthFlow() {
  if (router.canGoBack()) router.back()
  else router.replace('/account')
}
