import { useLocalSearchParams } from 'expo-router'

import { useFeedbackStore } from '@/features/feedback'
import { useCatalogRequest } from '@/features/products/hooks/useCatalogRequest'

import { productPath } from '../api/productApi'
import type { ProductDetail, ProductReview } from '../types'

export function useRouteProduct() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const entries = useFeedbackStore((state) => state.entries)
  const request = useCatalogRequest<ProductDetail>(id ? productPath(id) : undefined)
  const product = request.data
  if (!product) return { ...request, product: undefined }
  const feedback = entries.filter((entry) => entry.productId === id)
  const reviews: ProductReview[] = feedback.map((entry) => ({
    id: entry.id,
    author: 'You',
    avatar: require('../../../../assets/marketplace/avatar.png'),
    content: entry.comment.trim() || `${entry.rating}-star review`,
    rating: entry.rating,
    createdAt: 'Just now',
  }))
  return { ...request, product: { ...product, reviews } }
}
