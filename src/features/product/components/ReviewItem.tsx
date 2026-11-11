import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'

import { StarRating } from '@/components/ui/StarRating'
import { mediaUrl } from '@/lib/api'

import type { ProductReview } from '../types'

type Props = {
  review: ProductReview
  /** Hiện số sao dưới tên (trang Reviews). Trang chi tiết giữ như design, không hiện. */
  showRating?: boolean
}

export function ReviewItem({ review, showRating = false }: Props) {
  return (
    <View className="flex-row gap-4">
      {review.avatar ? <Image source={mediaUrl(review.avatar)} style={{ width: 36, height: 36, borderRadius: 18 }} /> :
        <View className="size-[36px] items-center justify-center rounded-full bg-neutral-100">
          <Text className="text-[14px] font-bold text-neutral-700">{review.author.trim().slice(0, 1).toUpperCase()}</Text>
        </View>}
      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between">
          <Text numberOfLines={1} className="flex-1 pr-2 text-[14px] leading-[22px] text-neutral-700">{review.author}</Text>
          <Text className="text-[11px] leading-[18px] text-neutral-500">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</Text>
        </View>
        <Text className="text-[11px] text-neutral-500">{review.purchaseMode === 'demo' ? 'Đơn demo' : 'Đã mua hàng'}</Text>
        {showRating ? <StarRating value={review.rating} size={12} className="gap-0.5" /> : null}
        <Text className="text-[12px] leading-[20px] text-neutral-500">{review.content}</Text>
      </View>
    </View>
  )
}
