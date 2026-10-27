import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import type { ComponentProps, ReactNode } from 'react'

import { appColors } from '@/theme/tamagui.config'

import { Screen } from './Screen'

type Props = {
  title: string
  icon: ComponentProps<typeof Ionicons>['name']
  description?: string
  /** Nội dung phụ dưới mô tả (vd. nút điều hướng tạm). */
  children?: ReactNode
  /** Header cố định thay cho tiêu đề lớn (vd. AppHeader có nút giỏ hàng). */
  header?: ReactNode
}

// Màn hình tạm cho các tab chưa làm — thay bằng nội dung thật trong features/<tên>/screens.
export function PlaceholderScreen({ title, icon, description, children, header }: Props) {
  return (
    <Screen title={title} header={header}>
      <View className="flex-1 items-center justify-center gap-3 p-6 rounded-lg border border-dashed border-neutral-300">
        <Ionicons name={icon} size={56} color={appColors.primary} />
        <Text className="text-center text-[14px] leading-[22px] text-neutral-600">
          {description ?? `Màn hình ${title} — nội dung sẽ được bổ sung.`}
        </Text>
        {children}
      </View>
    </Screen>
  )
}
