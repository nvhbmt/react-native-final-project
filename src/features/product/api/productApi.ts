import { allProducts } from '@/features/products/catalog'

import { PRODUCTS } from '../data/products.mock'
import type { Product } from '../types'

// Lớp truy cập dữ liệu sản phẩm. Hiện đọc mock đồng bộ; khi có backend, đổi thành fetch
// (và bọc bằng React Query/SWR) mà không phải sửa component.
function getById(id: string): Product | undefined {
  const detail = PRODUCTS.find((product) => product.id === id)
  const item = allProducts.find((product) => product.id === id)
  if (!item) return detail
  const template = detail ?? PRODUCTS[0]

  return {
    ...template,
    id: item.id,
    name: item.name,
    category: detail?.category ?? item.name,
    price: item.price,
    rating: item.rating,
    images: detail?.images ?? [item.image],
    imageFit: detail?.imageFit ?? (id === 'headphone-pro' ? 'cover' : 'contain'),
    variants: detail?.variants,
    sizeChart: detail?.sizeChart,
    promoLabel: detail?.promoLabel,
    relatedIds: detail?.relatedIds ?? allProducts
      .filter((other) => other.category === item.category && other.id !== item.id)
      .slice(0, 6)
      .map((other) => other.id),
  }
}

export const productApi = {
  getById,
  getRelated(product: Product): Product[] {
    return (product.relatedIds ?? [])
      .map(getById)
      .filter((p): p is Product => !!p)
  },
}
