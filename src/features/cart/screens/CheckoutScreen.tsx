import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'
import { Fragment } from 'react'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { EmptyState } from '@/components/ui/EmptyState'
import { Screen } from '@/components/ui/Screen'
import { formatPrice } from '@/lib/format'

import { CartItemRow } from '../components/CartItemRow'
import { VoucherField } from '../components/VoucherField'
import { useCartTotals } from '../hooks/useCartTotals'
import { useCartStore } from '../store/cartStore'

export function CheckoutScreen() {
  const items = useCartStore((s) => s.items)
  const syncError = useCartStore((s) => s.syncError)
  const { subtotal, discount } = useCartTotals()

  if (items.length === 0) {
    return (
      <Screen header={<AppHeader title="Giỏ hàng" />} contentClassName="pb-6" safeBottom>
        {syncError ? <Text role="alert" className="px-6 pt-3 text-[13px] leading-[20px] text-danger">{syncError}</Text> : null}
        <EmptyState icon="cart-outline" title="Giỏ hàng đang trống" description="Thêm sản phẩm vào giỏ để đặt hàng.">
          <Button title="Tiếp tục mua sắm" onPress={() => router.dismissTo('/')} />
        </EmptyState>
      </Screen>
    )
  }

  return (
    <Screen header={<AppHeader title="Giỏ hàng" />} contentClassName="px-5 pt-4 pb-6" safeBottom>
      <View className="px-1">
        {items.map((item, i) => (
          <Fragment key={item.key}>
            {i > 0 ? <Divider className="bg-neutral-200" /> : null}
            <CartItemRow item={item} />
          </Fragment>
        ))}
      </View>

      {syncError ? <Text role="alert" className="pt-3 text-[13px] leading-[20px] text-danger">{syncError}</Text> : null}
      <View className="pt-[18px]">
        <VoucherField />
      </View>

      <View className="flex-row items-center justify-between pt-6">
        {/* Chưa gồm thuế/phí — tổng cuối cùng hiện ở màn Thanh toán. */}
        <View>
          <Text className="font-heading text-[14px] leading-[22px] font-bold uppercase text-neutral-700">Tạm tính</Text>
          <Text className="text-[12px] leading-[18px] text-neutral-500">Chưa gồm thuế và phí</Text>
        </View>
        <Text className="font-heading text-[20px] leading-[30px] font-bold text-neutral-900">
          {formatPrice(subtotal - discount)}
        </Text>
      </View>

      <Button
        title="Tiếp tục"
        rightIcon="arrow-forward"
        className="mt-6"
        onPress={() => router.push('/checkout/payment')}
      />
    </Screen>
  )
}
