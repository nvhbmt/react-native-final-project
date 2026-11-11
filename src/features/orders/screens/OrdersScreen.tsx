import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import { useCurrentUser, useRequireAuth } from '@/features/auth'
import { useOrdersRevision } from '@/features/checkout/api/ordersApi'
import type { OrderPage } from '@/features/checkout/types'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { useProductPages } from '@/features/products/hooks/useProductPages'
import { appColors } from '@/theme/tamagui.config'

import { OrderListItem } from '../components/OrderListItem'

export function OrdersScreen() {
  useRequireAuth()
  const user = useCurrentUser()
  const revision = useOrdersRevision()
  const page = useProductPages<OrderPage>(user ? '/orders?limit=10' : undefined, `${user?.id}:${revision}`, true)

  return (
    <Screen header={<AppHeader title="Đơn hàng của tôi" />} contentClassName="gap-3 px-5 pt-3 pb-8" safeBottom>
      {page.loading || page.error ? (
        <CatalogStatus loading={page.loading} message={page.error ? 'Không tải được đơn hàng.' : undefined} onRetry={page.error ? page.retry : undefined} />
      ) : page.items.length ? (
        page.items.map((order) => <OrderListItem key={order.id} order={order} />)
      ) : (
        <View className="items-center gap-3 py-16">
          <Ionicons name="receipt-outline" size={52} color={appColors.primary} />
          <Text className="text-[14px] leading-[22px] text-neutral-600">Bạn chưa có đơn hàng nào.</Text>
          <Button title="Mua sắm ngay" onPress={() => router.navigate('/')} className="w-full" />
        </View>
      )}
      {page.hasMore ? <Button title="Xem thêm" variant="text" onPress={page.loadMore} /> : null}
      {page.loadingMore || page.moreError ? (
        <CatalogStatus loading={page.loadingMore} message={page.moreError ? 'Không tải thêm được.' : undefined} onRetry={page.moreError ? page.retryMore : undefined} />
      ) : null}
    </Screen>
  )
}
