import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import { useAuthStatus } from '@/features/auth'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { ProductRow } from '@/features/products/components/ProductCard'
import { appColors } from '@/theme/tamagui.config'

import { FavoriteButton } from '../components/FavoriteButton'
import { useFavoritesStore } from '../store/favoritesStore'

function Empty({ title, description, action }: { title: string; description: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-6 py-16">
      <Ionicons name="heart-outline" size={56} color={appColors.primary} />
      <Text className="font-heading text-[18px] leading-[28px] font-bold text-neutral-900">{title}</Text>
      <Text className="text-center text-[14px] leading-[22px] text-neutral-600">{description}</Text>
      {action ? <Button title={action.label} className="mt-2 w-full" onPress={action.onPress} /> : null}
    </View>
  )
}

export function FavoritesScreen() {
  const auth = useAuthStatus()
  const { items, status, load } = useFavoritesStore()
  // Làm mới mỗi lần mở tab (có thể đã thêm/bỏ ở thiết bị khác).
  useFocusEffect(useCallback(() => { void useFavoritesStore.getState().load() }, []))

  return (
    <Screen title="Favorites" contentClassName="gap-3 px-4 pt-2 pb-6">
      {auth === 'guest' ? (
        <Empty title="Lưu sản phẩm bạn thích" description="Đăng nhập để lưu và xem lại sản phẩm yêu thích trên mọi thiết bị." action={{ label: 'Log in', onPress: () => router.push('/login') }} />
      ) : auth === 'unknown' || (status === 'loading' && !items.length) ? (
        <CatalogStatus loading />
      ) : status === 'error' && !items.length ? (
        <CatalogStatus message="Không tải được danh sách yêu thích." onRetry={() => void load()} />
      ) : items.length ? (
        items.map((product) => (
          <View key={product.id} className="flex-row items-center gap-2">
            <View className="flex-1">
              <ProductRow product={product} />
            </View>
            <FavoriteButton product={product} />
          </View>
        ))
      ) : (
        <Empty title="Chưa có sản phẩm yêu thích" description="Chạm biểu tượng trái tim ở trang sản phẩm để lưu lại." action={{ label: 'Khám phá sản phẩm', onPress: () => router.navigate('/') }} />
      )}
    </Screen>
  )
}
