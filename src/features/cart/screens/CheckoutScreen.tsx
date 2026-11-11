import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'
import { Fragment } from 'react'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
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

  return (
    <Screen header={<AppHeader title="Checkout" />} contentClassName="px-5 pt-4 pb-6" safeBottom>
      <View className="px-1">
        {items.length === 0 && (
          <View className="gap-5 py-10">
            <Text className="text-center text-[14px] leading-[22px] text-neutral-500">Your cart is empty.</Text>
            <Button title="Continue shopping" variant="outline" onPress={() => router.dismissTo('/')} />
          </View>
        )}
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
        <Text className="font-heading text-[14px] leading-[22px] font-bold uppercase text-neutral-700">Total</Text>
        <Text className="font-heading text-[20px] leading-[30px] font-bold text-neutral-900">
          {formatPrice(subtotal - discount)}
        </Text>
      </View>

      <Button
        title="Next"
        rightIcon="arrow-forward"
        className="mt-6"
        disabled={!items.length}
        onPress={() => router.push('/checkout/payment')}
      />
    </Screen>
  )
}
