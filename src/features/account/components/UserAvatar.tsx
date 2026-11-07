import { View } from '@tamagui/tailwind'
import { router } from 'expo-router'

import { useCurrentUser } from '@/features/auth'

import { ProfileAvatar } from './ProfileAvatar'

/** Avatar người dùng trên header; chạm để mở tab Account. */
export function UserAvatar() {
  const user = useCurrentUser()
  return (
    <View
      onPress={() => router.navigate('/account')}
      role="button"
      aria-label="Tài khoản"
      className="size-[36px] overflow-hidden rounded-full active:opacity-80"
    >
      <ProfileAvatar user={user} size={36} />
    </View>
  )
}
