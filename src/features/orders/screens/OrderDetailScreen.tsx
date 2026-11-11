import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Fragment, useState } from 'react'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { Screen } from '@/components/ui/Screen'
import { confirmAction } from '@/features/account/lib/confirm'
import { useRequireAuth } from '@/features/auth'
import { ordersApi } from '@/features/checkout/api/ordersApi'
import { OrderSummaryCard } from '@/features/checkout/components/OrderSummaryCard'
import { useOrder } from '@/features/checkout/hooks/useOrder'
import { invalidateReviews } from '@/features/product/api/reviews'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { ApiError } from '@/lib/api'
import { formatPrice } from '@/lib/format'

export function OrderDetailScreen() {
  useRequireAuth()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { order, error, retry, update } = useOrder(id)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!order) {
    return (
      <Screen header={<AppHeader title="Đơn hàng" />}>
        <CatalogStatus loading={!error} message={error ?? undefined} onRetry={error ? retry : undefined} />
      </Screen>
    )
  }

  const cancel = () => confirmAction('Huỷ đơn hàng?', `Đơn #${order.code} sẽ bị huỷ.`, 'Huỷ đơn', async () => {
    setBusy(true)
    setActionError(null)
    try {
      update(await ordersApi.cancel(order.id))
      invalidateReviews()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Không huỷ được đơn, vui lòng thử lại')
    } finally {
      setBusy(false)
    }
  })
  const products = [...new Map(order.items.map((item) => [item.productId, item])).values()]

  return (
    <Screen header={<AppHeader title={`Đơn #${order.code}`} />} contentClassName="gap-5 px-5 pt-3 pb-8" safeBottom>
      <Text className="text-[13px] leading-[20px] text-neutral-500">
        Đặt lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
        {order.paidAt ? ` · Thanh toán lúc ${new Date(order.paidAt).toLocaleString('vi-VN')}` : ''}
        {order.paymentMode === 'demo' ? ' · Đơn demo' : ''}
      </Text>

      <View>
        {order.items.map((item, i) => (
          <Fragment key={item.key}>
            {i > 0 ? <Divider className="bg-neutral-200" /> : null}
            <View className="flex-row items-center gap-3 py-3">
              <Image source={item.image} style={{ width: 56, height: 56, borderRadius: 4 }} contentFit="contain" />
              <View className="flex-1 gap-[2px]">
                <Text numberOfLines={2} className="text-[14px] leading-[22px] text-neutral-800">{item.name}</Text>
                <Text className="text-[12px] leading-[18px] text-neutral-500">{item.subtitle}</Text>
              </View>
              <Text className="text-[14px] text-neutral-700">{item.quantity} × {formatPrice(item.price)}</Text>
            </View>
          </Fragment>
        ))}
      </View>

      <OrderSummaryCard order={order} />

      {actionError ? <Text role="alert" className="text-[13px] text-danger">{actionError}</Text> : null}
      {order.status === 'pending_payment' ? (
        <Button title="Thanh toán ngay" leftIcon="qr-code-outline" onPress={() => router.push({ pathname: '/checkout/transfer', params: { id: order.id } })} />
      ) : null}
      {order.status === 'completed' ? products.map((item) => (
        <Button
          key={item.productId}
          title={`Đánh giá: ${item.name.length > 28 ? `${item.name.slice(0, 28)}…` : item.name}`}
          variant="outline"
          onPress={() => router.push({ pathname: '/product/[id]/write-review', params: { id: item.productId, orderId: order.id } })}
        />
      )) : null}
      <Button title="Hỏi trợ lý về đơn này" variant="text" leftIcon="chatbubbles-outline" onPress={() => router.push({ pathname: '/assistant', params: { orderId: order.id } })} />
      {order.cancellable ? <Button title={busy ? 'Đang huỷ…' : 'Huỷ đơn'} variant="text" disabled={busy} onPress={cancel} /> : null}
    </Screen>
  )
}
