import { Text, View } from '@tamagui/tailwind'
import { router, useLocalSearchParams } from 'expo-router'
import { useRef, useState } from 'react'
import { StyleSheet, TextInput } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import { StarRating } from '@/components/ui/StarRating'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { api, ApiError } from '@/lib/api'
import { marketplace } from '@/theme/marketplace'

import { invalidateReviews, reviewsPath, useReviewEligibility } from '../api/reviews'
import { ProductStatus } from '../components/ProductStatus'
import { useRouteProduct } from '../hooks/useRouteProduct'

export function WriteReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>()
  const { product, ...request } = useRouteProduct()
  const eligibility = useReviewEligibility(product?.id, orderId)
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const submitting = useRef(false)

  if (!product) return <ProductStatus title="Write a review" {...request} />
  const productId = product.id
  const viewReviews = () => router.dismissTo({ pathname: '/product/[id]/reviews', params: { id: productId } })

  async function submit() {
    if (submitting.current || !rating || !content.trim() || !eligibility.data?.eligible) return
    submitting.current = true
    setPending(true)
    setError('')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      await api.post(reviewsPath(productId), { rating, content: content.trim(), orderId }, { signal: controller.signal })
      invalidateReviews()
      viewReviews()
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'REVIEW_EXISTS') {
        invalidateReviews()
        viewReviews()
      } else {
        setError(failure instanceof ApiError ? failure.message : 'Could not submit your review. Please try again.')
      }
    } finally {
      clearTimeout(timeout)
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <Screen header={<AppHeader title="Write a review" />} contentClassName="gap-5 px-6 pt-4 pb-6" safeBottom>
      <Text className="font-heading text-[18px] leading-[28px] font-bold text-neutral-700">{product.name}</Text>
      {eligibility.auth === 'guest' ? (
        <Button title="Sign in to write a review" onPress={() => router.push('/login')} />
      ) : eligibility.loading || eligibility.error || eligibility.auth === 'unknown' ? (
        <CatalogStatus loading={eligibility.loading || eligibility.auth === 'unknown'} message={eligibility.error ? 'Could not verify your purchase.' : undefined} onRetry={eligibility.error ? eligibility.retry : undefined} />
      ) : eligibility.data?.eligible ? (
        <>
          <View className="gap-3">
            <Text className="text-[14px] font-semibold text-neutral-700">Rating</Text>
            <StarRating value={rating} size={28} className="gap-4" onChange={setRating} />
          </View>
          <View className="gap-2">
            <Text className="text-[14px] font-semibold text-neutral-700">Your review</Text>
            <TextInput accessibilityLabel="Your review" placeholder="Tell others about this product" multiline maxLength={1000} value={content} onChangeText={setContent} editable={!pending} style={styles.input} />
            <Text className="text-right text-[12px] text-neutral-500">{content.length}/1000</Text>
          </View>
          {error ? <Text role="alert" className="text-[14px] text-red-700">{error}</Text> : null}
          <Button title={pending ? 'Submitting…' : 'Submit review'} disabled={pending || !rating || !content.trim()} onPress={submit} />
        </>
      ) : (
        <>
          <Text className="text-[14px] text-neutral-600">{eligibility.data?.reason === 'already_reviewed' ? 'You have already reviewed this product.' : 'Complete an order for this product to write a review.'}</Text>
          <Button title="View reviews" variant="outline" onPress={viewReviews} />
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  input: { backgroundColor: marketplace.input, color: marketplace.ink, fontFamily: marketplace.bodyFont, borderRadius: 4, minHeight: 104, padding: 12, fontSize: 14, textAlignVertical: 'top' },
})
