import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, Image, StyleSheet } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { BannerCarousel } from '@/components/marketplace/BannerCarousel'
import { FilterModal } from '@/components/marketplace/FilterModal'
import { MarketHeading, MarketText } from '@/components/marketplace/MarketText'
import { MarketplaceFrame } from '@/components/marketplace/MarketplaceFrame'
import { SearchField } from '@/components/marketplace/SearchField'
import { marketplace as m } from '@/theme/marketplace'

import { EmptyProducts, ProductGridCard, ProductRow } from '../components/ProductCard'
import { SeeAllButton } from '../components/SeeAllButton'
import { allProducts, categoryNames, electronicCategories, electronics, fruits, relevantFruits } from '../data/catalog'
import { filterProducts } from '../lib/filterProducts'
import type { CategoryId, ProductFilters, SortOrder } from '../types'

const electronicsBanners = [
  { image: require('../../../../assets/marketplace/banner-electronics.png'), label: 'Discover the latest electronics' },
  { image: require('../../../../assets/marketplace/deal-electronics.png'), label: 'Electronics deals' },
  { image: require('../../../../assets/marketplace/subcategory-tablet.png'), label: 'Explore tablets' },
  { image: require('../../../../assets/marketplace/subcategory-laptop.png'), label: 'Explore laptops' },
]
const fruitBanners = [
  { image: require('../../../../assets/marketplace/banner-fruits.png'), label: 'Fresh melon selection' },
  { image: require('../../../../assets/marketplace/avocado.png'), label: 'Fresh avocados' },
  { image: require('../../../../assets/marketplace/cherry.png'), label: 'Seasonal cherries' },
  { image: require('../../../../assets/marketplace/orange.png'), label: 'Fresh citrus fruits' },
]
const sortOptions: { value: SortOrder; label: string }[] = [
  { value: 'sales', label: 'Best Sales' }, { value: 'matched', label: 'Best Matched' }, { value: 'popular', label: 'Popular' },
]

type ListingParams = { category?: string; query?: string; minimumPrice?: string; maximumPrice?: string; minimumRating?: string }

export function ProductListingScreen() {
  const params = useLocalSearchParams<ListingParams>()
  return <ProductListingContent key={JSON.stringify(params)} params={params} />
}

