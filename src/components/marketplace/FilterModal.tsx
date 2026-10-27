import { Ionicons } from '@expo/vector-icons'
import { Modal, ScrollView, StyleSheet, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { XStack, YStack } from 'tamagui'

import type { ProductFilters } from '@/features/products'
import { marketplace as m } from '@/theme/marketplace'

import { MarketHeading, MarketText } from './MarketText'
import { Rating } from './Rating'

type Props = {
  visible: boolean
  value: ProductFilters
  onChange: (filters: ProductFilters) => void
  onClose: () => void
}

export function FilterModal({ visible, value, onChange, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <XStack position="relative" h={54} items="center" justify="center" borderBottomWidth={1} borderColor={m.border}>
          <MarketHeading fontSize={20} color={m.ink}>Filter</MarketHeading>
          <YStack position="absolute" r={10} p={12} role="button" aria-label="Close filters" onPress={onClose}>
            <Ionicons name="close-outline" size={24} color={m.muted} />
          </YStack>
        </XStack>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <MarketHeading>Price range</MarketHeading>
          <XStack gap={24} mt={18}>
            <TextInput accessibilityLabel="Minimum price" placeholder="$ 0" keyboardType="decimal-pad" value={value.minimumPrice} onChangeText={(minimumPrice) => onChange({ ...value, minimumPrice: minimumPrice.replace(/[^0-9.]/g, '') })} style={styles.price} />
            <MarketText self="center">—</MarketText>
            <TextInput accessibilityLabel="Maximum price" placeholder="$ 1000" keyboardType="decimal-pad" value={value.maximumPrice} onChangeText={(maximumPrice) => onChange({ ...value, maximumPrice: maximumPrice.replace(/[^0-9.]/g, '') })} style={styles.price} />
          </XStack>
          <YStack h={1} bg={m.starEmpty} my={28} />
          <MarketHeading>Average review</MarketHeading>
          <YStack role="button" aria-label="Cycle minimum review rating" onPress={() => onChange({ ...value, minimumRating: (value.minimumRating + 1) % 6 })} py={24} items="center">
            <XStack gap={14} items="center"><Rating value={value.minimumRating} size={24} /><MarketText>&amp; Up</MarketText></XStack>
          </YStack>
          <YStack h={1} bg={m.starEmpty} mb={28} />
          <YStack role="button" aria-label="Reset filters" onPress={() => onChange({ minimumPrice: '', maximumPrice: '', minimumRating: 0 })} items="center" p={12} borderWidth={1} borderColor={m.primary} rounded={4}>
            <MarketText color={m.primary}>Reset filters</MarketText>
          </YStack>
          <YStack role="button" aria-label="Show filtered products" onPress={onClose} items="center" p={12} bg={m.primary} rounded={4} mt={16}>
            <MarketText color="white" fontWeight="600">Show products</MarketText>
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  price: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#bdc1ca', borderRadius: 3, padding: 10, fontFamily: m.bodyFont, color: m.text },
})
