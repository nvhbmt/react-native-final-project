import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'

import { appColors } from '@/theme/tamagui.config'

import { useCartStore } from '../store/cartStore'

/** Icon giỏ hàng trên header, kèm badge số lượng; chạm để mở Checkout. */
export function CartButton() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0))

  return (
    <View
      onPress={() => router.push('/checkout')}
      role="button"
      aria-label={`Giỏ hàng, ${count} sản phẩm`}
      hitSlop={8}
      className="relative active:opacity-60"
    >
      <Ionicons name="cart-outline" size={22} color={appColors['neutral-500']} />
      {count > 0 ? (
        <View className="absolute top-[-6px] right-[-8px] h-[16px] min-w-[16px] items-center justify-center rounded-full bg-badge px-1">
          <Text className="text-[10px] leading-[14px] font-bold text-white">{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </View>
  )
}
