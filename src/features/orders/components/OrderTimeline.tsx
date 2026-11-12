import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import type { ComponentProps } from 'react'

import type { Order } from '@/features/checkout/types'
import { cn } from '@/lib/cn'
import { appColors } from '@/theme/tamagui.config'

type Step = { key: string; label: string; icon: ComponentProps<typeof Ionicons>['name']; at: number | null; danger?: boolean }

const formatTime = (at: number) => new Date(at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })

function stepsOf(order: Order): Step[] {
  // Đơn demo xác nhận ngay khi đặt; đơn SePay xác nhận lúc nhận được tiền.
  const confirmedAt = order.paidAt ?? (order.status === 'completed' ? order.createdAt : null)
  const steps: Step[] = [
    { key: 'placed', label: 'Đã đặt hàng', icon: 'receipt-outline', at: order.createdAt },
    { key: 'confirmed', label: order.paymentMode === 'verified' ? 'Đã thanh toán' : 'Đã xác nhận', icon: 'checkmark-circle-outline', at: confirmedAt },
  ]
  if (order.status === 'cancelled') return [...steps.filter((s) => s.at), { key: 'cancelled', label: 'Đã huỷ', icon: 'close-circle-outline', at: order.cancelledAt, danger: true }]
  return [
    ...steps,
    { key: 'shipping', label: 'Đang giao hàng', icon: 'car-outline', at: order.shippedAt },
    { key: 'delivered', label: 'Đã giao hàng', icon: 'home-outline', at: order.deliveredAt },
  ]
}

/** Dòng thời gian đơn hàng: đặt → xác nhận/thanh toán → đang giao → đã giao (hoặc đã huỷ). */
export function OrderTimeline({ order }: { order: Order }) {
  const steps = stepsOf(order)
  return (
    <View className="rounded-[6px] border border-neutral-300 px-4 py-3" role="list" aria-label="Tiến độ đơn hàng">
      {steps.map((step, i) => {
        const time = step.at !== null ? formatTime(step.at) : null
        const done = time !== null
        const color = step.danger ? appColors.danger : done ? appColors.primary : appColors['neutral-400']
        const nextDone = steps[i + 1]?.at != null
        return (
          <View key={step.key} className="flex-row gap-3" role="listitem" aria-label={`${step.label}, ${time ?? 'chưa tới'}`}>
            <View className="items-center">
              <Ionicons name={step.icon} size={20} color={color} />
              {i < steps.length - 1 ? (
                <View className={cn('my-1 w-[2px] flex-1', nextDone ? 'bg-primary' : 'bg-neutral-300')} style={{ minHeight: 14 }} />
              ) : null}
            </View>
            <View className="flex-1 pb-3">
              <Text className={cn('text-[14px] leading-[20px]', done ? 'font-semibold text-neutral-900' : 'text-neutral-500')}>{step.label}</Text>
              {time ? <Text className="text-[12px] leading-[18px] text-neutral-500">{time}</Text> : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}
