import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import type { ComponentProps } from 'react'

import { appColors } from '@/theme/tamagui.config'

import { Screen } from './Screen'

type Props = {
  title: string
  icon: ComponentProps<typeof Ionicons>['name']
  description?: string
}

// Màn hình tạm cho các tab chưa làm — thay bằng nội dung thật trong features/<tên>/screens.
export function PlaceholderScreen({ title, icon, description }: Props) {
  return (
    <Screen title={title}>
      <View className="flex-1 items-center justify-center gap-3 p-6 rounded-lg border border-dashed border-border-color">
        <Ionicons name={icon} size={56} color={appColors.primary} />
        <Text className="text-center text-base text-color-11">
          {description ?? `Màn hình ${title} — nội dung sẽ được bổ sung.`}
        </Text>
      </View>
    </Screen>
  )
}
