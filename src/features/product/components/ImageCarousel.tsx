import { View } from '@tamagui/tailwind'
import { Image } from 'expo-image'
import { useState } from 'react'
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView } from 'react-native'

type Props = {
  images: string[]
  width: number
  height: number
}

/** Ảnh trượt ngang có chấm phân trang (trang chi tiết dạng chuẩn). */
export function ImageCarousel({ images, width, height }: Props) {
  const [index, setIndex] = useState(0)

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    if (next !== index) setIndex(next)
  }

  return (
    <View className="gap-2">
      <View className="overflow-hidden rounded-[6px]" style={{ width, height }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {images.map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width, height }} contentFit="cover" transition={200} />
          ))}
        </ScrollView>
      </View>
      <View className="flex-row items-center justify-center gap-1.5">
        {images.map((uri, i) => (
          <View
            key={uri}
            className={i === index ? 'h-[6px] w-[16px] rounded-full bg-primary' : 'size-[6px] rounded-full bg-neutral-300'}
          />
        ))}
      </View>
    </View>
  )
}
