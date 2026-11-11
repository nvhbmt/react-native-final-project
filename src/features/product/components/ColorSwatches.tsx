import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'

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
            <View className="size-[24px] items-center justify-center overflow-hidden rounded-full bg-neutral-100" style={{ backgroundColor: c.hex }}>
              {c.swatchImage ? <Image source={c.swatchImage} style={{ width: 24, height: 24 }} contentFit="cover" />
                : !c.hex && <Text className="text-[11px] text-neutral-700">{c.name.slice(0, 1)}</Text>}
            </View>
          </View>
        )
      })}
    </View>
  )
}
