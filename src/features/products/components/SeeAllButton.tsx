import { YStack } from 'tamagui'

import { MarketText } from '@/components/marketplace/MarketText'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

export function SeeAllButton({ expanded, label, onPress }: { expanded?: boolean; label?: string; onPress: () => void }) {
  return (
    <YStack {...keyboardAction} role="button" aria-label={label ?? (expanded ? 'Thu gọn danh sách' : 'Xem tất cả sản phẩm')} onPress={onPress} h={36} bg={m.input} rounded={3} items="center" justify="center" opacity="1 press:0.7">
      <MarketText color={m.secondary}>{label ?? (expanded ? 'Thu gọn' : 'Xem tất cả')}</MarketText>
    </YStack>
  )
}
