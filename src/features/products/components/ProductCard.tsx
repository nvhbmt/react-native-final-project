import { MaterialCommunityIcons } from '@expo/vector-icons'
import { memo } from 'react'
import { router } from 'expo-router'
import { Image, StyleSheet } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { MarketHeading, MarketText } from '@/components/marketplace/MarketText'
import { Rating } from '@/components/marketplace/Rating'
import { useCartStore } from '@/features/cart'
import { productApi } from '@/features/product'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

import type { Product } from '../types'

function AddButton({ product, color }: { product: Product; color: string }) {
  const addItem = useCartStore((state) => state.addItem)
  const detail = productApi.getById(product.id)
  const addToCart = () => {
    if (!detail) return
    if (detail.variants) {
      router.push({ pathname: '/product/[id]', params: { id: product.id } })
      return
    }
    addItem({ productId: detail.id, name: detail.name, subtitle: detail.subtitle, image: detail.images[0], price: detail.price })
  }
  return (
    <YStack {...keyboardAction} role="button" aria-label={detail?.variants ? `Choose options for ${product.name}` : `Add ${product.name} to cart`} w={23} h={23} hitSlop={10} onPress={addToCart} opacity="1 press:0.5">
      <MaterialCommunityIcons name="plus-circle-outline" size={23} color={color} />
    </YStack>
  )
}

export const ProductRow = memo(function ProductRow({ product, accent = m.purple }: { product: Product; accent?: string }) {
  return (
    <XStack h={88} rounded={5} borderWidth={1} borderColor={m.border} items="center" px={16} gap={12}>
      <XStack {...keyboardAction} flex={1} minW={0} gap={12} items="center" role="link" aria-label={`View ${product.name} details`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
        <Image source={product.image} resizeMode="contain" style={styles.rowImage} accessibilityLabel={product.name} />
        <YStack flex={1} minW={0} gap={10}>
          <MarketHeading fontSize={14} lineHeight="22px" numberOfLines={1}>{product.name}</MarketHeading>
          <Rating value={product.rating} />
        </YStack>
      </XStack>
      <YStack items="flex-end" gap={8}>
        <AddButton product={product} color={accent} />
        <MarketText color={m.ink} fontWeight="600" fontSize={16} lineHeight="22px">${product.price}</MarketText>
      </YStack>
    </XStack>
  )
})

export const ProductGridCard = memo(function ProductGridCard({ product }: { product: Product }) {
  return (
    <YStack flex={1} minW={0}>
      <YStack {...keyboardAction} bg={m.surface} rounded={4} overflow="hidden" h={128} role="link" aria-label={`View ${product.name} details`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
        <Image source={product.image} style={styles.gridImage} resizeMode="contain" accessibilityLabel={product.name} />
      </YStack>
      <YStack px={10} mt={12} gap={8}>
        <XStack items="center" justify="space-between" gap={4}>
          <MarketHeading {...keyboardAction} role="link" onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })} fontSize={14} lineHeight="22px" color={m.ink} flex={1} numberOfLines={1}>{product.name}</MarketHeading>
          <AddButton product={product} color={m.muted} />
        </XStack>
        <XStack items="center" justify="space-between">
          <Rating value={product.rating} />
          <MarketText fontWeight="600" color={m.ink}>${product.price}</MarketText>
        </XStack>
      </YStack>
    </YStack>
  )
})

export function EmptyProducts() {
  return <MarketText text="center" color={m.secondary} py={32}>No products found.</MarketText>
}

const styles = StyleSheet.create({
  rowImage: { width: 59, height: 62 },
  gridImage: { width: '100%', height: 128 },
})
