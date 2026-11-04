import { create } from 'zustand'

import { emptyFilters, type ProductFilters } from '@/features/products/catalog'

export const prototypeFilters: ProductFilters = {
  minimumPrice: '10',
  maximumPrice: '1000',
  minimumRating: 4,
  shippingOptions: [],
  others: ['free-return'],
}

type FilterState = {
  filters: ProductFilters | null
  setFilters: (filters: ProductFilters) => void
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: null,
  setFilters: (filters) => set({ filters: { ...filters, shippingOptions: [...(filters.shippingOptions ?? [])], others: [...(filters.others ?? [])] } }),
}))

export function useProductFilters() {
  return useFilterStore((state) => state.filters ?? emptyFilters)
}

export function hasActiveFilters(filters: ProductFilters) {
  return Boolean(filters.minimumPrice || filters.maximumPrice || filters.minimumRating || filters.shippingOptions?.length || filters.others?.length)
}
