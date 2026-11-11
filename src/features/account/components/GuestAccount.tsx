import { router } from 'expo-router'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export function GuestAccount() {
  return (
    <EmptyState
      icon="person-circle-outline"
      title="Bạn chưa đăng nhập"
      description="Đăng nhập để lưu đơn hàng, sản phẩm yêu thích và trò chuyện với trợ lý mua sắm."
    >
      <Button title="Đăng nhập" onPress={() => router.push('/login')} />
      <Button title="Tạo tài khoản" variant="outline" onPress={() => router.push('/register')} />
    </EmptyState>
  )
}
