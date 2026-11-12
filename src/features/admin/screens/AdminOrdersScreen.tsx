import { Text, View } from '@tamagui/tailwind'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { Screen } from '@/components/ui/Screen'
import { useCurrentUser, useRequireAuth } from '@/features/auth'
import { invalidateOrders } from '@/features/checkout/api/ordersApi'
import type { FulfillmentStatus } from '@/features/checkout/types'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { useProductPages } from '@/features/products/hooks/useProductPages'

import { adminOrdersPath, type AdminOrderPage } from '../api/adminApi'
import { AdminOrderCard } from '../components/AdminOrderCard'

type Filter = FulfillmentStatus | 'all'

const FILTERS: { value: Filter; label: string; empty: string }[] = [
  { value: 'processing', label: 'Đang xử lý', empty: 'Không có đơn nào chờ gửi đi.' },
  { value: 'shipping', label: 'Đang giao', empty: 'Không có đơn nào đang giao.' },
  { value: 'delivered', label: 'Đã giao', empty: 'Chưa có đơn nào đã giao.' },
  { value: 'all', label: 'Tất cả', empty: 'Chưa có đơn hàng nào.' },
]

/** Trang quản trị giao hàng: chỉ tài khoản admin (cấp bằng `npm run admin:grant`). Server kiểm tra quyền mỗi request. */
export function AdminOrdersScreen() {
  useRequireAuth()
  const user = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const [filter, setFilter] = useState<Filter>('processing')
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => {
    setRevision((value) => value + 1)
    invalidateOrders()
  }, [])
  // Quay lại màn này thì tải lại (đơn mới, đơn vừa thanh toán).
  useFocusEffect(useCallback(() => { setRevision((value) => value + 1) }, []))

  const page = useProductPages<AdminOrderPage>(isAdmin ? adminOrdersPath(filter) : undefined, `${user?.id}:${revision}`, true)
  const current = FILTERS.find((item) => item.value === filter)!

  return (
    <Screen header={<AppHeader title="Quản lý giao hàng" />} contentClassName="gap-4 px-5 pt-3 pb-8" safeBottom>
      {!user ? (
        <CatalogStatus loading />
      ) : !isAdmin ? (
        <EmptyState icon="lock-closed-outline" title="Không có quyền truy cập" description="Trang này chỉ dành cho tài khoản quản trị của cửa hàng." />
      ) : (
        <>
          <View className="flex-row flex-wrap gap-2" role="radiogroup" aria-label="Lọc theo tiến độ giao hàng">
            {FILTERS.map((item) => (
              <Chip key={item.value} role="radio" label={item.label} selected={filter === item.value} onPress={() => setFilter(item.value)} />
            ))}
          </View>

          {page.loading || page.error ? (
            <CatalogStatus loading={page.loading} message={page.error ? 'Không tải được danh sách đơn.' : undefined} onRetry={page.error ? page.retry : undefined} />
          ) : page.items.length ? (
            <View className="gap-3">
              {page.items.map((order) => <AdminOrderCard key={order.id} order={order} onChanged={reload} />)}
            </View>
          ) : (
            <Text className="py-12 text-center text-[14px] leading-[22px] text-neutral-500">{current.empty}</Text>
          )}

          {page.hasMore ? <Button title="Xem thêm" variant="text" onPress={page.loadMore} /> : null}
          {page.loadingMore || page.moreError ? (
            <CatalogStatus loading={page.loadingMore} message={page.moreError ? 'Không tải thêm được.' : undefined} onRetry={page.moreError ? page.retryMore : undefined} />
          ) : null}
        </>
      )}
    </Screen>
  )
}
