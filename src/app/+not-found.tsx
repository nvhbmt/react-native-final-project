import { Text, View } from '@tamagui/tailwind'
import { Link } from 'expo-router'

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background">
      <Text className="text-base text-color">Trang này không tồn tại.</Text>
      <Link href="/">
        <Text className="text-base font-semibold text-primary">Về trang chủ</Text>
      </Link>
    </View>
  )
}
