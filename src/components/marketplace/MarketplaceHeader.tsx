import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { Image, Modal, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { XStack, YStack } from 'tamagui'

import { useCart } from '@/providers/CartProvider'
import { marketplace as m } from '@/theme/marketplace'

import { MarketHeading, MarketText } from './MarketText'

export function MarketplaceHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const [cartVisible, setCartVisible] = useState(false)
  const { items, count, addItem, removeItem } = useCart()

  return (
    <>
      <XStack h={48} pr={24} items="center">
        <YStack w={44} h={44} items="center" justify="center" role="button" aria-label="Go back" onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={m.muted} />
        </YStack>
        <MarketHeading flex={1} fontSize={18} color={m.ink} numberOfLines={1}>{title}</MarketHeading>
        <YStack position="relative" w={44} h={44} items="center" justify="center" role="button" aria-label={`Shopping cart, ${count} items`} onPress={() => setCartVisible(true)}>
          <Ionicons name="cart-outline" size={22} color={m.muted} />
          {count > 0 && <YStack position="absolute" r={0} t={0} minW={16} h={16} px={3} rounded={9} items="center" bg={m.primary}><MarketText color="white" fontSize={10} lineHeight="16px">{count}</MarketText></YStack>}
        </YStack>
        <YStack ml={4} role="button" aria-label="Open account" onPress={() => router.navigate('/account')} hitSlop={4}>
          <Image source={require('../../../assets/marketplace/avatar.png')} style={styles.avatar} />
        </YStack>
      </XStack>
      <Modal visible={cartVisible} animationType="slide" onRequestClose={() => setCartVisible(false)}>
        <SafeAreaView style={styles.safeArea}>
          <XStack items="center" justify="space-between" p={20} borderBottomWidth={1} borderColor={m.border}>
            <MarketHeading fontSize={20}>Cart ({count})</MarketHeading>
            <YStack role="button" aria-label="Close cart" onPress={() => setCartVisible(false)} p={4}><Ionicons name="close" size={24} color={m.muted} /></YStack>
          </XStack>
          <ScrollView contentContainerStyle={styles.cart}>
            {items.length === 0 && <MarketText text="center" mt={40}>Your cart is empty.</MarketText>}
            {items.map(({ product, quantity }) => (
              <XStack key={product.id} gap={12} items="center" p={12} borderWidth={1} borderColor={m.border} rounded={4}>
                <Image source={product.image} style={styles.cartImage} resizeMode="contain" />
                <YStack flex={1} gap={6}><MarketHeading>{product.name}</MarketHeading><MarketText>${product.price * quantity}</MarketText></YStack>
                <YStack p={8} role="button" aria-label={`Remove one ${product.name}`} onPress={() => removeItem(product.id)}><Ionicons name="remove-circle-outline" size={22} color={m.muted} /></YStack>
                <MarketText>{quantity}</MarketText>
                <YStack p={8} role="button" aria-label={`Add one ${product.name}`} onPress={() => addItem(product)}><Ionicons name="add-circle-outline" size={22} color={m.primary} /></YStack>
              </XStack>
            ))}
          </ScrollView>
          <XStack p={24} justify="space-between"><MarketHeading>Total</MarketHeading><MarketHeading>${items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)}</MarketHeading></XStack>
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  avatar: { width: 36, height: 36, borderRadius: 18 },
  safeArea: { flex: 1, backgroundColor: '#fff' },
  cart: { padding: 24, gap: 14 },
  cartImage: { width: 56, height: 56 },
})
