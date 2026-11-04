export type CategoryId = 'electronics' | 'fashion' | 'beauty' | 'fruits'
export type SortOrder = 'sales' | 'matched' | 'popular'
export type ShippingOption = 'instant' | 'express' | 'standard'
export type OtherFilter = 'free-return' | 'buyer-protection' | 'best-deal' | 'ship-to-store'

export type Product = {
  id: string
  name: string
  category: CategoryId
  image: number
  price: number
  rating: number
  sales: number
  keywords?: string
  subcategory?: string
  shippingOptions?: ShippingOption[]
  benefits?: OtherFilter[]
}

export type ProductFilters = {
  minimumPrice: string
  maximumPrice: string
  minimumRating: number
  shippingOptions?: ShippingOption[]
  others?: OtherFilter[]
}

export const emptyFilters: ProductFilters = {
  minimumPrice: '',
  maximumPrice: '',
  minimumRating: 0,
  shippingOptions: [],
  others: [],
}
