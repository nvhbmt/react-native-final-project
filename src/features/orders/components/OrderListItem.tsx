import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'
import { router } from 'expo-router'

import { OrderStatusBadge } from '@/features/checkout/components/OrderStatusBadge'
import type { Order } from '@/features/checkout/types'
import { formatPrice } from '@/lib/format'
import { appColors } from '@/theme/tamagui.config'

export function OrderListItem({ order }: { order: Order }) {
  const count = order.items.reduce((n, item) => n + item.quantity, 0)
  const first = order.items[0]
  return (
    <View
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
      role="link"
      aria-label={`Đơn ${order.code}`}
      className="gap-3 rounded-[8px] border border-neutral-200 p-4 active:bg-neutral-100"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-heading text-[15px] leading-[24px] font-bold text-neutral-900">#{order.code}</Text>
        <OrderStatusBadge order={order} />
      </View>
      <View className="flex-row items-center gap-3">
        {first ? <Image source={first.image} style={{ width: 48, height: 48, borderRadius: 4 }} contentFit="contain" /> : null}
        <View className="flex-1 gap-[2px]">
          <Text numberOfLines={1} className="text-[14px] leading-[22px] text-neutral-700">
            {first?.name}{order.items.length > 1 ? ` và ${order.items.length - 1} sản phẩm khác` : ''}
          </Text>
          <Text className="text-[12px] leading-[18px] text-neutral-500">
            {new Date(order.createdAt).toLocaleDateString('vi-VN')} · {count} sản phẩm
          </Text>
        </View>
        <Text className="text-[15px] leading-[24px] font-semibold text-neutral-900">{formatPrice(order.total)}</Text>
        <Ionicons name="chevron-forward" size={16} color={appColors['neutral-400']} />
      </View>
    </View>
  )
}
