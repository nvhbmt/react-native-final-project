import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'
import { useState } from 'react'
import { Switch } from 'react-native'

import { Divider } from '@/components/ui/Divider'
import { useAuthStore, type User } from '@/features/auth'
import { appColors } from '@/theme/tamagui.config'

import { usePromoNotifications } from '../hooks/usePromoNotifications'
import { confirmAction as confirm } from '../lib/confirm'
import { AccountMenuRow } from './AccountMenuRow'
import { ProfileAvatar } from './ProfileAvatar'

export function SignedInAccount({ user }: { user: User }) {
  const logout = useAuthStore((s) => s.logout)
  const logoutAll = useAuthStore((s) => s.logoutAll)
  const [busy, setBusy] = useState<'logout' | 'logout-all' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const promo = usePromoNotifications()

  const run = (kind: 'logout' | 'logout-all', action: () => Promise<void>) => async () => {
    setBusy(kind)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError((e as Error).message || 'Không thực hiện được, vui lòng thử lại')
    } finally {
      setBusy(null)
    }
  }

  return (
    <View className="gap-6 px-6">
      <View className="flex-row items-center gap-4">
        <ProfileAvatar user={user} size={64} />
        <View className="flex-1 gap-[2px]">
          <Text className="font-heading text-[20px] leading-[30px] font-bold text-neutral-900">{user.fullName}</Text>
          <Text className="text-[14px] leading-[22px] text-neutral-600">{user.email}</Text>
        </View>
      </View>

      <View className="overflow-hidden rounded-[8px] border border-neutral-300">
        <AccountMenuRow icon="receipt-outline" label="Đơn hàng của tôi" onPress={() => router.push('/orders')} />
        <Divider />
        {user.role === 'admin' ? (
          <>
            <AccountMenuRow icon="cube-outline" label="Quản lý giao hàng" onPress={() => router.push('/admin/orders')} />
            <Divider />
          </>
        ) : null}
        <AccountMenuRow icon="sparkles-outline" label="Trợ lý mua sắm AI" onPress={() => router.push('/assistant')} />
        <Divider />
        <AccountMenuRow icon="person-outline" label="Hồ sơ cá nhân" onPress={() => router.push('/profile')} />
        <Divider />
        <AccountMenuRow icon="location-outline" label="Địa chỉ giao hàng" onPress={() => router.push('/addresses')} />
        <Divider />
        <AccountMenuRow icon="key-outline" label="Đổi mật khẩu" onPress={() => router.push('/change-password')} />
        <Divider />
        <AccountMenuRow
          icon="notifications-outline"
          label="Nhận thông báo khuyến mãi"
          onPress={() => void promo.setEnabled(!promo.enabled)}
          right={
            <Switch
              value={promo.enabled}
              onValueChange={(value) => void promo.setEnabled(value)}
              trackColor={{ false: appColors['neutral-400'], true: appColors.primary }}
              thumbColor="#ffffff"
              ios_backgroundColor={appColors['neutral-400']}
              accessibilityLabel="Nhận thông báo khuyến mãi"
            />
          }
        />
        <Divider />
        <AccountMenuRow
          icon="phone-portrait-outline"
          label="Đăng xuất khỏi mọi thiết bị"
          loading={busy === 'logout-all'}
          onPress={() =>
            confirm('Đăng xuất mọi thiết bị?', 'Tất cả thiết bị đang đăng nhập tài khoản này sẽ phải đăng nhập lại.', 'Đăng xuất', run('logout-all', logoutAll))
          }
        />
        <Divider />
        <AccountMenuRow
          icon="log-out-outline"
          label="Đăng xuất"
          danger
          loading={busy === 'logout'}
          onPress={() => confirm('Đăng xuất?', 'Bạn có chắc muốn đăng xuất khỏi thiết bị này?', 'Đăng xuất', run('logout', logout))}
        />
        <Divider />
        <AccountMenuRow icon="trash-outline" label="Xoá tài khoản" danger onPress={() => router.push('/delete-account')} />
      </View>
      {error || promo.error ? <Text className="text-[12px] leading-[20px] text-danger">{error ?? promo.error}</Text> : null}
    </View>
  )
}
