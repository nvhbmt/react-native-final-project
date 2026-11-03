import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'
import { router } from 'expo-router'

import { ClampedText } from '@/components/ui/ClampedText'
import { formatPrice } from '@/lib/format'
import { appColors } from '@/theme/tamagui.config'

import type { Product } from '../types'

type Props = {
  product: Product
  width?: number
}

/** Thẻ sản phẩm nhỏ (Relevant products, lưới Home). */
export function ProductCard({ product, width = 130 }: Props) {
  return (
    <View
      onPress={() => router.push(`/product/${product.id}`)}
      role="link"
      aria-label={product.name}
      className="gap-2 rounded-[4px] bg-neutral-100 px-2.5 pt-3 pb-3 active:opacity-80"
      style={{ width }}
    >
      <Image
        source={product.images[0]}
        style={{ width: width - 20, height: width * 0.65, borderRadius: 4 }}
        contentFit="cover"
      />
      <ClampedText lines={1} className="font-heading text-[12px] leading-[20px] font-bold text-neutral-700">
        {product.name}
      </ClampedText>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <Ionicons name="star" size={12} color={appColors.warning} />
          <Text className="text-[12px] leading-[20px] text-neutral-700">{product.rating}</Text>
        </View>
        <Text className="font-heading text-[12px] leading-[20px] font-bold text-neutral-900">
          {formatPrice(product.price)}
        </Text>
      </View>
    </View>
  )
}
