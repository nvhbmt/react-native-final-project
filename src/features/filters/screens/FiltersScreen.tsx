import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { XStack, YStack } from 'tamagui'

import { MarketHeading, MarketText } from '@/components/marketplace/MarketText'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import type { OtherFilter, ProductFilters, ShippingOption } from '@/features/products/catalog'
import { marketplace as m } from '@/theme/marketplace'

import { FilterSection } from '../components/FilterSection'
import { PriceRange } from '../components/PriceRange'
import { normalizePriceRange } from '../lib/priceRange'
import { prototypeFilters, useFilterStore } from '../store/filterStore'

const shipping: { id: ShippingOption; label: string }[] = [
  { id: 'instant', label: 'Instant (2 hours delivery)' },
  { id: 'express', label: 'Express (2 days delivery)' },
  { id: 'standard', label: 'Standard (7- 10 days delivery)' },
]
const benefits: { id: OtherFilter; label: string; icon: 'swap-horizontal' | 'shield-lock-outline' | 'label' | 'map-marker-outline' }[] = [
  { id: 'free-return', label: '30-day Free Return', icon: 'swap-horizontal' },
  { id: 'buyer-protection', label: 'Buyer Protection', icon: 'shield-lock-outline' },
  { id: 'best-deal', label: 'Best Deal', icon: 'label' },
  { id: 'ship-to-store', label: 'Ship to store', icon: 'map-marker-outline' },
]

export function FiltersScreen() {
  const saved = useFilterStore((state) => state.filters)
  const setFilters = useFilterStore((state) => state.setFilters)
  const [draft, setDraft] = useState(saved ?? prototypeFilters)
  const update = (value: ProductFilters) => {
    setDraft(value)
    // Keep text editable, but persist valid bounds for X, system Back and swipe dismiss.
    setFilters({ ...value, ...normalizePriceRange(value.minimumPrice, value.maximumPrice) })
  }
  const close = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/product-listing')
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <XStack position="relative" h={53} items="center" justify="center" borderBottomWidth={1} borderColor={m.border}>
        <MarketHeading fontSize={18} lineHeight="30px" color={m.ink}>Filter</MarketHeading>
        <YStack {...keyboardAction} position="absolute" r={2} w={44} h={44} items="center" justify="center" role="button" aria-label="Close filters" onPress={close}>
          <Ionicons name="close-outline" size={22} color={m.muted} />
        </YStack>
      </XStack>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <FilterSection title="Shipping options" first>
          <YStack mt={14}>
            {shipping.map((option) => {
              const checked = draft.shippingOptions?.includes(option.id) ?? false
              return (
                <XStack {...keyboardAction} key={option.id} h={32} items="center" gap={6} role="checkbox" aria-label={option.label} aria-checked={checked} onPress={() => update({ ...draft, shippingOptions: checked ? draft.shippingOptions?.filter((id) => id !== option.id) : [...(draft.shippingOptions ?? []), option.id] })}>
                  <YStack w={16} h={16} rounded={2} borderWidth={1} borderColor={checked ? m.primary : m.muted} bg={checked ? m.primary : 'white'} items="center" justify="center">
                    {checked && <Ionicons name="checkmark" size={13} color="white" />}
                  </YStack>
                  <MarketText color="#42464e" fontSize={14} lineHeight="22px">{option.label}</MarketText>
                </XStack>
              )
            })}
          </YStack>
        </FilterSection>
        <FilterSection title="Price range" top={18} bottom={13}><PriceRange value={draft} onChange={update} /></FilterSection>
        <FilterSection title="Average review" top={19} bottom={16}>
          <XStack role="radiogroup" aria-label="Minimum review rating" items="center" justify="center" gap={10} h={57}>
            {[1, 2, 3, 4, 5].map((star) => (
              <YStack {...keyboardAction} key={star} h={44} justify="center" role="radio" aria-label={`${star} stars and up`} aria-checked={draft.minimumRating === star} onPress={() => update({ ...draft, minimumRating: draft.minimumRating === star ? 0 : star })} hitSlop={5}>
                <Ionicons name="star" size={23} color={star <= draft.minimumRating ? '#f3c63f' : m.starEmpty} />
              </YStack>
            ))}
            <MarketText color="#42464e" ml={4}>&amp; Up</MarketText>
          </XStack>
        </FilterSection>
        <FilterSection title="Others" last>
          <YStack gap={24} mt={16}>
            {[benefits.slice(0, 2), benefits.slice(2)].map((row, index) => (
              <XStack key={index} gap={24}>
                {row.map((option) => {
                  const checked = draft.others?.includes(option.id) ?? false
                  const color = checked ? m.primary : m.muted
                  return (
                    <YStack {...keyboardAction} key={option.id} flex={1} minW={0} h={78} items="center" justify="center" gap={4} rounded={4} borderWidth={1} borderColor={checked ? m.primary : '#dee1e6'} role="checkbox" aria-label={option.label} aria-checked={checked} onPress={() => update({ ...draft, others: checked ? draft.others?.filter((id) => id !== option.id) : [...(draft.others ?? []), option.id] })}>
                      <MaterialCommunityIcons name={option.icon} size={option.id === 'free-return' ? 32 : 26} color={color} style={option.id === 'best-deal' ? styles.dealIcon : undefined} />
                      <MarketText fontSize={12} lineHeight="20px" color={color} text="center">{option.label}</MarketText>
                    </YStack>
                  )
                })}
              </XStack>
            ))}
          </YStack>
        </FilterSection>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  dealIcon: { transform: [{ rotate: '180deg' }] },
})
