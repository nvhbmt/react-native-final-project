import { Text, View } from '@tamagui/tailwind'

import { cn } from '@/lib/cn'

import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL } from '../api/ordersApi'
import type { FulfillmentStatus, Order, OrderStatus } from '../types'

const statusTone: Record<OrderStatus, [bg: string, text: string]> = {
  pending_payment: ['bg-[#fff6e5]', 'text-[#a15c00]'],
  completed: ['bg-success-50', 'text-success-700'],
  cancelled: ['bg-neutral-200', 'text-neutral-600'],
}

const fulfillmentTone: Record<FulfillmentStatus, [bg: string, text: string]> = {
  processing: ['bg-[#eef6ff]', 'text-[#1d5fb8]'],
  shipping: ['bg-[#fff6e5]', 'text-[#a15c00]'],
  delivered: ['bg-success-50', 'text-success-700'],
}

/** Đơn đã thanh toán hiện tiến độ giao hàng; còn lại hiện trạng thái thanh toán. */
export function OrderStatusBadge({ order }: { order: Pick<Order, 'status' | 'fulfillment'> }) {
  const fulfillment = order.status === 'completed' ? order.fulfillment : null
  const [bg, text] = fulfillment ? fulfillmentTone[fulfillment] : statusTone[order.status]
  return (
    <View className={cn('rounded-full px-2 py-[2px]', bg)}>
      <Text className={cn('text-[12px] leading-[20px]', text)}>
        {fulfillment ? FULFILLMENT_LABEL[fulfillment] : ORDER_STATUS_LABEL[order.status]}
      </Text>
    </View>
  )
}
