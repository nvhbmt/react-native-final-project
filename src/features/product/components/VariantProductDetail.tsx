import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'
import { useState } from 'react'
import { useWindowDimensions } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Screen } from '@/components/ui/Screen'
import { useCartStore } from '@/features/cart'
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
export function VariantProductDetail({ product }: { product: Product & Required<Pick<Product, 'variants'>> }) {
  const { width } = useWindowDimensions()
  const contentWidth = Math.min(width, 520) - PADDING * 2
  const { colors, sizes } = product.variants
  const [imageIndex, setImageIndex] = useState(Math.min(2, product.images.length - 1))
  const [selection, setSelection] = useState<ProductSelection>({
    colorId: colors[colors.length - 1]?.id,
    size: sizes[Math.floor(sizes.length / 2)],
    quantity: 1,
  })
  const addItem = useCartStore((s) => s.addItem)
  const update = (patch: Partial<ProductSelection>) => setSelection((s) => ({ ...s, ...patch }))

  const addToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      subtitle: [colors.find((c) => c.id === selection.colorId)?.name, selection.size].filter(Boolean).join(' · '),
      image: product.images[imageIndex],
      price: product.price,
      quantity: selection.quantity,
      options: { color: selection.colorId, size: selection.size },
    })
    router.push('/checkout')
  }

  return (
    <Screen
      header={<AppHeader title={product.category} align="left" right={<HeaderActions />} />}
      contentClassName="px-6 pt-1 pb-6"
      footer={
        <View className="border-t border-neutral-200 px-6 pt-6 pb-3">
          <Button title="Add to cart" leftIcon="cart-outline" onPress={addToCart} />
        </View>
      }
    >
      <ThumbnailGallery images={product.images} selected={imageIndex} onSelect={setImageIndex} width={contentWidth} />

      <View className="flex-row items-center gap-2 pt-8">
        <Text className="font-heading text-[32px] leading-[48px] font-bold text-primary">{formatPrice(product.price)}</Text>
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
        <View className="flex-row items-center gap-2">
          <Ionicons name="star" size={22} color={appColors.warning} />
          <Text className="text-[14px] leading-[22px] font-bold text-neutral-800">{product.rating}</Text>
        </View>
      </View>

      <View className="gap-2 pt-7">
        <Label>Color</Label>
        <ColorSwatches colors={colors} value={selection.colorId} onChange={(colorId) => update({ colorId })} />
      </View>

      <View className="gap-2 pt-6">
        <Label>Size</Label>
        <SizeSelector sizes={sizes} value={selection.size} onChange={(size) => update({ size })} />
      </View>

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
        <LinkRow title="Size guide" />
        <Divider />
        <LinkRow title={`Reviews (${product.reviewCount})`} />
      </View>
    </Screen>
  )
}
