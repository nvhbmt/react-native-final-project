import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'

import { ClampedText } from '@/components/ui/ClampedText'
import { formatPrice } from '@/lib/format'
import { appColors } from '@/theme/tamagui.config'

import { useCartStore } from '../store/cartStore'
import type { CartItem } from '../types'

/** Một dòng giỏ hàng. Nút bút chì bật chế độ sửa: đổi số lượng hoặc xoá dòng. */
export function CartItemRow({ item }: { item: CartItem }) {
  const [editing, setEditing] = useState(false)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const openProduct = () => router.push(`/product/${item.productId}`)

  return (
    <View className="h-[99px] flex-row items-center gap-4">
      <View onPress={openProduct} role="link" aria-label={item.name} className="active:opacity-80">
        <Image source={{ uri: item.image }} style={{ width: 80, height: 80, borderRadius: 4 }} contentFit="cover" />
      </View>
      <View className="flex-1 gap-1 pl-1.5">
        <ClampedText lines={1} className="font-heading text-[14px] leading-[22px] font-bold text-neutral-700">
          {item.name}
        </ClampedText>
        <ClampedText lines={1} className="text-[11px] leading-[18px] text-neutral-500">
          {item.subtitle}
        </ClampedText>
        <Text className="text-[16px] leading-[26px] text-neutral-700">{formatPrice(item.price)}</Text>
      </View>
      <View className="h-[80px] items-end justify-between">
        <View
          onPress={() => setEditing((v) => !v)}
          role="button"
          aria-label={editing ? 'Xong' : `Sửa ${item.name}`}
          aria-pressed={editing}
          hitSlop={8}
          className="active:opacity-60"
        >
          <Ionicons
            name={editing ? 'checkmark' : 'pencil'}
            size={editing ? 18 : 14}
            color={editing ? appColors.primary : appColors['neutral-500']}
          />
        </View>
        {editing ? (
          <View className="flex-row items-center gap-2">
            <View
              onPress={() => removeItem(item.key)}
              role="button"
              aria-label={`Xoá ${item.name}`}
              hitSlop={6}
              className="active:opacity-60"
            >
              <Ionicons name="trash-outline" size={16} color={appColors.danger} />
            </View>
            <View
              onPress={() => setQuantity(item.key, item.quantity - 1)}
              role="button"
              aria-label="Giảm số lượng"
              className="size-[24px] items-center justify-center rounded-[4px] bg-neutral-200 active:opacity-70"
            >
              <Ionicons name="remove" size={14} color={appColors['neutral-600']} />
            </View>
            <Text className="min-w-[14px] text-center text-[14px] leading-[22px] text-neutral-900">{item.quantity}</Text>
            <View
              onPress={() => setQuantity(item.key, item.quantity + 1)}
              role="button"
              aria-label="Tăng số lượng"
              className="size-[24px] items-center justify-center rounded-[4px] bg-primary active:opacity-70"
            >
              <Ionicons name="add" size={14} color="#ffffff" />
            </View>
          </View>
        ) : (
          <Text className="text-[14px] leading-[22px] text-neutral-900">x{item.quantity}</Text>
        )}
      </View>
    </View>
  )
}
