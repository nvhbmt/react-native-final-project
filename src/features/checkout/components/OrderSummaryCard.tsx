import { Text, View } from '@tamagui/tailwind'
import type { ReactNode } from 'react'

import { Divider } from '@/components/ui/Divider'
import { TAX_RATE } from '@/features/cart'
import { formatPrice, maskCardNumber } from '@/lib/format'

import type { Order } from '../types'
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
      <Row label="Subtotal">
        <Amount value={order.subtotal} />
      </Row>
      {order.discount > 0 ? (
        <Row label="Discount">
          <Amount value={-order.discount} />
        </Row>
      ) : null}
      <Row label={`Tax (${Math.round(TAX_RATE * 100)}%)`}>
        <Amount value={order.tax} />
      </Row>
      <Row label="Fees">
        <Amount value={order.fees} />
      </Row>
      <Divider className="bg-neutral-300" />
      <Row label={pm.brand === 'paypal' ? 'PayPal' : 'Card'}>
        <View className="flex-row items-center gap-2">
          <PaymentLogo brand={pm.brand} size={28} />
          <Text className="text-[12px] leading-[20px] font-bold text-neutral-900">
            {pm.brand === 'paypal' ? pm.label : maskCardNumber(pm.label)}
          </Text>
        </View>
      </Row>
      <Divider className="bg-neutral-300" />
      <Row label="Total">
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-success-50 px-2 py-1">
            <Text className="text-[12px] leading-[20px] text-success-700">Success</Text>
          </View>
          <Text className="text-[20px] leading-[30px] text-success-800">{formatPrice(order.total)}</Text>
        </View>
      </Row>
    </View>
  )
}
