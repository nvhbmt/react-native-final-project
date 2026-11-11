import type { Product as CatalogProduct } from '@/features/products/types'

export type ProductFeature = {
  icon: 'express' | 'return' | 'review' | 'authorized'
  label: string
}

export type ProductReview = {
  id: string
  author: string
  avatar: string | null
  content: string
  createdAt: string
  /** 1–5 sao */
  rating: number
  purchaseMode: 'demo' | 'verified'
}

export type ReviewSummary = {
  rating: number | null
  reviewCount: number
  breakdown: [number, number, number, number, number]
}

export type ProductColor = { id: string; name: string; hex?: string; swatchImage?: string; image?: string }

/** Bảng size: số đo theo cm cho từng size, mỗi cột là một số đo (Ngực, Eo...). */
export type SizeChart = {
  columns: { key: string; label: string }[]
  rows: { size: string; cm: Record<string, number> }[]
}

export type ProductDetail = Pick<CatalogProduct, 'id' | 'name' | 'subtitle' | 'subcategory' | 'price' | 'priceBasis' | 'priceUnit' | 'rating' | 'reviewCount' | 'available'> & {
  /** Tên danh mục, hiển thị trên header trang chi tiết ("Headphone", "T-Shirt"). */
  categoryName: string
  description: string
  images: string[]
  imageAttribution: `https://${string}` | null
  /** Số lượt đánh giá theo từng mức sao, index 0 → 5 sao ... index 4 → 1 sao. */
  ratingBreakdown: [number, number, number, number, number] | null
  /** Có biến thể → trang chi tiết dạng chọn màu/size/số lượng. */
  variants: {
    colors: ProductColor[]
    sizes: string[]
  } | null
  sizeChart: SizeChart | null
  promoLabel: string | null
  shippingOptions: CatalogProduct['shippingOptions']
  benefits: CatalogProduct['benefits']
}

export type Product = ProductDetail

export type ProductSelection = {
  colorId?: string
  size?: string
  quantity: number
}
