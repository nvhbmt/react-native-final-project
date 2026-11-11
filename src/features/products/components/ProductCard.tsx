import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { memo } from 'react'
import { router } from 'expo-router'
import { StyleSheet } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { MarketHeading, MarketText } from '@/components/marketplace/MarketText'
import { Rating } from '@/components/marketplace/Rating'
import { useCartStore } from '@/features/cart'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

import { formatProductPrice } from '../lib/formatProductPrice'
import type { Product } from '../types'

function AddButton({ product, color }: { product: Product; color: string }) {
  const addItem = useCartStore((state) => state.addItem)
  const addToCart = () => {
    if (product.available === false) return
    if (product.hasVariants) {
      router.push({ pathname: '/product/[id]', params: { id: product.id } })
      return
    }
    addItem({ productId: product.id, name: product.name, subtitle: product.subtitle, image: product.image, price: product.price })
  }
  return (
    <YStack {...keyboardAction} role="button" aria-label={product.hasVariants ? `Chọn phân loại cho ${product.name}` : `Thêm ${product.name} vào giỏ`} aria-disabled={product.available === false} w={23} h={23} hitSlop={10} onPress={addToCart} opacity={product.available === false ? 0.4 : '1 press:0.5'}>
      <MaterialCommunityIcons name="plus-circle-outline" size={23} color={color} />
    </YStack>
  )
}

export const ProductRow = memo(function ProductRow({ product, accent = m.purple }: { product: Product; accent?: string }) {
  return (
    <XStack h={88} rounded={5} borderWidth={1} borderColor={m.border} items="center" px={16} gap={12}>
      <XStack {...keyboardAction} flex={1} minW={0} gap={12} items="center" role="link" aria-label={`Xem chi tiết ${product.name}`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
        <Image source={product.image} contentFit="contain" style={styles.rowImage} accessibilityLabel={product.name} />
        <YStack flex={1} minW={0} gap={10}>
          <MarketHeading fontSize={14} lineHeight="22px" numberOfLines={1}>{product.name}</MarketHeading>
          {product.rating === null ? <MarketText fontSize={10} color={m.muted}>Chưa có đánh giá</MarketText> : <Rating value={product.rating} />}
        </YStack>
      </XStack>
      <YStack items="flex-end" gap={8}>
        <AddButton product={product} color={accent} />
        <MarketText color={m.ink} fontWeight="600" fontSize={16} lineHeight="22px">{formatProductPrice(product)}</MarketText>
      </YStack>
    </XStack>
  )
})

export const ProductGridCard = memo(function ProductGridCard({ product }: { product: Product }) {
  return (
    <YStack flex={1} minW={0}>
      <YStack {...keyboardAction} bg={m.surface} rounded={4} overflow="hidden" h={128} role="link" aria-label={`Xem chi tiết ${product.name}`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
        <Image source={product.image} style={styles.gridImage} contentFit="contain" accessibilityLabel={product.name} />
      </YStack>
      <YStack px={10} mt={12} gap={8}>
        <XStack items="center" justify="space-between" gap={4}>
          <MarketHeading {...keyboardAction} role="link" onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })} fontSize={14} lineHeight="22px" color={m.ink} flex={1} numberOfLines={1}>{product.name}</MarketHeading>
          <AddButton product={product} color={m.muted} />
        </XStack>
        <XStack items="center" justify="space-between">
          {product.rating === null ? <MarketText fontSize={10} color={m.muted}>Chưa có đánh giá</MarketText> : <Rating value={product.rating} />}
          <MarketText fontWeight="600" color={m.ink}>{formatProductPrice(product)}</MarketText>
        </XStack>
      </YStack>
    </YStack>
  )
})

export function EmptyProducts() {
  return <MarketText text="center" color={m.secondary} py={32}>Không tìm thấy sản phẩm.</MarketText>
}

const styles = StyleSheet.create({
  rowImage: { width: 59, height: 62 },
  gridImage: { width: '100%', height: 128 },
})
