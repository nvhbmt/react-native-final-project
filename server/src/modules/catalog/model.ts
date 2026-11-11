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
    name: 'Electronics',
    subcategories: { phone: 'Smartphones', tablet: 'Tablets', laptop: 'Laptops', headphone: 'Headphones' },
  },
  fashion: {
    name: 'Fashion',
    subcategories: { hoodie: 'Hoodies & sweatshirts', 't-shirt': 'T-shirts', shoes: 'Shoes', apparel: 'Other apparel' },
  },
  beauty: {
    name: 'Beauty',
    subcategories: { makeup: 'Makeup', skincare: 'Skincare' },
  },
  fruits: {
    name: 'Fresh Fruits',
    subcategories: { tropical: 'Tropical', citrus: 'Citrus', orchard: 'Orchard', berries: 'Berries', other: 'Other fruits' },
  },
} satisfies Record<CategoryId, { name: string; subcategories: Record<string, string> }>

export function hasSubcategory(category: CategoryId, subcategory: string) {
  return Object.hasOwn(categories[category].subcategories, subcategory)
}
