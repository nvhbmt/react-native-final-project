import { Text, View } from '@tamagui/tailwind'

import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'

import type { ShippingMethodId, ShippingOptionQuote } from '../types'

type Props = {
  options: ShippingOptionQuote[]
  selectedId: ShippingMethodId | null
  /** Đang áp FREESHIP: hiện phí gốc gạch ngang + "Miễn phí". */
  freeShipping: boolean
  onSelect: (id: ShippingMethodId) => void
}

export function ShippingMethodPicker({ options, selectedId, freeShipping, onSelect }: Props) {
  return (
    <View className="gap-3" role="radiogroup" aria-label="Hình thức giao hàng">
      {options.map((option) => {
        const selected = option.id === selectedId
        const price = freeShipping ? 'Miễn phí' : formatPrice(option.fee)
        return (
          <View
            key={option.id}
            onPress={() => onSelect(option.id)}
            role="radio"
            aria-checked={selected}
            aria-label={`${option.label}, ${option.eta}, ${price}`}
            className={cn('flex-row items-center gap-3 rounded-[4px] border px-4 py-3 active:opacity-80', selected ? 'border-primary' : 'border-neutral-300')}
          >
            <View className="flex-1 gap-[2px]">
              <Text className="text-[14px] leading-[22px] font-bold text-neutral-900">{option.label}</Text>
              <Text className="text-[13px] leading-[20px] text-neutral-600">{option.eta}</Text>
            </View>
            <View className="items-end">
              {freeShipping ? (
                <Text className="text-[12px] leading-[18px] text-neutral-400 line-through">{formatPrice(option.fee)}</Text>
              ) : null}
              <Text className={cn('text-[14px] leading-[22px] font-semibold', freeShipping ? 'text-success-700' : 'text-neutral-900')}>{price}</Text>
            </View>
            <View className={cn('size-[16px] items-center justify-center rounded-full border', selected ? 'border-primary' : 'border-neutral-600')}>
              {selected ? <View className="size-[8px] rounded-full bg-primary" /> : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}
