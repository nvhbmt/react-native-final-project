import { Text, View } from '@tamagui/tailwind'

import { cn } from '@/lib/cn'
import { maskCardNumber } from '@/lib/format'

import type { PaymentMethod } from '../types'
import { PaymentLogo } from './PaymentLogo'

type Props = {
  method: PaymentMethod
  selected: boolean
  onSelect: () => void
}

export function PaymentMethodOption({ method, selected, onSelect }: Props) {
  const label = method.kind === 'demo_card' && method.brand !== 'paypal' ? maskCardNumber(method.label) : method.label

  return (
    <View
      onPress={onSelect}
      role="radio"
      aria-checked={selected}
      className={cn('h-[58px] flex-row items-center gap-3 rounded-[4px] border px-5 active:opacity-80', selected ? 'border-primary' : 'border-neutral-300')}
    >
      <PaymentLogo brand={method.brand} />
      <Text className="flex-1 text-[14px] leading-[22px] text-neutral-700">{label}</Text>
      <View
        className={cn('size-[16px] items-center justify-center rounded-full border', selected ? 'border-primary' : 'border-neutral-600')}
      >
        {selected ? <View className="size-[8px] rounded-full bg-primary" /> : null}
      </View>
    </View>
  )
}
