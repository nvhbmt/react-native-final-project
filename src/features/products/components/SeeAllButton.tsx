import { YStack } from 'tamagui'

import { MarketText } from '@/components/marketplace/MarketText'
import { marketplace as m } from '@/theme/marketplace'

export function SeeAllButton({ expanded, onPress }: { expanded: boolean; onPress: () => void }) {
  return (
    <YStack role="button" aria-label={expanded ? 'Show fewer products' : 'See all products'} onPress={onPress} h={36} bg={m.input} rounded={3} items="center" justify="center" opacity="1 press:0.7">
      <MarketText color={m.secondary}>{expanded ? 'See less' : 'See all'}</MarketText>
    </YStack>
  )
}
