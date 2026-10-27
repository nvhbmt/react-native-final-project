import { Text, View } from '@tamagui/tailwind'
import type { PropsWithChildren } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type Props = PropsWithChildren<{
  title?: string
  /** Mặc định cuộn được; tắt khi màn hình tự quản lý list (FlatList...) */
  scroll?: boolean
}>

// Khung chuẩn cho mọi màn hình: safe area phía trên, tiêu đề, padding thống nhất.
export function Screen({ title, scroll = true, children }: Props) {
  const content = (
    <View className="flex-1 gap-4 px-4 pt-2 pb-6">
      {title ? <Text className="text-3xl font-bold text-color">{title}</Text> : null}
      {children}
    </View>
  )

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {scroll ? <ScrollView contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView> : content}
      </SafeAreaView>
    </View>
  )
}
