import { Text, View } from '@tamagui/tailwind'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { confirmAction } from '@/features/account/lib/confirm'
import { OrderStatusBadge } from '@/features/checkout/components/OrderStatusBadge'
import { ApiError } from '@/lib/api'
import { formatPrice } from '@/lib/format'

import { adminApi, type AdminOrder } from '../api/adminApi'

const ACTION_LABEL = { shipping: 'Chuyển sang Đang giao', delivered: 'Xác nhận Đã giao' } as const

type Props = {
  order: AdminOrder
  /** Gọi sau khi chuyển bước thành công (hoặc khi đơn đã đổi ở nơi khác) để tải lại danh sách. */
  onChanged: () => void
}

/** Thẻ đơn trong trang quản trị: khách, địa chỉ, hàng, tổng tiền và nút chuyển bước giao hàng. */
export function AdminOrderCard({ order, onChanged }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const count = order.items.reduce((n, item) => n + item.quantity, 0)
  const next = order.nextFulfillment
  const address = order.shippingAddress

  const move = (to: NonNullable<AdminOrder['nextFulfillment']>) =>
    confirmAction(ACTION_LABEL[to], `Đơn #${order.code} của ${order.customer?.fullName ?? 'khách'} sẽ được cập nhật và khách nhận thông báo.`, 'Xác nhận', async () => {
      setBusy(true)
      setError(null)
      try {
        await adminApi.moveFulfillment(order.id, to)
        onChanged()
      } catch (e) {
        if (e instanceof ApiError && e.code === 'ORDER_CHANGED') onChanged()
        setError(e instanceof ApiError ? e.message : 'Không cập nhật được, vui lòng thử lại')
      } finally {
        setBusy(false)
      }
    })

  return (
    <View className="gap-3 rounded-[8px] border border-neutral-200 p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-heading text-[15px] leading-[24px] font-bold text-neutral-900">#{order.code}</Text>
        <OrderStatusBadge order={order} />
      </View>

      <View className="gap-[2px]">
        <Text className="text-[14px] leading-[22px] font-semibold text-neutral-900">{order.customer?.fullName ?? 'Tài khoản đã xoá'}</Text>
        {order.customer ? <Text className="text-[12px] leading-[18px] text-neutral-500">{order.customer.email}</Text> : null}
        <Text className="text-[12px] leading-[18px] text-neutral-500">
          {new Date(order.createdAt).toLocaleString('vi-VN')}
          {order.paymentMode === 'demo' ? ' · Đơn demo' : ' · Đã thanh toán'}
          {order.shippingMethod ? ` · Giao ${order.shippingMethod.label.toLowerCase()}` : ''}
        </Text>
      </View>

      <Text numberOfLines={2} className="text-[13px] leading-[20px] text-neutral-700">
        {count} sản phẩm: {order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}
      </Text>

      {address ? (
        <Text className="text-[13px] leading-[20px] text-neutral-600">
          Giao đến: {address.recipientName} · {address.phone} · {address.line1}, {address.city}
        </Text>
      ) : (
        <Text className="text-[13px] leading-[20px] text-neutral-500">Đơn cũ, chưa có địa chỉ giao hàng.</Text>
      )}

      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] leading-[20px] text-neutral-600">Tổng cộng</Text>
        <Text className="text-[16px] leading-[24px] font-semibold text-neutral-900">{formatPrice(order.total)}</Text>
      </View>

      {error ? <Text role="alert" className="text-[13px] leading-[20px] text-danger">{error}</Text> : null}
      {next ? (
        <Button
          title={busy ? 'Đang cập nhật…' : ACTION_LABEL[next]}
          accessibilityLabel={`${ACTION_LABEL[next]} cho đơn ${order.code}`}
          leftIcon={next === 'shipping' ? 'car-outline' : 'checkmark-done-outline'}
          disabled={busy}
          onPress={() => move(next)}
        />
      ) : null}
    </View>
  )
}
