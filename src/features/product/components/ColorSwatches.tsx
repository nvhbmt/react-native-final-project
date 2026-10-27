import { View } from '@tamagui/tailwind'

import { cn } from '@/lib/cn'

import type { ProductColor } from '../types'

type Props = {
  colors: ProductColor[]
  value?: string
  onChange: (id: string) => void
}

export function ColorSwatches({ colors, value, onChange }: Props) {
  return (
    <View className="flex-row items-center gap-2" role="radiogroup">
      {colors.map((c) => {
        const selected = c.id === value
        return (
          <View
            key={c.id}
            onPress={() => onChange(c.id)}
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            className={cn('size-[32px] items-center justify-center rounded-full border-2', selected ? 'border-primary' : 'border-neutral-300')}
          >
            <View className="size-[24px] rounded-full" style={{ backgroundColor: c.hex }} />
          </View>
        )
      })}
    </View>
  )
}