function ProductListingContent({ params }: { params: ListingParams }) {
  const category: CategoryId | 'all' = params.category && Object.hasOwn(categoryNames, params.category) ? params.category as CategoryId : 'all'
  const isFruit = category === 'fruits'
  const isElectronics = category === 'electronics'
  const [query, setQuery] = useState(params.query ?? '')
  const [filters, setFilters] = useState<ProductFilters>({ minimumPrice: params.minimumPrice ?? '', maximumPrice: params.maximumPrice ?? '', minimumRating: Number(params.minimumRating) || 0 })
  const [filterVisible, setFilterVisible] = useState(false)
  const [subcategory, setSubcategory] = useState('phone')
  const [sort, setSort] = useState<SortOrder>('sales')
  const [expanded, setExpanded] = useState(false)

  const products = useMemo(() => {
    let source = category === 'all' ? allProducts : allProducts.filter((item) => item.category === category)
    if (isFruit) source = expanded ? [...fruits, ...relevantFruits] : fruits
    if (isElectronics) source = expanded ? electronics : electronics.filter((item) => item.subcategory === subcategory)
    return filterProducts(source, query, filters, sort)
  }, [category, expanded, filters, isElectronics, isFruit, query, sort, subcategory])
  const rows = useMemo(() => isFruit
    ? Array.from({ length: Math.ceil(products.length / 2) }, (_, index) => products.slice(index * 2, index * 2 + 2))
    : products.map((product) => [product]), [isFruit, products])
  const relevant = filterProducts(relevantFruits, query, filters)
  const filtered = Boolean(filters.minimumPrice || filters.maximumPrice || filters.minimumRating)

  return (
    <MarketplaceFrame title={category === 'all' ? 'All Deals' : categoryNames[category]} onBack={() => router.canGoBack() ? router.back() : router.replace('/')}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.map((product) => product.id).join('-')}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <YStack h={isFruit ? 24 : 14} />}
        ListHeaderComponent={(
          <YStack>
            <SearchField value={query} onChangeText={setQuery} onFilter={() => setFilterVisible(true)} filtered={filtered} />
            {isFruit && <YStack mt={24} mb={22}><BannerCarousel slides={fruitBanners} /></YStack>}
            {isElectronics && <>
              <XStack items="center" justify="space-between" mt={24} mb={12}>
                <MarketHeading>Categories</MarketHeading>
                <XStack role="button" aria-label="See all electronics categories" onPress={() => { setExpanded(true); setSubcategory('all') }} items="center" hitSlop={8}>
                  <MarketText fontSize={11} color={m.muted}>See all</MarketText><Ionicons name="caret-forward" size={11} color={m.muted} />
                </XStack>
              </XStack>
              <XStack gap={14}>
                {electronicCategories.map((item) => (
                  <YStack key={item.id} flex={1} h={92} overflow="hidden" rounded={6} borderWidth={1} borderColor={subcategory === item.id ? m.purple : 'transparent'} role="button" aria-label={item.name} aria-selected={subcategory === item.id} onPress={() => { setSubcategory(item.id); setExpanded(false) }}>
                    <Image source={item.image} style={styles.categoryImage} resizeMode="cover" />
                  </YStack>
                ))}
              </XStack>
              <XStack gap={8} mt={38} mb={14}>
                {sortOptions.map((option) => (
                  <YStack key={option.value} flex={1} h={24} rounded={14} justify="center" items="center" bg={sort === option.value ? '#eafbfd' : 'transparent'} role="button" aria-label={option.label} aria-selected={sort === option.value} onPress={() => setSort(option.value)} hitSlop={6}>
                    <MarketText fontSize={11} lineHeight="18px" fontWeight={sort === option.value ? '600' : '400'} color={sort === option.value ? m.primary : m.secondary}>{option.label}</MarketText>
                  </YStack>
                ))}
              </XStack>
            </>}
            {!isFruit && !isElectronics && <YStack h={24} />}
          </YStack>
        )}
        renderItem={({ item: row }) => isFruit
          ? <XStack gap={14}>{row.map((product) => <ProductGridCard key={product.id} product={product} />)}{row.length === 1 && <YStack flex={1} />}</XStack>
          : <ProductRow product={row[0]} />}
        ListEmptyComponent={<EmptyProducts />}
        ListFooterComponent={(
          <YStack>
            {(isFruit || isElectronics) && <YStack mt={isFruit ? 24 : 14}><SeeAllButton expanded={expanded} onPress={() => setExpanded(!expanded)} /></YStack>}
            {isElectronics && <YStack mt={24}><BannerCarousel slides={electronicsBanners} /></YStack>}
            {isFruit && <YStack mt={48}>
              <XStack items="center" justify="space-between" mb={18}>
                <MarketHeading>Relevant products</MarketHeading>
                <XStack role="button" aria-label="See all relevant products" onPress={() => setExpanded(true)} items="center" hitSlop={8} gap={3}><MarketText fontSize={12} color={m.muted}>See all</MarketText><Ionicons name="chevron-forward" size={14} color={m.muted} /></XStack>
              </XStack>
              <YStack gap={14}>{relevant.map((product) => <ProductRow key={product.id} product={product} accent={m.muted} />)}</YStack>
            </YStack>}
          </YStack>
        )}
      />
      <FilterModal visible={filterVisible} value={filters} onChange={setFilters} onClose={() => setFilterVisible(false)} />
    </MarketplaceFrame>
  )
}

const styles = StyleSheet.create({
  content: { paddingTop: 28, paddingHorizontal: 24, paddingBottom: 22 },
  categoryImage: { width: '100%', height: '100%' },
})
