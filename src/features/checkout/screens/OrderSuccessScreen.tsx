import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { Redirect, router } from 'expo-router'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import { StarRating } from '@/components/ui/StarRating'

import { OrderSummaryCard } from '../components/OrderSummaryCard'
import { useOrderStore } from '../store/orderStore'

export function OrderSuccessScreen() {
  const order = useOrderStore((s) => s.lastOrder)
  // Design hiển thị sẵn 5 sao; chạm sao nào thì sáng tới đó rồi mở Feedback.
  const [rating, setRating] = useState(5)

  // Vào thẳng URL mà chưa có đơn → về trang chủ.
  if (!order) return <Redirect href="/" />

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
        <View className="mb-4 size-[74px] items-center justify-center rounded-full bg-success">
          <Ionicons name="checkmark-sharp" size={40} color="#ffffff" />
        </View>
        <Text className="text-center font-heading text-[20px] leading-[30px] font-bold text-primary">
          Order placed successfully!
        </Text>
        <Text className="max-w-[230px] text-center text-[14px] leading-[22px] text-neutral-500">
          Commodo eu ut sunt qui minim fugiat elit nisi enim
        </Text>
      </View>

      <View className="pt-6">
        <OrderSummaryCard order={order} />
      </View>

      <View className="items-center gap-2 pt-8">
        <Text className="text-[14px] leading-[22px] text-neutral-900">How was your experience?</Text>
        <StarRating
          value={rating}
          size={24}
          className="gap-1"
          onChange={(value) => {
            setRating(value)
            const productIds = [...new Set(order.items.map((item) => item.productId))]
            router.push({ pathname: '/feedback', params: { rating: String(value), orderId: order.id, ...(productIds.length === 1 ? { productId: productIds[0] } : {}) } })
          }}
        />
      </View>
    </Screen>
  )
}
