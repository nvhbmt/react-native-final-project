import { create } from 'zustand'

import { useAuthStatus, useCurrentUser } from '@/features/auth'
import { useCatalogRequest } from '@/features/products/hooks/useCatalogRequest'

import type { ProductReview, ReviewSummary } from '../types'
import { productPath } from './productApi'

const useVersion = create<{ revision: number }>(() => ({ revision: 0 }))

export function invalidateReviews() {
  useVersion.setState(({ revision }) => ({ revision: revision + 1 }))
}

export function useReviewVersion() {
  return String(useVersion((state) => state.revision))
}

export type ReviewPage = { items: ProductReview[]; summary: ReviewSummary; nextCursor: string | null }
export type ReviewEligibility = { eligible: boolean; reason: 'already_reviewed' | 'purchase_required' | null }

export function reviewsPath(id: string) {
  return `${productPath(id)}/reviews`
}

export function useReviewPreview(id: string, limit: number) {
  const version = useReviewVersion()
  return useCatalogRequest<ReviewPage>(`${reviewsPath(id)}?limit=${limit}`, { version })
}

export function useReviewEligibility(id?: string, orderId?: string) {
  const auth = useAuthStatus()
  const user = useCurrentUser()
  const version = useReviewVersion()
  const query = orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''
  const request = useCatalogRequest<ReviewEligibility>(
    id && user ? `${reviewsPath(id)}/eligibility${query}` : undefined,
    { auth: true, version: `${user?.id}:${version}` },
  )
  return { ...request, auth }
}
