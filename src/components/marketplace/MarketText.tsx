import { Text, styled } from 'tamagui'

import { marketplace as m } from '@/theme/marketplace'

export const MarketText = styled(Text, {
  name: 'MarketText',
  fontFamily: 'marketplaceBody',
  fontSize: 14,
  lineHeight: '20px',
  color: m.text,
})

export const MarketHeading = styled(MarketText, {
  name: 'MarketHeading',
  fontFamily: 'marketplaceHeading',
  fontWeight: '700',
  fontSize: 16,
  lineHeight: '26px',
})
