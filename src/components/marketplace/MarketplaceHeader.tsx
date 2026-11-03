import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Image, StyleSheet } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { useCartStore } from '@/features/cart'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

import { MarketHeading, MarketText } from './MarketText'

export function MarketplaceHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const count = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0))

  return (
    <XStack h={48} pr={24} items="center">
      <YStack {...keyboardAction} w={44} h={44} items="center" justify="center" role="button" aria-label="Go back" onPress={onBack}>
        <Ionicons name="chevron-back" size={22} color={m.muted} />
      </YStack>
      <MarketHeading flex={1} fontSize={18} color={m.ink} numberOfLines={1}>{title}</MarketHeading>
      <YStack {...keyboardAction} position="relative" w={44} h={44} items="center" justify="center" role="button" aria-label={`Shopping cart, ${count} items`} onPress={() => router.push('/checkout')}>
        <Ionicons name="cart-outline" size={22} color={m.muted} />
        {count > 0 && (
          <YStack position="absolute" r={0} t={0} minW={16} h={16} px={3} rounded={9} items="center" bg={m.primary}>
            <MarketText color="white" fontSize={10} lineHeight="16px">{count > 99 ? '99+' : count}</MarketText>
          </YStack>
        )}
      </YStack>
      <YStack {...keyboardAction} ml={4} role="button" aria-label="Open account" onPress={() => router.navigate('/account')} hitSlop={4}>
        <Image source={require('../../../assets/marketplace/avatar.png')} style={styles.avatar} />
      </YStack>
    </XStack>
  )
}

const styles = StyleSheet.create({ avatar: { width: 36, height: 36, borderRadius: 18 } })
