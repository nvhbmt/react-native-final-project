import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { AppHeader } from '@/components/ui/AppHeader'
import { Screen } from '@/components/ui/Screen'
import { StarRating } from '@/components/ui/StarRating'
import { useAuthStatus, useCurrentUser } from '@/features/auth'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { useCatalogRequest } from '@/features/products/hooks/useCatalogRequest'

import { OrderSummaryCard } from '../components/OrderSummaryCard'
import type { Order } from '../types'

export function OrderSuccessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const auth = useAuthStatus()
  const user = useCurrentUser()
  const request = useCatalogRequest<Order>(id && user ? `/orders/${encodeURIComponent(id)}` : undefined, { auth: true, version: user?.id })
  const order = request.data
  const [rating, setRating] = useState(5)

  if (!order) return (
    <Screen header={<AppHeader title="Order" />}>
      <CatalogStatus loading={auth === 'unknown' || request.loading} message={auth === 'guest' ? 'Sign in to view your order.' : request.error || !id ? 'Could not load this order.' : undefined} onRetry={request.error ? request.retry : undefined} />
      {auth === 'guest' && <Button title="Sign in" onPress={() => router.push('/login')} />}
    </Screen>
  )
  const products = [...new Map(order.items.map((item) => [item.productId, item])).values()]

  return (
    <Screen
      contentClassName="px-5 pt-[60px] pb-6"
      footer={
        <View className="px-5 pb-3">
          <Button title="Back to Home" leftIcon="home-outline" onPress={() => router.dismissTo('/')} />
        </View>
      }
    >
      <View className="items-center gap-2">
        <View className={`mb-4 size-[74px] items-center justify-center rounded-full ${order.status === 'completed' ? 'bg-success' : order.status === 'pending_payment' ? 'bg-[#f5a524]' : 'bg-neutral-400'}`}>
          <Ionicons name={order.status === 'completed' ? 'checkmark-sharp' : order.status === 'pending_payment' ? 'time-outline' : 'close'} size={40} color="#ffffff" />
        </View>
        <Text className="text-center font-heading text-[20px] leading-[30px] font-bold text-primary">
          {order.status === 'completed' ? (order.paidAt ? 'Thanh toán thành công!' : 'Order placed successfully!') : order.status === 'pending_payment' ? 'Đang chờ thanh toán' : 'Đơn đã huỷ'}
        </Text>
        <Text className="max-w-[260px] text-center text-[14px] leading-[22px] text-neutral-500">
          {order.status === 'pending_payment'
            ? 'Chuyển khoản theo mã QR để hoàn tất đơn hàng.'
            : order.paymentMode === 'demo' ? 'This is a demo order. No payment was charged.' : `Đơn #${order.code} đã được xác nhận.`}
        </Text>
        {order.status === 'pending_payment' ? (
          <Button title="Mở mã thanh toán" className="mt-3" onPress={() => router.replace({ pathname: '/checkout/transfer', params: { id: order.id } })} />
        ) : null}
      </View>

      <View className="pt-6">
        <OrderSummaryCard order={order} />
      </View>

      {order.status === 'completed' && <View className="gap-3 pt-6">
        <Text className="font-heading text-[18px] font-bold text-neutral-700">Review your products</Text>
        {products.map((item) => <View key={item.productId} className="gap-2 rounded-[4px] bg-neutral-100 p-3">
          <Text numberOfLines={2} className="text-[14px] font-semibold text-neutral-700">{item.name}</Text>
          <Button title="Write a review" variant="outline" onPress={() => router.push({ pathname: '/product/[id]/write-review', params: { id: item.productId, orderId: order.id } })} />
        </View>)}
      </View>}

      <View className="items-center gap-2 pt-8">
        <Text className="text-[14px] leading-[22px] text-neutral-900">How was your experience?</Text>
        <StarRating
          value={rating}
          size={24}
          className="gap-1"
          onChange={(value) => {
            setRating(value)
            router.push({ pathname: '/feedback', params: { rating: String(value), orderId: order.id } })
          }}
        />
      </View>
    </Screen>
  )
}
