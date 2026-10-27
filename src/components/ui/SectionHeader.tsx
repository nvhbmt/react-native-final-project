import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'

import { appColors } from '@/theme/tamagui.config'

type Props = {
  title: string
  onSeeAll?: () => void
}

export function SectionHeader({ title, onSeeAll }: Props) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-heading text-[18px] leading-[28px] font-bold text-neutral-700">{title}</Text>
      {onSeeAll ? (
        <View onPress={onSeeAll} role="button" className="flex-row items-center gap-1 active:opacity-60">
          <Text className="text-[12px] leading-[20px] text-neutral-500">See all</Text>
          <Ionicons name="chevron-forward" size={14} color={appColors['neutral-500']} />
        </View>
      ) : null}
    </View>
  )
}
