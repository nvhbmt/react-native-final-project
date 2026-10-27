import { Text, View } from '@tamagui/tailwind'

import { cn } from '@/lib/cn'

type Props = {
  sizes: string[]
  value?: string
  onChange: (size: string) => void
}

/** Nhóm nút size dính liền nhau (XS | S | M | L | XL). */
export function SizeSelector({ sizes, value, onChange }: Props) {
  return (
    <View className="flex-row self-start overflow-hidden rounded-[4px] border border-neutral-500" role="radiogroup">
      {sizes.map((size, i) => {
        const selected = size === value
        return (
          <View
            key={size}
            onPress={() => onChange(size)}
            role="radio"
            aria-checked={selected}
            className={cn('h-[36px] w-[40px] items-center justify-center', i > 0 && 'border-l border-neutral-500', selected ? 'bg-primary' : 'bg-white')}
          >
            <Text
              className={cn('text-[14px] leading-[22px]', selected ? 'font-bold text-white' : 'text-neutral-500')}
            >
              {size}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
