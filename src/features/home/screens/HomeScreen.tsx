import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { YStack } from 'tamagui'

import { FilterModal } from '@/components/marketplace/FilterModal'
import { MarketplaceFrame } from '@/components/marketplace/MarketplaceFrame'
import { SearchField } from '@/components/marketplace/SearchField'
import { emptyFilters, type ProductFilters } from '@/features/products'

import { CategoryStrip } from '../components/CategoryStrip'
import { Deals } from '../components/Deals'
import { RecommendedProducts } from '../components/RecommendedProducts'

export function HomeScreen() {
  const [query, setQuery] = useState('')
  const [filterVisible, setFilterVisible] = useState(false)
  const [filters, setFilters] = useState<ProductFilters>({ ...emptyFilters })

  return (
    <MarketplaceFrame title="All Deals" onBack={() => { if (router.canGoBack()) router.back() }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <YStack px={24} mb={24}>
          <SearchField
            value={query} onChangeText={setQuery} placeholder="Search for product"
            onFilter={() => setFilterVisible(true)}
            onSubmit={() => router.push({ pathname: '/product-listing', params: { query } })}
          />
        </YStack>
        <CategoryStrip />
        <YStack h={24} />
        <Deals />
        <YStack h={32} />
        <RecommendedProducts />
      </ScrollView>
      <FilterModal visible={filterVisible} value={filters} onChange={setFilters} onClose={() => {
        setFilterVisible(false)
        router.push({ pathname: '/product-listing', params: { query, minimumPrice: filters.minimumPrice, maximumPrice: filters.maximumPrice, minimumRating: filters.minimumRating.toString() } })
      }} />
    </MarketplaceFrame>
  )
}

const styles = StyleSheet.create({ content: { paddingTop: 28, paddingBottom: 22 } })
