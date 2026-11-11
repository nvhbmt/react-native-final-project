import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'

import { initialsOf, type User } from '@/features/auth'
import { mediaUrl } from '@/lib/api'
import { appColors } from '@/theme/tamagui.config'

/** Ảnh đại diện; user chưa có ảnh thì hiện chữ cái đầu, guest thì hiện biểu tượng người dùng trung tính. */
export function ProfileAvatar({ user, size }: { user: User | null; size: number }) {
  const frame = { width: size, height: size, borderRadius: size / 2 }

  if (user?.avatarUrl) return <Image source={{ uri: mediaUrl(user.avatarUrl) }} style={frame} />
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
    <View className="items-center justify-center bg-neutral-200" style={frame}>
      <Ionicons name="person" size={size * 0.55} color={appColors['neutral-400']} />
    </View>
  )
}
