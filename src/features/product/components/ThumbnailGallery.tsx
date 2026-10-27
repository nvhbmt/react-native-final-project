import { View } from '@tamagui/tailwind'
import { Image } from 'expo-image'

import { cn } from '@/lib/cn'

type Props = {
  images: string[]
  selected: number
  onSelect: (index: number) => void
  width: number
}

const GAP = 8

/** Ảnh lớn + hàng thumbnail bên dưới (trang chi tiết có biến thể). */
export function ThumbnailGallery({ images, selected, onSelect, width }: Props) {
  const thumbSize = (width - GAP * (images.length - 1)) / images.length

  return (
    <View className="gap-2">
      <Image
        source={{ uri: images[selected] }}
        style={{ width, height: Math.round(width * 0.59), borderRadius: 6 }}
        contentFit="cover"
        transition={200}
      />
      <View className="flex-row" style={{ gap: GAP }}>
        {images.map((uri, i) => (
          <View
            key={uri}
            onPress={() => onSelect(i)}
            role="button"
            aria-label={`Ảnh ${i + 1}`}
            aria-selected={i === selected}
            className={cn('overflow-hidden rounded-[4px] border-2', i === selected ? 'border-primary' : 'border-transparent')}
          >
            <Image source={{ uri }} style={{ width: thumbSize - 4, height: thumbSize - 4 }} contentFit="cover" />
          </View>
        ))}
      </View>
    </View>
  )
}
