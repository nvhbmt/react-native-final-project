import { Text, View } from '@tamagui/tailwind'
import { Redirect, router } from 'expo-router'
import { useRef, useState } from 'react'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import { useAuthStatus, useCurrentUser } from '@/features/auth'
import { type CartTotals, useCartStore, useCartTotals } from '@/features/cart'
import { invalidateReviews } from '@/features/product/api/reviews'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { useCatalogRequest } from '@/features/products/hooks/useCatalogRequest'
import { api, ApiError } from '@/lib/api'
import { formatPrice } from '@/lib/format'

import { invalidateOrders } from '../api/ordersApi'
import { PaymentMethodOption } from '../components/PaymentMethodOption'
import type { Order, PaymentMethod } from '../types'

export function PaymentScreen() {
  const cartTotals = useCartTotals()
  const clearCart = useCartStore((s) => s.clear)
  const items = useCartStore((s) => s.items)
  const voucher = useCartStore((s) => s.voucher?.code)
  const auth = useAuthStatus()
  const user = useCurrentUser()
  const methods = useCatalogRequest<PaymentMethod[]>(user ? '/payment-methods' : undefined, { auth: true, version: user?.id })
  const [chosenId, setChosenId] = useState<string | null>(null)
  const selectedId = chosenId ?? methods.data?.[0]?.id ?? null
  const selected = methods.data?.find((m) => m.id === selectedId)
  // Sau khi đặt, giỏ bị xoá nhưng màn này vẫn hiện trong lúc chuyển màn → giữ số đã đặt.
  const [paidTotals, setPaidTotals] = useState<CartTotals | null>(null)
  const totals = paidTotals ?? cartTotals
  const submitting = useRef(false)
  const request = useRef<{ key: string; signature: string } | undefined>(undefined)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  if (items.length === 0 && !paidTotals) return <Redirect href="/checkout" />

  const placeOrder = async () => {
    if (auth === 'guest') { router.push('/login'); return }
    if (!user || !selected || submitting.current || cartTotals.total <= 0) return
    submitting.current = true
    setPending(true)
    setError('')
    const body = { paymentMethod: selected.id, voucher, items: items.map(({ productId, quantity, options }) => ({ productId, quantity, options })) }
    // Cùng nội dung → cùng requestId: bấm lại sau khi mất mạng không tạo đơn trùng.
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
      invalidateOrders()
      router.dismissTo('/')
      if (order.status === 'pending_payment') router.push({ pathname: '/checkout/transfer', params: { id: order.id } })
      else router.push({ pathname: '/checkout/success', params: { id: order.id } })
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Không đặt được đơn hàng, vui lòng thử lại.')
    } finally {
      clearTimeout(timeout)
      submitting.current = false
      setPending(false)
    }
  }

  const isTransfer = selected?.kind === 'bank_transfer'

  return (
    <Screen header={<AppHeader title="Payment" />} contentClassName="px-5 pt-[60px] pb-6" safeBottom>
      <View className="items-center gap-1">
        <Text className="text-[14px] leading-[22px] font-semibold uppercase text-neutral-700">Total</Text>
        <Text className="text-[32px] leading-[48px] text-neutral-900">{formatPrice(totals.total)}</Text>
      </View>

      {auth === 'guest' ? (
        <Text className="pt-6 text-center text-[14px] leading-[22px] text-neutral-600">Đăng nhập để chọn phương thức thanh toán.</Text>
      ) : methods.loading || methods.error || auth === 'unknown' ? (
        <CatalogStatus
          loading={methods.loading || auth === 'unknown'}
          message={methods.error ? 'Không tải được phương thức thanh toán.' : undefined}
          onRetry={methods.error ? methods.retry : undefined}
        />
      ) : methods.data?.length ? (
        <View className="gap-5 pt-6" role="radiogroup">
          {methods.data.map((m) => (
            <PaymentMethodOption key={m.id} method={m} selected={m.id === selectedId} onSelect={() => { if (!submitting.current) setChosenId(m.id) }} />
          ))}
        </View>
      ) : (
        <Text className="pt-6 text-center text-[14px] leading-[22px] text-neutral-600">Hiện chưa có phương thức thanh toán khả dụng.</Text>
      )}

      {selected ? (
        <Text className="pt-4 text-[12px] leading-[20px] text-neutral-500">
          {isTransfer
            ? 'Sau khi đặt, quét mã VietQR bằng app ngân hàng. Đơn được xác nhận tự động khi nhận được tiền.'
            : 'Thanh toán demo — không thu tiền thật.'}
        </Text>
      ) : null}
      {error ? <Text role="alert" className="pt-2 text-[14px] text-red-700">{error}</Text> : null}
      <Button
        title={pending ? 'Đang đặt hàng…' : auth === 'guest' ? 'Sign in to place order' : isTransfer ? 'Đặt hàng & chuyển khoản' : 'Place demo order'}
        leftIcon={isTransfer ? 'qr-code-outline' : 'card-outline'}
        className="mt-5"
        onPress={placeOrder}
        disabled={pending || auth === 'unknown' || !!paidTotals || totals.total <= 0 || (auth === 'authenticated' && !selected)}
      />
    </Screen>
  )
}
