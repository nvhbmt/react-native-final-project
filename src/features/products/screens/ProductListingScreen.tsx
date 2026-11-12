import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { FlatList, StyleSheet } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { BannerCarousel } from '@/components/marketplace/BannerCarousel'
import { MarketHeading, MarketText } from '@/components/marketplace/MarketText'
import { MarketplaceFrame } from '@/components/marketplace/MarketplaceFrame'
import { SearchField } from '@/components/marketplace/SearchField'
import { hasActiveFilters, useProductFilters } from '@/features/filters'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

import { listingPath } from '../api/listingPath'
import { CatalogStatus } from '../components/CatalogStatus'
import { EmptyProducts, ProductGridCard, ProductRow } from '../components/ProductCard'
import { SeeAllButton } from '../components/SeeAllButton'
import { useCatalogRequest } from '../hooks/useCatalogRequest'
import { useProductPages } from '../hooks/useProductPages'
import type { CatalogCategory, CategoryId, SortOrder } from '../types'

const categoryIds = new Set<string>(['electronics', 'fashion', 'beauty', 'fruits'])
const electronicsTabs = ['phone', 'tablet', 'laptop']
const sortOptions: { value: SortOrder; label: string }[] = [
  { value: 'sales', label: 'Bán chạy' }, { value: 'matched', label: 'Phù hợp nhất' }, { value: 'popular', label: 'Phổ biến' },
]

type ListingParams = { category?: string; query?: string; relatedTo?: string }

/** `tab`: dùng làm tab Tìm kiếm — màn gốc, không có nút back. */
export function ProductListingScreen({ tab = false }: { tab?: boolean }) {
  const params = useLocalSearchParams<ListingParams>()
  return <ProductListingContent key={JSON.stringify(params)} params={params} tab={tab} />
}

