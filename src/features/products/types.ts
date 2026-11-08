export type CategoryId = 'electronics' | 'fashion' | 'beauty' | 'fruits'
export type SortOrder = 'sales' | 'matched' | 'popular'
export type ShippingOption = 'instant' | 'express' | 'standard'
export type OtherFilter = 'free-return' | 'buyer-protection' | 'best-deal' | 'ship-to-store'

export type Product = {
  id: string
  name: string
  subtitle: string
  category: CategoryId
  subcategory: string
  image: string
  price: number
  priceUnit: 'item' | 'lb'
  priceBasis: 'listed' | 'from' | 'reference'
  discountPercent: number | null
  rating: number | null
  reviewCount: number
  available: boolean | null
  hasVariants: boolean
  shippingOptions: ShippingOption[]
  benefits: OtherFilter[]
}

export type CatalogCategory = {
  id: CategoryId
  name: string
  image: string | null
  subcategories: { id: string; name: string; image: string | null }[]
}

export type CatalogBanner = { category: CategoryId; productId: string; title: string; image: string; discountPercent: number | null }
export type CatalogHome = { categories: CatalogCategory[]; banners: CatalogBanner[]; deals: Product[]; recommendedProducts: Product[] }
export type ProductPage = { items: Product[]; nextCursor: string | null }

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
