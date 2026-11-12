import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { XStack, YStack } from 'tamagui'

import { ProfileAvatar } from '@/features/account'
import { useCurrentUser } from '@/features/auth'
import { useCartStore } from '@/features/cart'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

import { MarketHeading, MarketText } from './MarketText'

/** Không truyền `onBack` (màn gốc của tab) thì ẩn nút back và canh tiêu đề theo lề 24px như các tab khác. */
export function MarketplaceHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const user = useCurrentUser()
  const count = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0))

  return (
    <XStack h={48} pl={onBack ? 0 : 24} pr={24} items="center">
      {onBack && (
        <YStack {...keyboardAction} w={44} h={44} items="center" justify="center" role="button" aria-label="Quay lại" onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={m.muted} />
        </YStack>
      )}
      <MarketHeading flex={1} fontSize={18} color={m.ink} numberOfLines={1}>{title}</MarketHeading>
      <YStack {...keyboardAction} position="relative" w={44} h={44} items="center" justify="center" role="button" aria-label={`Giỏ hàng, ${count} sản phẩm`} onPress={() => router.push('/checkout')}>
        <Ionicons name="cart-outline" size={22} color={m.muted} />
        {count > 0 && (
          <YStack position="absolute" r={0} t={0} minW={16} h={16} px={3} rounded={9} items="center" bg={m.primary}>
            <MarketText color="white" fontSize={10} lineHeight="16px">{count > 99 ? '99+' : count}</MarketText>
          </YStack>
        )}
      </YStack>
      <YStack {...keyboardAction} ml={4} role="button" aria-label="Mở tài khoản" onPress={() => router.navigate('/account')} hitSlop={4}>
        <ProfileAvatar user={user} size={36} />
      </YStack>
    </XStack>
  )
}
