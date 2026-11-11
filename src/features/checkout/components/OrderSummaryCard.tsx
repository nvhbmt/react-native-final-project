import { Text, View } from '@tamagui/tailwind'
import type { ReactNode } from 'react'

import { Divider } from '@/components/ui/Divider'
import { TAX_RATE } from '@/features/cart'
import { formatPrice, formatVnd, maskCardNumber } from '@/lib/format'

import type { Order } from '../types'
import { OrderStatusBadge } from './OrderStatusBadge'
import { PaymentLogo } from './PaymentLogo'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[14px] leading-[22px] text-neutral-600">{label}</Text>
      {children}
    </View>
  )
}

function Amount({ value }: { value: number }) {
  return <Text className="text-[18px] leading-[28px] text-neutral-900">{formatPrice(value)}</Text>
}

export function OrderSummaryCard({ order }: { order: Order }) {
  const { paymentMethod: pm } = order

  return (
    <View className="gap-[18px] rounded-[6px] bg-neutral-100 px-5 py-6">
      <Row label="Tạm tính">
        <Amount value={order.subtotal} />
      </Row>
      {order.discount > 0 ? (
        <Row label="Giảm giá">
          <Amount value={-order.discount} />
        </Row>
      ) : null}
      <Row label={`Thuế (${Math.round(TAX_RATE * 100)}%)`}>
        <Amount value={order.tax} />
      </Row>
      <Row label={order.shippingMethod ? `Phí vận chuyển (${order.shippingMethod.label})` : 'Phí vận chuyển'}>
        <Amount value={order.fees} />
      </Row>
      <Divider className="bg-neutral-300" />
      <Row label={pm.kind === 'bank_transfer' ? 'Chuyển khoản' : pm.brand === 'paypal' ? 'PayPal' : 'Thẻ'}>
        <View className="flex-row items-center gap-2">
          <PaymentLogo brand={pm.brand} size={28} />
          {pm.kind === 'demo_card' ? (
            <Text className="text-[12px] leading-[20px] font-bold text-neutral-900">
              {pm.brand === 'paypal' ? pm.label : maskCardNumber(pm.label)}
            </Text>
          ) : null}
        </View>
      </Row>
      {order.amountVnd ? (
        <Row label="Số tiền (VND)">
          <Text className="text-[16px] leading-[26px] text-neutral-900">{formatVnd(order.amountVnd)}</Text>
        </Row>
      ) : null}
      <Divider className="bg-neutral-300" />
      <Row label="Tổng cộng">
        <View className="flex-row items-center gap-2">
          <OrderStatusBadge order={order} />
          <Text className="text-[20px] leading-[30px] text-neutral-900">{formatPrice(order.total)}</Text>
        </View>
      </Row>
    </View>
  )
}
