import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { Link, router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, useWindowDimensions } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { ClampedText } from '@/components/ui/ClampedText'
import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { Screen } from '@/components/ui/Screen'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useCartStore } from '@/features/cart'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { useCatalogRequest } from '@/features/products/hooks/useCatalogRequest'
import { formatProductPrice } from '@/features/products/lib/formatProductPrice'
import type { Product as CatalogProduct } from '@/features/products/types'
import { HeaderActions } from '@/navigation/HeaderActions'
import { appColors } from '@/theme/tamagui.config'

import { productPath } from '../api/productApi'
import { useReviewPreview } from '../api/reviews'
import type { Product, ProductFeature } from '../types'
import { FeatureList } from './FeatureList'
import { ImageCarousel } from './ImageCarousel'
import { NotifyCard } from './NotifyCard'
import { ProductCard } from './ProductCard'
import { RatingSummary } from './RatingSummary'
import { ReviewItem } from './ReviewItem'

const PADDING = 24

/** Trang chi tiết dạng chuẩn (không biến thể): carousel, mô tả, review, sản phẩm liên quan. */
export function StandardProductDetail({ product }: { product: Product }) {
  const { width } = useWindowDimensions()
  const contentWidth = Math.min(width, 520) - PADDING * 2
  const [expanded, setExpanded] = useState(false)
  const [notify, setNotify] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const related = useCatalogRequest<CatalogProduct[]>(productPath(product.id, '/related'))
  const reviews = useReviewPreview(product.id, 2)
  const features: ProductFeature[] = []
  if (product.shippingOptions.includes('express')) features.push({ icon: 'express', label: 'Express' })
  if (product.benefits.includes('free-return')) features.push({ icon: 'return', label: '30-day free return' })
  const unavailable = product.available === false

  const addToCart = () =>
    addItem({
      productId: product.id,
      name: product.name,
      subtitle: product.subtitle,
      image: product.images[0],
      price: product.price,
    })

  return (
    <Screen
      header={<AppHeader title={product.categoryName} align="left" right={<HeaderActions />} />}
      contentClassName="pb-6"
      footer={
        <View className="flex-row gap-3 border-t border-neutral-200 px-6 pt-3 pb-3">
          <View
            onPress={unavailable ? undefined : addToCart}
            role="button"
            aria-label="Thêm vào giỏ"
            aria-disabled={unavailable}
            className="size-[44px] items-center justify-center rounded-[4px] border border-primary active:opacity-70"
          >
            <Ionicons name="cart-outline" size={22} color={appColors.primary} />
          </View>
          <Button
            title={unavailable ? 'Out of stock' : 'Buy Now'}
            disabled={unavailable}
            className="flex-1"
            onPress={() => {
              addToCart()
              router.push('/checkout')
            }}
          />
        </View>
      }
    >
      <View className="gap-4 px-6 pt-1 pb-6">
        <ImageCarousel images={product.images} width={contentWidth} height={Math.round(contentWidth * 0.545)} contentFit="contain" />
        {product.imageAttribution && <Link href={product.imageAttribution} asChild>
          <Text className="self-end text-[11px] leading-[16px] text-neutral-500 underline">Image credits</Text>
        </Link>}
        <Text className="font-heading text-[18px] leading-[26px] font-bold text-neutral-900">{product.name}</Text>
        <View className="flex-row items-center justify-between">
          <Text className="font-heading text-[20px] leading-[30px] font-bold text-neutral-900">
            {formatProductPrice(product)}
          </Text>
          <View className="flex-row items-center gap-1">
            {product.rating !== null && <><Ionicons name="star" size={20} color={appColors.warning} />
              <Text className="text-[14px] leading-[22px] font-bold text-neutral-800">{product.rating}</Text></>}
            {product.reviewCount > 0 && <Text className="text-[14px] leading-[22px] text-neutral-500">({product.reviewCount} source ratings)</Text>}
          </View>
        </View>
      </View>

      <Divider className="bg-neutral-200" />

      <View className="gap-3 px-6 pt-6 pb-6">
        <SectionHeader title="Description" />
        <ClampedText
          lines={expanded ? undefined : 2}
          className="text-[14px] leading-[22px] text-neutral-500"
          onPress={() => setExpanded((v) => !v)}
        >
          {product.description}
        </ClampedText>
        {features.length > 0 ? (
          <View className="pt-6">
            <FeatureList features={features} />
          </View>
        ) : null}
      </View>

      <Divider />

      <View className="gap-4 px-6 pt-6 pb-6">
        <SectionHeader title="Reviews" onSeeAll={() => router.push(`/product/${product.id}/reviews`)} />
        {reviews.data && <RatingSummary {...reviews.data.summary} />}
        {(reviews.loading || Boolean(reviews.error)) && <CatalogStatus loading={reviews.loading} message={reviews.error ? 'Could not load reviews.' : undefined} onRetry={reviews.error ? reviews.retry : undefined} />}
        <View className="gap-5 pt-2">
          {reviews.data?.items.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </View>
      </View>

      <Divider />

      {related.data?.length ? (
        <View className="gap-4 pt-6 pb-4">
          <View className="px-6">
            <SectionHeader title="Relevant products" onSeeAll={() => router.push({ pathname: '/product-listing', params: { relatedTo: product.id } })} />
          </View>
          <ScrollView
            horizontal
            style={{ flexGrow: 0, flexShrink: 0 }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: PADDING, gap: 14 }}
          >
            {related.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ScrollView>
        </View>
      ) : (related.loading || related.error) ? <CatalogStatus loading={related.loading} message={related.error ? 'Could not load related products.' : undefined} onRetry={related.error ? related.retry : undefined} /> : null}

      <View className="px-6 pt-2">
        <NotifyCard value={notify} onChange={setNotify} />
      </View>
    </Screen>
  )
}
