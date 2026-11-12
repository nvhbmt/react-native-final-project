import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import type { ComponentProps, ReactNode } from 'react'

import { appColors } from '@/theme/tamagui.config'

type Props = {
  icon: ComponentProps<typeof Ionicons>['name']
  title: string
  description: string
  /** Các nút hành động, xếp dọc và rộng hết khung. */
  children?: ReactNode
}

/** Trạng thái trống / chưa đăng nhập dùng chung cho các tab để icon, cỡ chữ và nút đồng nhất. */
export function EmptyState({ icon, title, description, children }: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-16">
      <Ionicons name={icon} size={56} color={appColors.primary} />
      <Text className="text-center font-heading text-[18px] leading-[28px] font-bold text-neutral-900">{title}</Text>
      <Text className="text-center text-[14px] leading-[22px] text-neutral-600">{description}</Text>
      {children ? <View className="mt-2 w-full gap-3">{children}</View> : null}
    </View>
  )
}
