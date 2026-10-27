import { Ionicons } from '@expo/vector-icons'
import { View } from '@tamagui/tailwind'

import { cn } from '@/lib/cn'
import { appColors } from '@/theme/tamagui.config'

type Props = {
  value: number
  size?: number
  /** Khoảng cách giữa các sao (class Tailwind). */
  className?: string
  /** Có `onChange` → cho phép chạm để chấm điểm. */
  onChange?: (value: number) => void
}

export function StarRating({ value, size = 16, className = 'gap-0.5', onChange }: Props) {
  return (
    <View className={cn('flex-row items-center', className)} role={onChange ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map((star) => {
        const full = value >= star
        const half = !full && value >= star - 0.5
        return (
          <View
            key={star}
            onPress={onChange ? () => onChange(star) : undefined}
            role={onChange ? 'radio' : undefined}
            aria-label={onChange ? `${star} sao` : undefined}
            aria-checked={onChange ? value === star : undefined}
            hitSlop={onChange ? 6 : undefined}
            className="relative"
          >
            <Ionicons name="star" size={size} color={full ? appColors.warning : appColors['neutral-300']} />
            {half ? (
              <View className="absolute top-0 left-0">
                <Ionicons name="star-half" size={size} color={appColors.warning} />
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
