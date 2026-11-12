export const categoryIds = ['electronics', 'fashion', 'beauty', 'fruits'] as const
export const shippingOptions = ['instant', 'express', 'standard'] as const
export const benefits = ['free-return', 'buyer-protection', 'best-deal', 'ship-to-store'] as const

export type CategoryId = (typeof categoryIds)[number]
export type ProductVariants = {
  colors: { id: string; name: string; hex?: string; swatchImage?: string; image?: string }[]
  sizes: string[]
}
export type SizeChart = {
  columns: { key: string; label: string }[]
  rows: { size: string; cm: Record<string, number> }[]
  sourceUrl?: string
}
export type RatingBreakdown = [number, number, number, number, number]

export const categories = {
  electronics: {
    name: 'Điện tử',
    subcategories: { phone: 'Điện thoại', tablet: 'Máy tính bảng', laptop: 'Laptop', headphone: 'Tai nghe' },
  },
  fashion: {
    name: 'Thời trang',
    subcategories: { hoodie: 'Hoodie & áo nỉ', 't-shirt': 'Áo thun', shoes: 'Giày', apparel: 'Trang phục khác' },
  },
  beauty: {
    name: 'Làm đẹp',
    subcategories: { makeup: 'Trang điểm', skincare: 'Chăm sóc da' },
  },
  fruits: {
    name: 'Trái cây tươi',
    subcategories: { tropical: 'Nhiệt đới', citrus: 'Họ cam quýt', orchard: 'Trái cây vườn', berries: 'Quả mọng', other: 'Trái cây khác' },
  },
} satisfies Record<CategoryId, { name: string; subcategories: Record<string, string> }>

export function hasSubcategory(category: CategoryId, subcategory: string) {
  return Object.hasOwn(categories[category].subcategories, subcategory)
}
