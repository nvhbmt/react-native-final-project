import type { CategoryId, ProductFilters, SortOrder } from '../types'

export function listingPath({ category, subcategory, query, sort, filters, relatedTo, limit }: {
  category?: CategoryId
  subcategory?: string
  query?: string
  sort?: SortOrder
  filters: ProductFilters
  relatedTo?: string
  limit?: number
}) {
  const params = new URLSearchParams()
  const search = query?.trim().slice(0, 100)
  if (search) params.set('q', search)
  if (category) params.set('category', category)
  if (category && subcategory) params.set('subcategory', subcategory)
  if (sort) params.set('sort', sort)
  if (relatedTo) params.set('relatedTo', relatedTo)
  if (limit) params.set('limit', String(limit))
  if (filters.minimumPrice) params.set('minPrice', filters.minimumPrice)
  if (filters.maximumPrice) params.set('maxPrice', filters.maximumPrice)
  if (filters.minimumRating) params.set('minRating', String(filters.minimumRating))
  for (const option of filters.shippingOptions ?? []) params.append('shipping[]', option)
  for (const benefit of filters.others ?? []) params.append('benefits[]', benefit)
  const queryString = params.toString()
  return queryString ? `/products?${queryString}` : '/products'
}
