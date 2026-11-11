import { create } from 'zustand'

import { emptyFilters, type ProductFilters } from '@/features/products/types'

type FilterState = {
  filters: ProductFilters
  setFilters: (filters: ProductFilters) => void
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: emptyFilters,
  setFilters: (filters) => set({ filters: { ...filters, shippingOptions: [...(filters.shippingOptions ?? [])], others: [...(filters.others ?? [])] } }),
}))

export function useProductFilters() {
  return useFilterStore((state) => state.filters)
}

export function hasActiveFilters(filters: ProductFilters) {
  return Boolean(filters.minimumPrice || filters.maximumPrice || filters.minimumRating || filters.shippingOptions?.length || filters.others?.length)
}
