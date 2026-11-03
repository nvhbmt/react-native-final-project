import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Image, ScrollView, StyleSheet } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { MarketHeading, MarketText } from '@/components/marketplace/MarketText'
import { hasActiveFilters, useProductFilters } from '@/features/filters'
import { filterProducts, recommendedProducts } from '@/features/products'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

export function RecommendedProducts() {
  const filters = useProductFilters()
  const products = hasActiveFilters(filters) ? filterProducts(recommendedProducts, '', filters) : recommendedProducts
  return (
    <YStack gap={20}>
      <XStack px={24} items="center" justify="space-between">
        <MarketHeading>Recommended for you</MarketHeading>
        <MarketText {...keyboardAction} role="button" aria-label="View all recommended products" onPress={() => router.push('/product-listing')} color={m.muted} hitSlop={8}>View all</MarketText>
      </XStack>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {products.length === 0 && <MarketText color={m.secondary}>No products found.</MarketText>}
        {products.map((product) => (
          <YStack {...keyboardAction} key={product.id} w={132} h={208} rounded={3} bg={m.surface} overflow="hidden" role="button" aria-label={`${product.name}, $${product.price}`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
            <Image source={product.image} style={styles.image} resizeMode="contain" />
            <YStack px={18} pt={14} gap={12}>
              <MarketHeading fontSize={12} lineHeight="18px">{product.name}</MarketHeading>
              <XStack items="center" gap={6}>
                <Ionicons name="star" color={m.star} size={17} />
                <MarketText fontSize={10} lineHeight="18px">{product.rating}</MarketText>
                <MarketText ml="auto" fontSize={14} lineHeight="20px" color={m.primary} fontWeight="700">${product.price}</MarketText>
              </XStack>
            </YStack>
          </YStack>
        ))}
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 18 },
  image: { width: 132, height: 124 },
})
