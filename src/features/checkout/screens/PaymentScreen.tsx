import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import { type CartTotals, useCartStore, useCartTotals } from '@/features/cart'
import { formatPrice } from '@/lib/format'

import { PaymentMethodOption } from '../components/PaymentMethodOption'
import { PAYMENT_METHODS } from '../data/paymentMethods.mock'
import { useOrderStore } from '../store/orderStore'

export function PaymentScreen() {
  const cartTotals = useCartTotals()
  const clearCart = useCartStore((s) => s.clear)
  const placeOrder = useOrderStore((s) => s.placeOrder)
  const [selectedId, setSelectedId] = useState(PAYMENT_METHODS[0].id)
  // Sau khi trả tiền, giỏ bị xoá nhưng màn này vẫn hiện trong lúc chuyển màn → giữ số đã thanh toán.
  const [paidTotals, setPaidTotals] = useState<CartTotals | null>(null)
  const totals = paidTotals ?? cartTotals

  const payNow = () => {
    const method = PAYMENT_METHODS.find((m) => m.id === selectedId)
    if (!method || paidTotals) return
    placeOrder(cartTotals, method)
    setPaidTotals(cartTotals)
    clearCart()
    // Đóng cả luồng checkout (product → checkout → payment) rồi mới mở Success, để Success nằm ngay
    // trên Home: back (vuốt, nút Android, back trình duyệt) về Home thay vì về giỏ hàng đã trống.
    router.dismissTo('/')
    router.push('/checkout/success')
  }

  return (
    <Screen header={<AppHeader title="Payment" />} contentClassName="px-5 pt-[60px] pb-6" safeBottom>
      <View className="items-center gap-1">
        <Text className="text-[14px] leading-[22px] font-semibold uppercase text-neutral-700">Total</Text>
        <Text className="text-[32px] leading-[48px] text-neutral-900">{formatPrice(totals.total)}</Text>
      </View>

      <View className="gap-5 pt-6" role="radiogroup">
        {PAYMENT_METHODS.map((m) => (
          <PaymentMethodOption key={m.id} method={m} selected={m.id === selectedId} onSelect={() => setSelectedId(m.id)} />
        ))}
      </View>

      <Button title="Pay now" leftIcon="card-outline" className="mt-5" onPress={payNow} disabled={totals.total <= 0} />
      <Button
        title="Add new card"
        variant="text"
        leftIcon="add"
        className="mt-3"
        onPress={() => Alert.alert('Add new card', 'Tính năng đang được phát triển.')}
      />
    </Screen>
  )
}
