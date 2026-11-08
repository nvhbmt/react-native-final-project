import { and, arrayContains, arrayOverlaps, asc, desc, eq, gt, gte, ilike, lt, lte, ne, or, sql } from 'drizzle-orm'

import type { Db } from '@/db/client.ts'
import { catalogProducts as products } from '@/db/schema.ts'

import type { CategoryId } from './model.ts'
import type { ListingQuery } from './schemas.ts'

export type PagePosition = { score: number; id: string }

const searchable = sql<string>`concat_ws(' ', ${products.name}, ${products.brand}, ${products.keywords}, ${products.subcategory})`
const escapeLike = (term: string) => term.replace(/[\\%_]/g, '\\$&')

function orderScore(query: ListingQuery) {
  if (query.sort === 'matched' && query.q) {
    const phrase = escapeLike(query.q)
    return sql<number>`CASE
      WHEN ${ilike(products.name, phrase)} THEN 3
      WHEN ${ilike(products.name, phrase + '%')} THEN 2
      WHEN ${ilike(products.name, '%' + phrase + '%')} THEN 1
      ELSE 0 END`
  }
  if (query.sort === 'popular') return sql<number>`coalesce(${products.ratingTenths}, -1)`
  return sql<number>`coalesce(${products.sales}, CASE WHEN ${products.featured} THEN 0 ELSE -1 END)`
}

export function createCatalogRepository(db: Db) {
  return {
    async list(query: ListingQuery, after?: PagePosition, relatedTo?: { id: string; category: CategoryId }) {
      const score = orderScore(query)
      const rows = await db.select({ product: products, score }).from(products).where(and(
        ...query.q.split(/\s+/).filter(Boolean).map((term) => ilike(searchable, '%' + escapeLike(term) + '%')),
        query.category ? eq(products.category, query.category) : undefined,
        relatedTo ? and(eq(products.category, relatedTo.category), ne(products.id, relatedTo.id)) : undefined,
        query.subcategory ? eq(products.subcategory, query.subcategory) : undefined,
        query.minPrice === undefined ? undefined : gte(products.priceCents, query.minPrice),
        query.maxPrice === undefined ? undefined : lte(products.priceCents, query.maxPrice),
        query.minRating ? gte(products.ratingTenths, query.minRating) : undefined,
        query.shipping.length ? arrayOverlaps(products.shippingOptions, query.shipping) : undefined,
        query.benefits.length ? arrayContains(products.benefits, query.benefits) : undefined,
        after ? or(lt(score, after.score), and(eq(score, after.score), gt(products.id, after.id))) : undefined,
      )).orderBy(desc(score), asc(products.id)).limit(query.limit + 1)
      return rows
    },
    async get(id: string) {
      const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)
      return product
    },
    featured() {
      return db.select().from(products).where(eq(products.featured, true)).orderBy(asc(products.id))
    },
    categoryPreviews() {
      return db.selectDistinctOn([products.category, products.subcategory], {
        category: products.category, subcategory: products.subcategory, image: sql<string>`${products.images}[1]`,
      }).from(products).orderBy(products.category, products.subcategory, desc(products.featured), products.id)
    },
    related(product: { id: string; category: CategoryId; subcategory: string }, limit: number) {
      return db.select().from(products)
        .where(and(eq(products.category, product.category), ne(products.id, product.id)))
        .orderBy(desc(eq(products.subcategory, product.subcategory)), sql`${products.ratingTenths} desc nulls last`, asc(products.id))
        .limit(limit)
    },
  }
}

export type CatalogRepository = ReturnType<typeof createCatalogRepository>
