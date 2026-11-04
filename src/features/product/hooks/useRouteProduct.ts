import { useLocalSearchParams } from 'expo-router'

import { useFeedbackStore } from '@/features/feedback'

import { productApi } from '../api/productApi'
import type { ProductReview } from '../types'

/** Sản phẩm theo param `[id]` của route hiện tại (undefined nếu không tồn tại). */
export function useRouteProduct() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const entries = useFeedbackStore((state) => state.entries)
  const product = productApi.getById(id)
  if (!product) return undefined
  const feedback = entries.filter((entry) => entry.productId === id)
  if (!feedback.length) return product

  const reviews: ProductReview[] = feedback.map((entry) => ({
    id: entry.id,
    author: 'You',
    avatar: require('../../../../assets/marketplace/avatar.png'),
    content: entry.comment.trim() || `${entry.rating}-star review`,
    rating: entry.rating,
    createdAt: 'Just now',
  }))
  const reviewCount = product.reviewCount + feedback.length
  const ratingBreakdown = [...product.ratingBreakdown] as typeof product.ratingBreakdown
  feedback.forEach((entry) => { ratingBreakdown[5 - entry.rating] += 1 })

  return {
    ...product,
    reviews: [...reviews, ...product.reviews],
    reviewCount,
    rating: Math.round((product.rating * product.reviewCount + feedback.reduce((sum, entry) => sum + entry.rating, 0)) / reviewCount * 10) / 10,
    ratingBreakdown,
  }
}
