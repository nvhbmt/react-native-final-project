import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import type { ComponentProps, ReactNode } from 'react'
import { ActivityIndicator } from 'react-native'

import { cn } from '@/lib/cn'
import { appColors } from '@/theme/tamagui.config'

type Props = {
  icon: ComponentProps<typeof Ionicons>['name']
  label: string
  onPress: () => void
  danger?: boolean
  loading?: boolean
  /** Thay mũi tên bên phải (vd. công tắc). */
  right?: ReactNode
}

export function AccountMenuRow({ icon, label, onPress, danger, loading, right }: Props) {
  const color = danger ? appColors.danger : appColors['neutral-700']
  return (
    <View
      onPress={loading ? undefined : onPress}
      role="button"
      aria-label={label}
      aria-busy={loading}
      className="h-[52px] flex-row items-center gap-3 px-4 active:bg-neutral-100"
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text className={cn('flex-1 text-[14px] leading-[22px]', danger ? 'text-danger' : 'text-neutral-700')}>{label}</Text>
      {loading ? <ActivityIndicator color={color} /> : right ?? <Ionicons name="chevron-forward" size={16} color={appColors['neutral-400']} />}
    </View>
  )
}
