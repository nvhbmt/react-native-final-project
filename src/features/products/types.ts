import type { ImageSourcePropType } from 'react-native'

export type CategoryId = 'electronics' | 'fashion' | 'beauty' | 'fruits'
export type SortOrder = 'sales' | 'matched' | 'popular'

export type Product = {
  id: string
  name: string
  category: CategoryId
  image: ImageSourcePropType
  price: number
  rating: number
  sales: number
  keywords?: string
  subcategory?: string
}

export type ProductFilters = {
  minimumPrice: string
  maximumPrice: string
  minimumRating: number
}

export const emptyFilters: ProductFilters = {
  minimumPrice: '',
  maximumPrice: '',
  minimumRating: 0,
}
