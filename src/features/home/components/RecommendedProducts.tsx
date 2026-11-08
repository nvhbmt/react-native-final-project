import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { MarketHeading, MarketText } from '@/components/marketplace/MarketText'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { formatProductPrice } from '@/features/products/lib/formatProductPrice'
import type { Product } from '@/features/products/types'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

export function RecommendedProducts({ products, loading, onRetry }: { products: Product[]; loading: boolean; onRetry?: () => void }) {
  return (
    <YStack gap={20}>
      <XStack px={24} items="center" justify="space-between">
        <MarketHeading>Recommended for you</MarketHeading>
        <MarketText {...keyboardAction} role="button" aria-label="View all recommended products" onPress={() => router.push('/product-listing')} color={m.muted} hitSlop={8}>View all</MarketText>
      </XStack>
      {loading || onRetry ? <CatalogStatus loading={loading} message={onRetry ? 'Could not load products.' : undefined} onRetry={onRetry} /> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {products.length === 0 && <MarketText color={m.secondary}>No products found.</MarketText>}
        {products.map((product) => (
          <YStack {...keyboardAction} key={product.id} w={132} h={208} rounded={3} bg={m.surface} overflow="hidden" role="button" aria-label={`${product.name}, ${formatProductPrice(product)}`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
            <Image source={product.image} style={styles.image} contentFit="contain" />
            <YStack px={12} pt={14} gap={12}>
              <MarketHeading fontSize={12} lineHeight="18px" numberOfLines={1}>{product.name}</MarketHeading>
              <XStack items="center" gap={5}>
                {product.rating !== null && <><Ionicons name="star" color={m.star} size={15} /><MarketText fontSize={10} lineHeight="18px">{product.rating}</MarketText></>}
                <MarketText ml="auto" fontSize={12} lineHeight="20px" color={m.primary} fontWeight="700" numberOfLines={1}>{formatProductPrice(product)}</MarketText>
              </XStack>
            </YStack>
          </YStack>
        ))}
      </ScrollView>}
    </YStack>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 18 },
  image: { width: 132, height: 124 },
})
