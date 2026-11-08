import { Text, View } from '@tamagui/tailwind'

import { StarRating } from '@/components/ui/StarRating'

type Props = {
  rating: number | null
  reviewCount: number
  /** index 0 → 5 sao ... index 4 → 1 sao */
  breakdown: [number, number, number, number, number] | null
}

/** Khối "4.5/5 (99 reviews) ★★★★½" + biểu đồ thanh theo số sao. */
export function RatingSummary({ rating, reviewCount, breakdown }: Props) {
  const max = Math.max(...(breakdown ?? []), 1)

  return (
    <View className="flex-row items-center gap-6 rounded-[6px] bg-neutral-100 px-[18px] py-4">
      <View className="gap-1">
        <Text className="text-[24px] leading-[36px] text-neutral-900">{rating === null ? 'No rating' : `${rating}/5`}</Text>
        <Text className="text-[12px] leading-[20px] text-neutral-600">({reviewCount} reviews)</Text>
        {rating !== null && <StarRating value={rating} size={16} className="mt-2 gap-0.5" />}
      </View>
      <View className="flex-1 gap-1">
        {breakdown?.map((count, i) => (
          <View key={i} className="flex-row items-center gap-3">
            <View className="h-[6px] flex-1 overflow-hidden rounded-full bg-neutral-300">
              <View className="h-full rounded-full bg-warning" style={{ width: `${(count / max) * 80}%` }} />
            </View>
            <Text className="w-[8px] text-[12px] leading-[20px] text-neutral-600">{5 - i}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
