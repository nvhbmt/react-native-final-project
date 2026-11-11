import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { YStack } from 'tamagui'

import { MarketplaceFrame } from '@/components/marketplace/MarketplaceFrame'
import { SearchField } from '@/components/marketplace/SearchField'
import { hasActiveFilters, useProductFilters } from '@/features/filters'
import { listingPath } from '@/features/products/api/listingPath'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { useCatalogRequest } from '@/features/products/hooks/useCatalogRequest'
import type { CatalogHome, ProductPage } from '@/features/products/types'

import { CategoryStrip } from '../components/CategoryStrip'
import { Deals } from '../components/Deals'
import { RecommendedProducts } from '../components/RecommendedProducts'

export function HomeScreen() {
  const [query, setQuery] = useState('')
  const filters = useProductFilters()
  const filtered = hasActiveFilters(filters)
  const home = useCatalogRequest<CatalogHome>('/home')
  const recommendations = useCatalogRequest<ProductPage>(filtered ? listingPath({ filters, limit: 10 }) : undefined)

  return (
    <MarketplaceFrame title="Tất cả ưu đãi">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <YStack px={24} mb={24}>
          <SearchField
            value={query} onChangeText={setQuery} placeholder="Tìm kiếm sản phẩm"
            onFilter={() => router.push('/filters')}
            filtered={filtered}
            onSubmit={() => router.push({ pathname: '/product-listing', params: { query } })}
          />
        </YStack>
        {home.data ? <>
          <CategoryStrip categories={home.data.categories} />
          <YStack h={24} />
          <Deals hero={home.data.deals[0] ?? home.data.recommendedProducts[0]} banners={home.data.banners} />
          <YStack h={32} />
          <RecommendedProducts
            products={filtered ? recommendations.data?.items ?? [] : home.data.recommendedProducts}
            loading={recommendations.loading}
            onRetry={recommendations.error ? recommendations.retry : undefined}
          />
        </> : <CatalogStatus loading={home.loading} message={home.error ? 'Không tải được sản phẩm.' : undefined} onRetry={home.error ? home.retry : undefined} />}
      </ScrollView>
    </MarketplaceFrame>
  )
}

const styles = StyleSheet.create({ content: { paddingTop: 28, paddingBottom: 22 } })