function ProductListingContent({ params, tab }: { params: ListingParams; tab: boolean }) {
  const category = params.category && categoryIds.has(params.category) ? params.category as CategoryId : undefined
  const isFruit = category === 'fruits'
  const isElectronics = category === 'electronics'
  const [query, setQuery] = useState(params.query ?? '')
  const [search, setSearch] = useState(query)
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 250)
    return () => clearTimeout(timer)
  }, [query])
  const filters = useProductFilters()
  const [subcategory, setSubcategory] = useState<string>()
  const [sort, setSort] = useState<SortOrder>('sales')
  const [expanded, setExpanded] = useState(false)
  const activeSubcategory = expanded ? undefined : subcategory ?? (search.trim() ? undefined : 'phone')

  const categories = useCatalogRequest<CatalogCategory[]>(category ? '/categories' : undefined)
  const selectedCategory = categories.data?.find((item) => item.id === category)
  const subcategories = selectedCategory?.subcategories ?? []
  const electronicCategories = electronicsTabs.flatMap((id) => subcategories.filter((item) => item.id === id))
  const banners = subcategories.flatMap((item) => item.image ? [{ image: { uri: item.image }, label: item.name, resizeMode: 'contain' as const }] : []).slice(0, 4)
  const products = useProductPages(listingPath({
    category,
    subcategory: isElectronics ? activeSubcategory : undefined,
    query: search,
    filters,
    sort,
    relatedTo: params.relatedTo,
  }))
  const filtered = hasActiveFilters(filters)
  const fruitPreview = isFruit && !expanded && !filtered && !search.trim()
  const visible = useMemo(() => fruitPreview ? products.items.slice(0, 4) : products.items, [fruitPreview, products.items])
  const rows = useMemo(() => isFruit
    ? Array.from({ length: Math.ceil(visible.length / 2) }, (_, index) => visible.slice(index * 2, index * 2 + 2))
    : visible.map((product) => [product]), [isFruit, visible])
  const relevant = fruitPreview ? products.items.slice(4, 6) : []

  return (
    <MarketplaceFrame
      title={tab ? 'Tìm kiếm' : params.relatedTo ? 'Sản phẩm liên quan' : selectedCategory?.name ?? 'Tất cả ưu đãi'}
      onBack={tab ? undefined : () => router.canGoBack() ? router.back() : router.replace('/')}
    >
      <FlatList
        data={rows}
        keyExtractor={(row) => row.map((product) => product.id).join('-')}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <YStack h={isFruit ? 24 : 14} />}
        ListHeaderComponent={(
          <YStack>
            <SearchField value={query} onChangeText={setQuery} onSubmit={() => setSearch(query)} onFilter={() => router.push('/filters')} filtered={filtered} />
            {isFruit && banners.length > 0 && <YStack mt={24} mb={22}><BannerCarousel slides={banners} /></YStack>}
            {isElectronics && <>
              <XStack items="center" justify="space-between" mt={24} mb={12}>
                <MarketHeading>Danh mục</MarketHeading>
                <XStack {...keyboardAction} role="button" aria-label="Xem tất cả danh mục điện tử" onPress={() => setExpanded(true)} items="center" hitSlop={8}>
                  <MarketText fontSize={11} color={m.muted}>Xem tất cả</MarketText><Ionicons name="caret-forward" size={11} color={m.muted} />
                </XStack>
              </XStack>
              <XStack gap={14}>
                {electronicCategories.map((item) => (
                  <YStack {...keyboardAction} key={item.id} position="relative" flex={1} h={92} overflow="hidden" rounded={6} borderWidth={1} borderColor={activeSubcategory === item.id ? m.purple : 'transparent'} role="button" aria-label={item.name} aria-selected={activeSubcategory === item.id} onPress={() => { setSubcategory(item.id); setExpanded(false) }}>
                    {item.image && <Image source={item.image} style={styles.categoryImage} contentFit="contain" />}
                    <MarketText position="absolute" b={0} l={0} r={0} text="center" bg={m.surface} fontSize={10} numberOfLines={1}>{item.name}</MarketText>
                  </YStack>
                ))}
              </XStack>
              <XStack gap={8} mt={38} mb={14}>
                {sortOptions.map((option) => (
                  <YStack {...keyboardAction} key={option.value} flex={1} h={24} rounded={14} justify="center" items="center" bg={sort === option.value ? '#eafbfd' : 'transparent'} role="button" aria-label={option.label} aria-selected={sort === option.value} onPress={() => setSort(option.value)} hitSlop={6}>
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
        ListEmptyComponent={products.loading || products.error
          ? <CatalogStatus loading={products.loading} message={products.error ? 'Không tải được sản phẩm.' : undefined} onRetry={products.error ? products.retry : undefined} />
          : <EmptyProducts />}
        ListFooterComponent={(
          <YStack>
            {!products.loading && !products.error && (isElectronics || (isFruit && !filtered && !search.trim() && products.items.length > 4)) && <YStack mt={isFruit ? 24 : 14}><SeeAllButton expanded={expanded} onPress={() => {
              setExpanded(!expanded)
            }} /></YStack>}
            {products.hasMore && !fruitPreview && <YStack mt={14}><SeeAllButton label="Xem thêm" onPress={products.loadMore} /></YStack>}
            {(products.loadingMore || products.moreError) && <CatalogStatus loading={products.loadingMore} message={products.moreError ? 'Không tải thêm được sản phẩm.' : undefined} onRetry={products.moreError ? products.retryMore : undefined} />}
            {isElectronics && banners.length > 0 && <YStack mt={24}><BannerCarousel slides={banners} /></YStack>}
            {relevant.length > 0 && <YStack mt={48}>
              <XStack items="center" justify="space-between" mb={18}>
                <MarketHeading>Sản phẩm liên quan</MarketHeading>
                <XStack {...keyboardAction} role="button" aria-label="Xem tất cả sản phẩm liên quan" onPress={() => setExpanded(true)} items="center" hitSlop={8} gap={3}><MarketText fontSize={12} color={m.muted}>Xem tất cả</MarketText><Ionicons name="chevron-forward" size={14} color={m.muted} /></XStack>
              </XStack>
              <YStack gap={14}>{relevant.map((product) => <ProductRow key={product.id} product={product} accent={m.muted} />)}</YStack>
            </YStack>}
          </YStack>
        )}
      />
    </MarketplaceFrame>
  )
}

const styles = StyleSheet.create({
  content: { paddingTop: 28, paddingHorizontal: 24, paddingBottom: 22 },
  categoryImage: { width: '100%', height: '100%' },
})
