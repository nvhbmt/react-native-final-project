import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'

import { initialsOf, type User } from '@/features/auth'

const DEFAULT_AVATAR = require('../../../../assets/marketplace/avatar.png')

/** Ảnh đại diện; user chưa có ảnh thì hiện chữ cái đầu, guest thì hiện ảnh mặc định. */
export function ProfileAvatar({ user, size }: { user: User | null; size: number }) {
  const frame = { width: size, height: size, borderRadius: size / 2 }

  if (user?.avatarUrl) return <Image source={{ uri: user.avatarUrl }} style={frame} />
  if (user) {
    return (
      <View className="items-center justify-center bg-primary" style={frame}>
        <Text className="font-bold text-white" style={{ fontSize: size * 0.4, lineHeight: size * 0.5 }}>
          {initialsOf(user.fullName)}
        </Text>
      </View>
    )
  }
  return (
    <View className="overflow-hidden bg-[#d9cbf6]" style={frame}>
      <Image source={DEFAULT_AVATAR} style={{ width: size, height: size }} />
    </View>
  )
}
