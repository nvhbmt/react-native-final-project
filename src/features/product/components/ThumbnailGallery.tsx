import { View } from '@tamagui/tailwind'
import { Image } from 'expo-image'

import { cn } from '@/lib/cn'

import type { Product } from '../types'

type Props = {
  images: Product['images']
  selected: number
  onSelect: (index: number) => void
  width: number
}

const GAP = 8

/** Ảnh lớn + hàng thumbnail bên dưới (trang chi tiết có biến thể). */
export function ThumbnailGallery({ images, selected, onSelect, width }: Props) {
  const columns = Math.max(3, images.length)
  const thumbSize = (width - GAP * (columns - 1)) / columns

  return (
    <View className="gap-2">
      <Image
        source={images[selected]}
        style={{ width, height: Math.round(width * 0.59), borderRadius: 6 }}
        contentFit="contain"
        transition={200}
      />
      {images.length > 1 && <View className="flex-row" style={{ gap: GAP }}>
        {images.map((source, i) => (
          <View
            key={i}
            onPress={() => onSelect(i)}
            role="button"
            aria-label={`Ảnh ${i + 1}`}
            aria-selected={i === selected}
            className={cn('overflow-hidden rounded-[4px] border-2', i === selected ? 'border-primary' : 'border-transparent')}
          >
            <Image source={source} style={{ width: thumbSize - 4, height: thumbSize - 4 }} contentFit="contain" />
          </View>
        ))}
      </View>}
    </View>
  )
}
