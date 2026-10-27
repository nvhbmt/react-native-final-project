import { PRODUCTS } from '../data/products.mock'
import type { Product } from '../types'

// Lớp truy cập dữ liệu sản phẩm. Hiện đọc mock đồng bộ; khi có backend, đổi thành fetch
// (và bọc bằng React Query/SWR) mà không phải sửa component.
export const productApi = {
  getById(id: string): Product | undefined {
    return PRODUCTS.find((p) => p.id === id)
  },
  getRelated(product: Product): Product[] {
    return (product.relatedIds ?? [])
      .map((id) => PRODUCTS.find((p) => p.id === id))
      .filter((p): p is Product => !!p)
  },
}
