import { createHash } from 'node:crypto'

import type { CatalogProductRow } from '@/db/schema.ts'
import { AppError } from '@/lib/http.ts'

import { categories, categoryIds } from './model.ts'
import type { CatalogRepository, PagePosition } from './repository.ts'
import type { ListingQuery } from './schemas.ts'

function priceSummary(row: CatalogProductRow) {
  return {
    price: row.priceCents / 100,
    originalPrice: row.compareAtPriceCents === null ? null : row.compareAtPriceCents / 100,
    discountPercent: row.compareAtPriceCents === null ? null : Math.round(100 * (1 - row.priceCents / row.compareAtPriceCents)),
    currency: 'USD' as const,
    priceUnit: row.priceUnit,
    priceBasis: row.priceBasis,
  }
}

export function productSummary(row: CatalogProductRow) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    subtitle: row.subtitle,
    category: row.category,
    subcategory: row.subcategory,
    image: row.images[0],
    imageAttribution: row.imageAttribution,
    ...priceSummary(row),
    rating: row.ratingTenths === null ? null : row.ratingTenths / 10,
    reviewCount: row.reviewCount,
    sales: row.sales,
    available: row.available,
    hasVariants: Boolean(row.variants?.colors.length || row.variants?.sizes.length),
    shippingOptions: row.shippingOptions,
    benefits: row.benefits,
  }
}

function decodeCursor(cursor: string, scope: string): PagePosition {
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (value.scope === scope && Number.isSafeInteger(value.score)
        && typeof value.id === 'string' && /^[a-z0-9-]{1,160}$/.test(value.id)) {
      return { score: value.score, id: value.id }
    }
  } catch {
    // The client can restart pagination with the same filters and no cursor.
  }
  throw new AppError(400, 'INVALID_CURSOR', 'Cursor không hợp lệ với bộ lọc hiện tại')
}

export function createCatalogService(repository: CatalogRepository) {
  async function requireProduct(id: string) {
    const product = await repository.get(id)
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm')
    return product
  }

  async function listCategories() {
    const previews = await repository.categoryPreviews()
    return categoryIds.map((id) => ({
      id,
      name: categories[id].name,
      image: previews.find((preview) => preview.category === id)?.image ?? null,
      subcategories: Object.entries(categories[id].subcategories).map(([subcategory, name]) => ({
        id: subcategory,
        name,
        image: previews.find((preview) => preview.category === id && preview.subcategory === subcategory)?.image ?? null,
      })),
    }))
  }

  return {
    categories: listCategories,
    async home() {
      const [categoryList, featured] = await Promise.all([listCategories(), repository.featured()])
      const recommendedProducts = featured.map(productSummary)
      const deals = recommendedProducts
        .filter((product) => (product.discountPercent ?? 0) > 0)
        .sort((a, b) => b.discountPercent! - a.discountPercent!)
        .slice(0, 6)
      const banners = categoryList.flatMap((category) => {
        const product = deals.find((item) => item.category === category.id)
          ?? recommendedProducts.find((item) => item.category === category.id)
        return product ? [{
          category: category.id, productId: product.id, title: category.name, image: product.image,
          discountPercent: product.discountPercent,
        }] : []
      })
      return { categories: categoryList, banners, deals, recommendedProducts }
    },
    async list(query: ListingQuery) {
      const { cursor, limit, ...filters } = query
      const scope = createHash('sha256').update(JSON.stringify(filters)).digest('base64url')
      const position = cursor ? decodeCursor(cursor, scope) : undefined
      const relatedTo = query.relatedTo ? await requireProduct(query.relatedTo) : undefined
      const rows = await repository.list(query, position, relatedTo)
      const page = rows.slice(0, limit)
      const last = page.at(-1)
      const nextCursor = rows.length > limit && last
        ? Buffer.from(JSON.stringify({ scope, score: last.score, id: last.product.id })).toString('base64url')
        : null
      return { items: page.map(({ product }) => productSummary(product)), nextCursor }
    },
    async detail(id: string) {
      const product = await requireProduct(id)
      const result = productSummary(product)
      return {
        ...result,
        categoryName: categories[product.category].name,
        description: product.description,
        images: product.images,
        ratingBreakdown: product.ratingBreakdown,
        variants: product.variants,
        sizeChart: product.sizeChart,
        promoLabel: result.discountPercent ? `${result.discountPercent}% off` : null,
        sourceUrl: product.sourceUrl,
        priceSourceUrl: product.priceSourceUrl,
      }
    },
    async related(id: string, limit: number) {
      return (await repository.related(await requireProduct(id), limit)).map(productSummary)
    },
    async sizeGuide(id: string) {
      return (await requireProduct(id)).sizeChart
    },
  }
}

export type CatalogService = ReturnType<typeof createCatalogService>
