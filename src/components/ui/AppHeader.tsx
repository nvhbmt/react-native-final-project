import { Ionicons } from '@expo/vector-icons'
import { View } from '@tamagui/tailwind'
import { router } from 'expo-router'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { appColors } from '@/theme/tamagui.config'

import { ClampedText } from './ClampedText'

type Props = {
  title: string
  /** `center`: tiêu đề giữa (Checkout, Payment). `left`: tiêu đề cạnh nút back (trang sản phẩm). */
  align?: 'center' | 'left'
  right?: ReactNode
  onBack?: () => void
  /** Ẩn nút back cho màn gốc (tab). */
  showBack?: boolean
}

export function AppHeader({
  title,
  align = 'center',
  right,
  onBack = () => router.back(),
  showBack = true,
}: Props) {
  const back = showBack ? (
    <View
      onPress={onBack}
      role="button"
      aria-label="Quay lại"
      hitSlop={12}
      className="size-[24px] items-center justify-center active:opacity-60"
    >
      <Ionicons name="chevron-back" size={20} color={appColors['neutral-500']} />
    </View>
  ) : null

  if (align === 'left') {
    return (
      <View className={cn('h-[52px] flex-row items-center gap-3', showBack ? 'px-4' : 'px-6')}>
        {back}
        <ClampedText lines={1} className="flex-1 font-heading text-[20px] leading-[30px] font-bold text-neutral-900">
          {title}
        </ClampedText>
        {right ? <View className="flex-row items-center gap-4">{right}</View> : null}
      </View>
    )
  }

  return (
    <View className="h-[52px] flex-row items-center px-6">
      <View className="w-[40px]">{back}</View>
      <ClampedText lines={1} className="flex-1 text-center font-heading text-[20px] leading-[30px] font-bold text-neutral-900">
        {title}
      </ClampedText>
      <View className="w-[40px] items-end">{right}</View>
    </View>
  )
}
