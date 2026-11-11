import { Text, View } from '@tamagui/tailwind'

import { cn } from '@/lib/cn'

import { ORDER_STATUS_LABEL } from '../api/ordersApi'
import type { OrderStatus } from '../types'

const tone: Record<OrderStatus, string> = {
  pending_payment: 'bg-[#fff6e5] text-[#a15c00]',
  completed: 'bg-success-50 text-success-700',
  cancelled: 'bg-neutral-200 text-neutral-600',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const [bg, text] = tone[status].split(' ')
  return (
    <View className={cn('rounded-full px-2 py-[2px]', bg)}>
      <Text className={cn('text-[12px] leading-[20px]', text)}>{ORDER_STATUS_LABEL[status]}</Text>
    </View>
  )
}
