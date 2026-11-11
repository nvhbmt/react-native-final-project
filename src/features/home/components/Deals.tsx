import { Image } from 'expo-image'
import { router } from 'expo-router'
import { StyleSheet } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { MarketHeading, MarketText } from '@/components/marketplace/MarketText'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { formatProductPrice } from '@/features/products/lib/formatProductPrice'
import type { CatalogBanner, Product } from '@/features/products/types'
import { marketplace as m } from '@/theme/marketplace'

export function Deals({ hero, banners }: { hero?: Product; banners: CatalogBanner[] }) {
  const cards = ['fashion', 'electronics'].flatMap((category) => banners.filter((item) => item.category === category))
  return (
    <YStack px={24} gap={8}>
      {hero && <XStack position="relative" h={176} bg="#f5f1fe" borderTopLeftRadius={6} borderTopRightRadius={6} items="center" px={24} overflow="hidden">
        <YStack z={1} gap={2} maxW="55%">
          <MarketHeading fontSize={24} lineHeight="30px" color={m.primary} numberOfLines={2}>{hero.name}</MarketHeading>
          <MarketText fontSize={18} lineHeight="28px" color="#565656">{hero.discountPercent ? `Giảm ${hero.discountPercent}%` : formatProductPrice(hero)}</MarketText>
          <YStack {...keyboardAction} w={96} h={36} mt={12} bg={m.ink} rounded={3} items="center" justify="center" role="button" aria-label={`Mua ${hero.name} ngay`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: hero.id } })} opacity="1 press:0.8" style={styles.shadow}>
            <MarketText fontWeight="600" color="white">Mua ngay</MarketText>
          </YStack>
        </YStack>
        <Image source={hero.image} style={styles.shoe} contentFit="contain" accessibilityLabel={hero.name} />
      </XStack>}
      <XStack gap={8}>
        {cards.map((card, index) => (
          <YStack {...keyboardAction} key={card.category} position="relative" flex={1} h={128} overflow="hidden" borderBottomLeftRadius={index === 0 ? 6 : 0} borderBottomRightRadius={index === 1 ? 6 : 0} bg={m.surface} role="button" aria-label={`Xem ưu đãi ${card.title}`} onPress={() => router.push({ pathname: '/product-listing', params: { category: card.category } })}>
            <Image source={card.image} style={styles.deal} contentFit="contain" />
            <YStack style={styles.caption} px={8} py={4}>
              <MarketText color="white" fontSize={12} fontWeight="600">{card.title}{card.discountPercent ? ` · Giảm ${card.discountPercent}%` : ''}</MarketText>
            </YStack>
          </YStack>
        ))}
      </XStack>
    </YStack>
  )
}

const styles = StyleSheet.create({
  shoe: { position: 'absolute', right: 16, top: 44, width: 136, height: 90 },
  deal: { width: '100%', height: 128 },
  caption: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1, backgroundColor: '#171a1fcc' },
  shadow: { boxShadow: '0px 3px 8px #171a1f26' },
})
