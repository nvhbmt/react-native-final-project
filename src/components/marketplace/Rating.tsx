import { Ionicons } from '@expo/vector-icons'
import { XStack, YStack } from 'tamagui'

import { marketplace as m } from '@/theme/marketplace'

export function Rating({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <XStack role="img" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, value - index))
        return (
          <YStack key={index} position="relative" w={size} h={size}>
            <Ionicons name="star" color={m.starEmpty} size={size} />
            <YStack position="absolute" t={0} l={0} w={size * fill} overflow="hidden">
              <Ionicons name="star" color={m.star} size={size} />
            </YStack>
          </YStack>
        )
      })}
    </XStack>
  )
}
