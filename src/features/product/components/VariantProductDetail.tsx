import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useWindowDimensions } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Screen } from '@/components/ui/Screen'
import { useCartStore } from '@/features/cart'
import { formatProductPrice } from '@/features/products/lib/formatProductPrice'
import { formatPrice } from '@/lib/format'
import { HeaderActions } from '@/navigation/HeaderActions'
import { appColors } from '@/theme/tamagui.config'

import type { Product, ProductSelection } from '../types'
import { ColorSwatches } from './ColorSwatches'
import { SizeSelector } from './SizeSelector'
import { ThumbnailGallery } from './ThumbnailGallery'

const PADDING = 24

function Label({ children }: { children: string }) {
  return <Text className="text-[16px] leading-[26px] text-neutral-800">{children}</Text>
}

function LinkRow({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View onPress={onPress} role="button" className="h-[72px] flex-row items-center justify-between active:opacity-70">
      <Text className="font-heading text-[16px] leading-[26px] font-bold text-neutral-700">{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={appColors['neutral-500']} />
    </View>
  )
}

/** Trang chi tiết có biến thể: gallery thumbnail, chọn màu/size/số lượng. */
export function VariantProductDetail({ product }: { product: Product & { variants: NonNullable<Product['variants']> } }) {
  const { width } = useWindowDimensions()
  const contentWidth = Math.min(width, 520) - PADDING * 2
  const { colors, sizes } = product.variants
  const params = useLocalSearchParams<{ color?: string; size?: string }>()
  const [imageIndex, setImageIndex] = useState(0)
  const [selection, setSelection] = useState<ProductSelection>({
    colorId: colors.find((color) => color.id === params.color)?.id ?? colors[0]?.id,
    size: sizes.includes(params.size ?? '') ? params.size : sizes[Math.floor(sizes.length / 2)],
    quantity: 1,
  })
  const addItem = useCartStore((s) => s.addItem)
  const color = colors.find((item) => item.id === selection.colorId)
  const images = color?.image && !product.images.includes(color.image) ? [color.image, ...product.images] : product.images
  const unavailable = product.available === false
  const update = (patch: Partial<ProductSelection>) => setSelection((s) => ({ ...s, ...patch }))

  const addToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      subtitle: [color?.name, selection.size].filter(Boolean).join(' · '),
      image: color?.image ?? images[0],
      price: product.price,
      quantity: selection.quantity,
      options: { color: selection.colorId, size: selection.size },
    })
    router.push('/checkout')
  }

  return (
    <Screen
      header={<AppHeader title={product.categoryName} align="left" right={<HeaderActions />} />}
      contentClassName="px-6 pt-1 pb-6"
      footer={
        <View className="border-t border-neutral-200 px-6 pt-6 pb-3">
          <Button title={unavailable ? 'Out of stock' : 'Add to cart'} leftIcon="cart-outline" disabled={unavailable} onPress={addToCart} />
        </View>
      }
    >
      <ThumbnailGallery images={images} selected={imageIndex} onSelect={setImageIndex} width={contentWidth} />

      <View className="flex-row items-center gap-2 pt-8">
        <Text className="font-heading text-[32px] leading-[48px] font-bold text-primary">{formatProductPrice(product)}</Text>
        {product.promoLabel ? (
          <View className="rounded-full bg-secondary-50 px-2 py-0.5">
            <Text className="text-[11px] leading-[18px] text-secondary">{product.promoLabel}</Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between pt-3">
        <View className="flex-1 gap-1">
          <Text className="font-heading text-[24px] leading-[36px] font-bold text-neutral-900">{product.name}</Text>
          <Text className="text-[12px] leading-[20px] text-neutral-600">{product.subtitle}</Text>
        </View>
        {product.rating !== null && <View className="flex-row items-center gap-2">
          <Ionicons name="star" size={22} color={appColors.warning} />
          <Text className="text-[14px] leading-[22px] font-bold text-neutral-800">{product.rating}</Text>
        </View>}
      </View>

      {colors.length > 0 && <View className="gap-2 pt-7">
        <Label>Color</Label>
        <ColorSwatches colors={colors} value={selection.colorId} onChange={(colorId) => { update({ colorId }); setImageIndex(0) }} />
      </View>}

      {sizes.length > 0 && <View className="gap-2 pt-6">
        <Label>Size</Label>
        <SizeSelector sizes={sizes} value={selection.size} onChange={(size) => update({ size })} />
      </View>}

      <View className="gap-2 pt-6">
        <Label>Quantity</Label>
        <View className="flex-row items-center justify-between">
          <QuantityStepper value={selection.quantity} onChange={(quantity) => update({ quantity })} />
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[12px] leading-[20px] text-neutral-550">Total</Text>
            <Text className="font-heading text-[20px] leading-[30px] font-bold text-neutral-900">
              {formatPrice(product.price * selection.quantity)}
            </Text>
          </View>
        </View>
      </View>

      <View className="pt-6">
        <Divider />
        {product.sizeChart && <><LinkRow
          title="Size guide"
          onPress={() => router.push({ pathname: '/product/[id]/size-guide', params: { id: product.id, size: selection.size ?? '' } })}
        />
        <Divider /></>}
        <LinkRow title={`Reviews (${product.reviewCount})`} onPress={() => router.push(`/product/${product.id}/reviews`)} />
      </View>
    </Screen>
  )
}
