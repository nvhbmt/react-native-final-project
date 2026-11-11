import { and, desc, eq } from 'drizzle-orm'

import type { Db } from '@/db/client.ts'
import { orders } from '@/db/schema.ts'
import { categoryIds } from '@/modules/catalog/model.ts'
import { listingQuery } from '@/modules/catalog/schemas.ts'
import type { CatalogService } from '@/modules/catalog/service.ts'
import { serializeOrder } from '@/modules/orders/routes.ts'
import type { ToolSpec } from './provider.ts'

/**
 * Tool trợ lý được gọi. Luôn chạy với quyền của user đang chat: chỉ đọc catalog công khai
 * và đơn hàng của chính user.
 */
export const TOOL_SPECS: ToolSpec[] = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Tìm sản phẩm trong cửa hàng theo từ khoá, danh mục, khoảng giá (USD).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Từ khoá tiếng Anh, vd. "iphone", "running shoes"' },
          category: { type: 'string', enum: [...categoryIds] },
          maxPrice: { type: 'number', description: 'Giá tối đa (USD)' },
          minRating: { type: 'number', description: 'Điểm đánh giá tối thiểu 0–5' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product',
      description: 'Xem chi tiết một sản phẩm theo id (mô tả, giá, màu, size).',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_my_orders',
      description: 'Liệt kê các đơn hàng gần đây của người dùng hiện tại (trạng thái, tổng tiền, sản phẩm).',
      parameters: { type: 'object', properties: { limit: { type: 'number', description: 'Tối đa 10' } } },
    },
  },
]

const compactProduct = (p: { id: string; name: string; price: number; rating: number | null; category: string; available: boolean | null }) => ({
  id: p.id, name: p.name, priceUsd: p.price, rating: p.rating, category: p.category, available: p.available !== false,
})

export function createToolRunner(db: Db, catalog: CatalogService | undefined, userId: string) {
  return async function run(name: string, rawArgs: string): Promise<unknown> {
    let args: Record<string, unknown> = {}
    try {
      args = rawArgs ? JSON.parse(rawArgs) : {}
    } catch {
      return { error: 'Tham số không phải JSON hợp lệ' }
    }
    try {
      switch (name) {
        case 'search_products': {
          if (!catalog) return { error: 'Catalog không khả dụng' }
          const query = listingQuery.parse({
            q: typeof args.query === 'string' ? args.query.slice(0, 100) : '',
            category: categoryIds.includes(args.category as never) ? args.category : undefined,
            maxPrice: typeof args.maxPrice === 'number' && args.maxPrice > 0 ? args.maxPrice.toFixed(2) : undefined,
            minRating: typeof args.minRating === 'number' ? Math.min(5, Math.max(0, args.minRating)).toFixed(1) : undefined,
            sort: 'matched',
            limit: '6',
          })
          return (await catalog.list(query)).items.map(compactProduct)
        }
        case 'get_product': {
          if (!catalog) return { error: 'Catalog không khả dụng' }
          const product = await catalog.detail(String(args.id ?? ''))
          return {
            ...compactProduct(product),
            description: product.description.slice(0, 1200),
            colors: product.variants?.colors.map((color) => color.name) ?? [],
            sizes: product.variants?.sizes ?? [],
          }
        }
        case 'list_my_orders': {
          const limit = Math.min(10, Math.max(1, Number(args.limit) || 5))
          const rows = await db.select().from(orders).where(and(eq(orders.userId, userId))).orderBy(desc(orders.createdAt)).limit(limit)
          return rows.map((row) => {
            const order = serializeOrder(row)
            return {
              code: order.code, status: order.status, totalUsd: order.total, createdAt: new Date(order.createdAt).toISOString(),
              items: order.items.map((item) => `${item.quantity} × ${item.name}`),
            }
          })
        }
        default:
          return { error: `Không có tool ${name}` }
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Lỗi khi chạy tool' }
    }
  }
}
