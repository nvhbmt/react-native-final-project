import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { appColors } from '@/theme/tamagui.config'

type Props = {
  label: string
  selected: boolean
  onPress: () => void
  /** Icon bên phải; mặc định không có. */
  icon?: ComponentProps<typeof Ionicons>['name']
  /** Nội dung chèn trước nhãn (vd. ngôi sao). */
  prefix?: ReactNode
  role?: 'checkbox' | 'radio'
}

/** Chip bo tròn: chọn → nền primary-50, chữ primary; chưa chọn → nền neutral-200. */
export function Chip({ label, selected, onPress, icon, prefix, role = 'checkbox' }: Props) {
  return (
    <View
      onPress={onPress}
      role={role}
      aria-checked={selected}
      className={cn(
        'h-[36px] flex-row items-center gap-1.5 rounded-full px-3 active:opacity-70',
        selected ? 'bg-primary-50' : 'bg-neutral-200',
      )}
    >
      {prefix}
      <Text className={cn('text-[14px] leading-[22px]', selected ? 'text-primary' : 'text-neutral-700')}>{label}</Text>
      {icon ? <Ionicons name={icon} size={18} color={selected ? appColors.primary : appColors['neutral-700']} /> : null}
    </View>
  )
}
