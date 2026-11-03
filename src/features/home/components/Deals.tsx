import { router } from 'expo-router'
import { Image, StyleSheet } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { MarketHeading, MarketText } from '@/components/marketplace/MarketText'
import { marketplace as m } from '@/theme/marketplace'

export function Deals() {
  return (
    <YStack px={24} gap={8}>
      <XStack position="relative" h={176} bg="#f5f1fe" borderTopLeftRadius={6} borderTopRightRadius={6} items="center" px={24} overflow="hidden">
        <YStack z={1} gap={2}>
          <MarketHeading fontSize={24} lineHeight="36px" color={m.primary}>Shoes</MarketHeading>
          <MarketText fontSize={18} lineHeight="28px" color="#565656">50% off</MarketText>
          <YStack w={96} h={36} mt={12} bg={m.ink} rounded={3} items="center" justify="center" role="button" aria-label="Buy shoes now" onPress={() => router.push({ pathname: '/product-listing', params: { category: 'fashion' } })} opacity="1 press:0.8" style={styles.shadow}>
            <MarketText fontWeight="600" color="white">Buy now</MarketText>
          </YStack>
        </YStack>
        <Image source={require('../../../../assets/marketplace/red-shoe.png')} style={styles.shoe} resizeMode="contain" accessibilityLabel="Red high-top shoe" />
      </XStack>
      <XStack gap={8}>
        <YStack flex={1} h={128} overflow="hidden" borderBottomLeftRadius={6} role="button" aria-label="Fashion, 30 percent off" onPress={() => router.push({ pathname: '/product-listing', params: { category: 'fashion' } })}>
          <Image source={require('../../../../assets/marketplace/deal-fashion.png')} style={styles.deal} resizeMode="cover" />
        </YStack>
        <YStack flex={1} h={128} overflow="hidden" borderBottomRightRadius={6} role="button" aria-label="Electronics, 30 percent off" onPress={() => router.push({ pathname: '/product-listing', params: { category: 'electronics' } })}>
          <Image source={require('../../../../assets/marketplace/deal-electronics.png')} style={styles.deal} resizeMode="cover" />
        </YStack>
      </XStack>
    </YStack>
  )
}

const styles = StyleSheet.create({
  shoe: { position: 'absolute', right: 16, top: 44, width: 136, height: 90 },
  deal: { width: '100%', height: 128 },
  shadow: { boxShadow: '0px 3px 8px #171a1f26' },
})
