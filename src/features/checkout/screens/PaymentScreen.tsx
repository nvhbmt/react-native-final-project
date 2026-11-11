import { Text, View } from '@tamagui/tailwind'
import { Redirect, router, useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useRef, useState } from 'react'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import type { Address } from '@/features/account'
import { useAuthStatus, useCurrentUser } from '@/features/auth'
import { type CartTotals, computeTotals, useCartStore } from '@/features/cart'
import { invalidateReviews } from '@/features/product/api/reviews'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { useCatalogRequest } from '@/features/products/hooks/useCatalogRequest'
import { api, ApiError } from '@/lib/api'
import { formatPrice } from '@/lib/format'

import { invalidateOrders } from '../api/ordersApi'
import { AddressPicker } from '../components/AddressPicker'
import { PaymentMethodOption } from '../components/PaymentMethodOption'
import { ShippingMethodPicker } from '../components/ShippingMethodPicker'
import type { Order, PaymentMethod, ShippingMethodId, ShippingOptionQuote } from '../types'

export function PaymentScreen() {
  const clearCart = useCartStore((s) => s.clear)
  const items = useCartStore((s) => s.items)
  const voucher = useCartStore((s) => s.voucher?.code)
  const voucherRate = useCartStore((s) => s.voucher?.rate ?? 0)
  // Hình thức giao mà mọi sản phẩm trong giỏ đều hỗ trợ; server kiểm tra lại khi đặt đơn.
  const productIds = [...new Set(items.map((item) => item.productId))].sort().join(',')
  const shipping = useCatalogRequest<ShippingOptionQuote[]>(productIds ? `/shipping-methods?products=${productIds}` : undefined)
  const [chosenShipping, setChosenShipping] = useState<ShippingMethodId | null>(null)
  const shippingOptions = shipping.data ?? []
  const selectedShipping = shippingOptions.find((o) => o.id === chosenShipping) ?? shippingOptions[0]
  const freeShipping = voucher === 'FREESHIP'
  const shippingFee = selectedShipping && !freeShipping ? selectedShipping.fee : 0
  const cartTotals = useMemo(() => computeTotals(items, voucherRate, shippingFee), [items, voucherRate, shippingFee])
  const auth = useAuthStatus()
  const user = useCurrentUser()
  const methods = useCatalogRequest<PaymentMethod[]>(user ? '/payment-methods' : undefined, { auth: true, version: user?.id })
  const [chosenId, setChosenId] = useState<string | null>(null)
  const selectedId = chosenId ?? methods.data?.[0]?.id ?? null
  const selected = methods.data?.find((m) => m.id === selectedId)
  // Tải lại sổ địa chỉ mỗi khi quay về từ màn Địa chỉ giao hàng (lần focus đầu đã tải sẵn).
  const [addressVersion, setAddressVersion] = useState(0)
  const focusedOnce = useRef(false)
  useFocusEffect(useCallback(() => {
    if (focusedOnce.current) setAddressVersion((v) => v + 1)
    focusedOnce.current = true
  }, []))
  const addresses = useCatalogRequest<Address[]>(user ? '/users/me/addresses' : undefined, { auth: true, version: `${user?.id}:${addressVersion}` })
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null)
  const addressList = addresses.data ?? []
  const selectedAddress = addressList.find((a) => a.id === chosenAddressId) ?? addressList.find((a) => a.isDefault) ?? addressList[0]
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
    if (!user || !selected || !selectedAddress || !selectedShipping || submitting.current || cartTotals.total <= 0) return
    submitting.current = true
    setPending(true)
    setError('')
    const body = { paymentMethod: selected.id, addressId: selectedAddress.id, shippingMethod: selectedShipping.id, voucher, items: items.map(({ productId, quantity, options }) => ({ productId, quantity, options })) }
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
    <Screen header={<AppHeader title="Thanh toán" />} contentClassName="px-5 pt-6 pb-6" safeBottom>
      <View className="items-center gap-1">
        <Text className="text-[14px] leading-[22px] font-semibold uppercase text-neutral-700">Tổng cộng</Text>
        <Text className="text-[32px] leading-[48px] text-neutral-900">{formatPrice(totals.total)}</Text>
      </View>

      <View className="gap-3 pt-6">
        <Text className="font-heading text-[16px] leading-[24px] font-bold text-neutral-900">Hình thức giao hàng</Text>
        {shipping.loading || shipping.error || (shipping.data && !shippingOptions.length) ? (
          <CatalogStatus
            loading={shipping.loading}
            message={shipping.error ? 'Không tải được hình thức giao hàng.' : shipping.data ? 'Giỏ hàng có sản phẩm không còn giao được.' : undefined}
            onRetry={shipping.error ? shipping.retry : undefined}
          />
        ) : (
          <ShippingMethodPicker
            options={shippingOptions}
            selectedId={selectedShipping?.id ?? null}
            freeShipping={freeShipping}
            onSelect={(id) => { if (!submitting.current) setChosenShipping(id) }}
          />
        )}
      </View>

      {auth === 'authenticated' ? (
        <View className="gap-3 pt-6">
          <Text className="font-heading text-[16px] leading-[24px] font-bold text-neutral-900">Giao đến</Text>
          {addresses.loading || addresses.error ? (
            <CatalogStatus
              loading={addresses.loading}
              message={addresses.error ? 'Không tải được địa chỉ giao hàng.' : undefined}
              onRetry={addresses.error ? addresses.retry : undefined}
            />
          ) : (
            <AddressPicker addresses={addressList} selectedId={selectedAddress?.id ?? null} onSelect={(id) => { if (!submitting.current) setChosenAddressId(id) }} />
          )}
          <Text className="pt-3 font-heading text-[16px] leading-[24px] font-bold text-neutral-900">Phương thức thanh toán</Text>
        </View>
      ) : null}

      {auth === 'guest' ? (
        <Text className="pt-6 text-center text-[14px] leading-[22px] text-neutral-600">Đăng nhập để chọn địa chỉ giao hàng và phương thức thanh toán.</Text>
      ) : methods.loading || methods.error || auth === 'unknown' ? (
        <CatalogStatus
          loading={methods.loading || auth === 'unknown'}
          message={methods.error ? 'Không tải được phương thức thanh toán.' : undefined}
          onRetry={methods.error ? methods.retry : undefined}
        />
      ) : methods.data?.length ? (
        <View className="gap-5 pt-3" role="radiogroup">
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
        title={pending ? 'Đang đặt hàng…' : auth === 'guest' ? 'Đăng nhập để đặt hàng' : isTransfer ? 'Đặt hàng & chuyển khoản' : 'Đặt hàng (demo)'}
        leftIcon={isTransfer ? 'qr-code-outline' : 'card-outline'}
        className="mt-5"
        onPress={placeOrder}
        disabled={pending || auth === 'unknown' || !!paidTotals || totals.total <= 0 || !selectedShipping || (auth === 'authenticated' && (!selected || !selectedAddress))}
      />
    </Screen>
  )
}
