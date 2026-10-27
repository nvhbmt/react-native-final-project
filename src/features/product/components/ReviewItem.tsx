import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'

import type { ProductReview } from '../types'

export function ReviewItem({ review }: { review: ProductReview }) {
  return (
    <View className="flex-row gap-4">
      <Image source={{ uri: review.avatar }} style={{ width: 36, height: 36, borderRadius: 18 }} />
      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-[14px] leading-[22px] text-neutral-700">{review.author}</Text>
          <Text className="text-[11px] leading-[18px] text-neutral-500">{review.createdAt}</Text>
        </View>
        <Text className="text-[12px] leading-[20px] text-neutral-500">{review.content}</Text>
      </View>
    </View>
  )
}
