import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'

import { appColors } from '@/theme/tamagui.config'

type Props = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

/** [ − ]  2  [ + ] */
export function QuantityStepper({ value, onChange, min = 1, max = 99 }: Props) {
  const canDec = value > min
  const canInc = value < max

  return (
    <View className="flex-row items-center gap-4">
      <View
        onPress={canDec ? () => onChange(value - 1) : undefined}
        role="button"
        aria-label="Giảm số lượng"
        aria-disabled={!canDec}
        className="size-[36px] items-center justify-center rounded-[4px] bg-neutral-200 active:opacity-70"
      >
        <Ionicons name="remove" size={20} color={canDec ? appColors['neutral-600'] : appColors['neutral-400']} />
      </View>
      <Text className="min-w-[12px] text-center text-[16px] leading-[26px] text-neutral-900">{value}</Text>
      <View
        onPress={canInc ? () => onChange(value + 1) : undefined}
        role="button"
        aria-label="Tăng số lượng"
        aria-disabled={!canInc}
        className="size-[36px] items-center justify-center rounded-[4px] bg-primary active:opacity-70"
      >
        <Ionicons name="add" size={20} color="#ffffff" />
      </View>
    </View>
  )
}
