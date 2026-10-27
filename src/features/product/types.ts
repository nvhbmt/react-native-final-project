export type ProductFeature = {
  icon: 'express' | 'return' | 'review' | 'authorized'
  label: string
}

export type ProductReview = {
  id: string
  author: string
  avatar: string
  content: string
  createdAt: string
  /** 1–5 sao */
  rating: number
}

export type ProductColor = { id: string; name: string; hex: string }

/** Bảng size: số đo theo cm cho từng size, mỗi cột là một số đo (Ngực, Eo...). */
export type SizeChart = {
  columns: { key: string; label: string }[]
  rows: { size: string; cm: Record<string, number> }[]
}

export type Product = {
  id: string
  name: string
  /** Tên danh mục, hiển thị trên header trang chi tiết ("Headphone", "T-Shirt"). */
  category: string
  subtitle: string
  description: string
  price: number
  images: string[]
  rating: number
  reviewCount: number
  /** Số lượt đánh giá theo từng mức sao, index 0 → 5 sao ... index 4 → 1 sao. */
  ratingBreakdown: [number, number, number, number, number]
  reviews: ProductReview[]
  features?: ProductFeature[]
  /** Có biến thể → trang chi tiết dạng chọn màu/size/số lượng. */
  variants?: {
    colors: ProductColor[]
    sizes: string[]
  }
  sizeChart?: SizeChart
  promoLabel?: string
  relatedIds?: string[]
}

export type ProductSelection = {
  colorId?: string
  size?: string
  quantity: number
}
