import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'

import { Button } from '@/components/ui/Button'

import { ProfileAvatar } from './ProfileAvatar'

export function GuestAccount() {
  return (
    <View className="flex-1 items-center justify-center gap-5 px-2">
      <ProfileAvatar user={null} size={88} />
      <View className="items-center gap-1">
        <Text className="font-heading text-[22px] leading-[32px] font-bold text-neutral-900">Bạn chưa đăng nhập</Text>
        <Text className="text-center text-[14px] leading-[22px] text-neutral-600">
          Đăng nhập để lưu đơn hàng, sản phẩm yêu thích và trò chuyện với trợ lý mua sắm.
        </Text>
      </View>
      <View className="w-full gap-3">
        <Button title="Log in" onPress={() => router.push('/login')} />
        <Button title="Create account" variant="outline" onPress={() => router.push('/register')} />
      </View>
    </View>
  )
}
