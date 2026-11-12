import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'
import { Fragment, useState } from 'react'
import { ScrollView } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Divider } from '@/components/ui/Divider'
import { Screen } from '@/components/ui/Screen'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { useProductPages } from '@/features/products/hooks/useProductPages'
import { appColors } from '@/theme/tamagui.config'

import { reviewsPath, useReviewEligibility, useReviewVersion, type ReviewPage } from '../api/reviews'
import { RatingSummary } from '../components/RatingSummary'
import { ProductStatus } from '../components/ProductStatus'
import { ReviewItem } from '../components/ReviewItem'
import { useRouteProduct } from '../hooks/useRouteProduct'

const FILTERS = [null, 5, 4, 3, 2, 1] as const
type Filter = (typeof FILTERS)[number]

export function ReviewsScreen() {
  const { product, ...request } = useRouteProduct()
  const [filter, setFilter] = useState<Filter>(null)
  const version = useReviewVersion()
  const page = useProductPages<ReviewPage>(product ? `${reviewsPath(product.id)}${filter ? `?rating=${filter}` : ''}` : undefined, version)
  const eligibility = useReviewEligibility(product?.id)

  if (!product) return <ProductStatus title="Đánh giá" {...request} />

  const reviews = page.items

  return (
    <Screen
      header={<AppHeader title="Đánh giá" />}
      contentClassName="pt-2 pb-6"
      footer={
        <View className="border-t border-neutral-200 px-6 pt-3 pb-3">
          {eligibility.auth === 'guest'
            ? <Button title="Đăng nhập để viết đánh giá" onPress={() => router.push('/login')} />
            : eligibility.data?.eligible
              ? <Button title="Viết đánh giá" leftIcon="create-outline" onPress={() => router.push({ pathname: '/product/[id]/write-review', params: { id: product.id } })} />
              : eligibility.error
                ? <Button title="Kiểm tra lại quyền đánh giá" variant="text" onPress={eligibility.retry} />
                : eligibility.data && <Text className="text-center text-[13px] text-neutral-600">
                  {eligibility.data.reason === 'already_reviewed' ? 'Bạn đã đánh giá sản phẩm này.' : 'Hãy hoàn tất một đơn hàng có sản phẩm này để viết đánh giá.'}
                </Text>}
        </View>
      }
    >
      <View className="gap-4 px-6">
        <Text className="font-heading text-[18px] leading-[28px] font-bold text-neutral-700">{product.name}</Text>
        {page.data && <RatingSummary {...page.data.summary} />}
      </View>

      <ScrollView
        horizontal
        role="radiogroup"
        aria-label="Lọc đánh giá theo số sao"
        style={{ flexGrow: 0, flexShrink: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 8 }}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f ?? 'all'}
            role="radio"
            label={f ? String(f) : 'Tất cả'}
            accessibilityLabel={f ? `${f} sao` : 'Tất cả đánh giá'}
            selected={filter === f}
            onPress={() => setFilter(f)}
            prefix={f ? <Ionicons name="star" size={14} color={appColors.warning} /> : undefined}
          />
        ))}
      </ScrollView>

      <View className="px-6">
        {page.loading || page.error ? (
          <CatalogStatus loading={page.loading} message={page.error ? 'Không tải được đánh giá.' : undefined} onRetry={page.error ? page.retry : undefined} />
        ) : reviews.length ? (
          reviews.map((r, i) => (
            <Fragment key={r.id}>
              {i > 0 ? <Divider className="my-4 bg-neutral-200" /> : null}
              <ReviewItem review={r} showRating />
            </Fragment>
          ))
        ) : (
          <Text className="py-10 text-center text-[14px] leading-[22px] text-neutral-500">
            {filter ? `Chưa có đánh giá ${filter} sao.` : 'Chưa có đánh giá nào.'}
          </Text>
        )}
        {page.hasMore && <Button title="Xem thêm đánh giá" variant="text" onPress={page.loadMore} />}
        {(page.loadingMore || Boolean(page.moreError)) && <CatalogStatus loading={page.loadingMore} message={page.moreError ? 'Không tải thêm được đánh giá.' : undefined} onRetry={page.moreError ? page.retryMore : undefined} />}
      </View>
    </Screen>
  )
}
