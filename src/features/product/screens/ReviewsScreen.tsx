import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { Redirect, router } from 'expo-router'
import { Fragment, useState } from 'react'
import { ScrollView } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Divider } from '@/components/ui/Divider'
import { Screen } from '@/components/ui/Screen'
import { appColors } from '@/theme/tamagui.config'

import { RatingSummary } from '../components/RatingSummary'
import { ReviewItem } from '../components/ReviewItem'
import { useRouteProduct } from '../hooks/useRouteProduct'

const FILTERS = [null, 5, 4, 3, 2, 1] as const
type Filter = (typeof FILTERS)[number]

export function ReviewsScreen() {
  const product = useRouteProduct()
  const [filter, setFilter] = useState<Filter>(null)

  if (!product) return <Redirect href="/" />

  const reviews = filter ? product.reviews.filter((r) => r.rating === filter) : product.reviews

  return (
    <Screen
      header={<AppHeader title="Reviews" />}
      contentClassName="pt-2 pb-6"
      footer={
        <View className="border-t border-neutral-200 px-6 pt-3 pb-3">
          <Button title="Write a review" leftIcon="create-outline" onPress={() => router.push({ pathname: '/feedback', params: { productId: product.id } })} />
        </View>
      }
    >
      <View className="gap-4 px-6">
        <Text className="font-heading text-[18px] leading-[28px] font-bold text-neutral-700">{product.name}</Text>
        <RatingSummary rating={product.rating} reviewCount={product.reviewCount} breakdown={product.ratingBreakdown} />
      </View>

      <ScrollView
        horizontal
        style={{ flexGrow: 0, flexShrink: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 8 }}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f ?? 'all'}
            role="radio"
            label={f ? String(f) : 'All'}
            selected={filter === f}
            onPress={() => setFilter(f)}
            prefix={f ? <Ionicons name="star" size={14} color={appColors.warning} /> : undefined}
          />
        ))}
      </ScrollView>

      <View className="px-6">
        {reviews.length ? (
          reviews.map((r, i) => (
            <Fragment key={r.id}>
              {i > 0 ? <Divider className="my-4 bg-neutral-200" /> : null}
              <ReviewItem review={r} showRating />
            </Fragment>
          ))
        ) : (
          <Text className="py-10 text-center text-[14px] leading-[22px] text-neutral-500">
            No {filter}-star reviews yet.
          </Text>
        )}
      </View>
    </Screen>
  )
}
