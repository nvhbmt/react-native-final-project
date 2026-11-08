import { Text, View } from '@tamagui/tailwind'
import { Redirect, router } from 'expo-router'
import { useRef, useState } from 'react'
import { Alert } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import { useAuthStatus, useCurrentUser } from '@/features/auth'
import { type CartTotals, useCartStore, useCartTotals } from '@/features/cart'
import { invalidateReviews } from '@/features/product/api/reviews'
import { api, ApiError } from '@/lib/api'
import { formatPrice } from '@/lib/format'

import { PaymentMethodOption } from '../components/PaymentMethodOption'
import { PAYMENT_METHODS } from '../data/paymentMethods.mock'
import type { Order } from '../types'

export function PaymentScreen() {
  const cartTotals = useCartTotals()
  const clearCart = useCartStore((s) => s.clear)
  const items = useCartStore((s) => s.items)
  const voucher = useCartStore((s) => s.voucher?.code)
  const auth = useAuthStatus()
  const user = useCurrentUser()
  const [selectedId, setSelectedId] = useState(PAYMENT_METHODS[0].id)
  // Sau khi trả tiền, giỏ bị xoá nhưng màn này vẫn hiện trong lúc chuyển màn → giữ số đã thanh toán.
  const [paidTotals, setPaidTotals] = useState<CartTotals | null>(null)
  const totals = paidTotals ?? cartTotals
  const submitting = useRef(false)
  const request = useRef<{ key: string; signature: string } | undefined>(undefined)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  if (items.length === 0 && !paidTotals) return <Redirect href="/checkout" />

  const payNow = async () => {
    if (auth === 'guest') { router.push('/login'); return }
    if (!user || submitting.current || cartTotals.total <= 0) return
    submitting.current = true
    setPending(true)
    setError('')
    const body = { paymentMethod: selectedId, voucher, items: items.map(({ productId, quantity, options }) => ({ productId, quantity, options })) }
    const signature = JSON.stringify([user.id, body])
    if (request.current?.signature !== signature) {
      request.current = { signature, key: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14).padEnd(12, '0')}` }
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      const order = await api.post<Order>('/orders', { ...body, requestId: request.current.key }, { signal: controller.signal })
      setPaidTotals(order)
      clearCart()
      invalidateReviews()
      router.dismissTo('/')
      router.push({ pathname: '/checkout/success', params: { id: order.id } })
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Could not confirm your order. Please try again.')
    } finally {
      clearTimeout(timeout)
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <Screen header={<AppHeader title="Payment" />} contentClassName="px-5 pt-[60px] pb-6" safeBottom>
      <View className="items-center gap-1">
        <Text className="text-[14px] leading-[22px] font-semibold uppercase text-neutral-700">Total</Text>
        <Text className="text-[32px] leading-[48px] text-neutral-900">{formatPrice(totals.total)}</Text>
      </View>

      <View className="gap-5 pt-6" role="radiogroup">
        {PAYMENT_METHODS.map((m) => (
          <PaymentMethodOption key={m.id} method={m} selected={m.id === selectedId} onSelect={() => { if (!submitting.current) setSelectedId(m.id) }} />
        ))}
      </View>

      <Text className="pt-4 text-[12px] leading-[20px] text-neutral-500">Demo checkout. No money will be charged.</Text>
      {error ? <Text role="alert" className="pt-2 text-[14px] text-red-700">{error}</Text> : null}
      <Button title={pending ? 'Placing order…' : auth === 'guest' ? 'Sign in to place order' : 'Place demo order'} leftIcon="card-outline" className="mt-5" onPress={payNow} disabled={pending || auth === 'unknown' || !!paidTotals || totals.total <= 0} />
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
