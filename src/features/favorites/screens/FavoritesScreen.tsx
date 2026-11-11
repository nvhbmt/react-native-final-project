import { View } from '@tamagui/tailwind'
import { router, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Screen } from '@/components/ui/Screen'
import { useAuthStatus } from '@/features/auth'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { ProductRow } from '@/features/products/components/ProductCard'

import { FavoriteButton } from '../components/FavoriteButton'
import { useFavoritesStore } from '../store/favoritesStore'

export function FavoritesScreen() {
  const auth = useAuthStatus()
  const { items, status, load } = useFavoritesStore()
  // Làm mới mỗi lần mở tab (có thể đã thêm/bỏ ở thiết bị khác).
  useFocusEffect(useCallback(() => { void useFavoritesStore.getState().load() }, []))

  return (
    <Screen title="Yêu thích" contentClassName="gap-3 pt-2 pb-6">
      {auth === 'guest' ? (
        <EmptyState icon="heart-outline" title="Lưu sản phẩm bạn thích" description="Đăng nhập để lưu và xem lại sản phẩm yêu thích trên mọi thiết bị.">
          <Button title="Đăng nhập" onPress={() => router.push('/login')} />
        </EmptyState>
      ) : auth === 'unknown' || (status === 'loading' && !items.length) ? (
        <CatalogStatus loading />
      ) : status === 'error' && !items.length ? (
        <CatalogStatus message="Không tải được danh sách yêu thích." onRetry={() => void load()} />
      ) : items.length ? (
        items.map((product) => (
          <View key={product.id} className="mx-4 flex-row items-center gap-2">
            <View className="flex-1">
              <ProductRow product={product} />
            </View>
            <FavoriteButton product={product} />
          </View>
        ))
      ) : (
        <EmptyState icon="heart-outline" title="Chưa có sản phẩm yêu thích" description="Chạm biểu tượng trái tim ở trang sản phẩm để lưu lại.">
          <Button title="Khám phá sản phẩm" onPress={() => router.navigate('/')} />
        </EmptyState>
      )}
    </Screen>
  )
}
