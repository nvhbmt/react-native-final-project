import { readFile } from 'node:fs/promises'

import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { catalogProducts } from '@/db/schema.ts'

import { benefits, categoryIds, hasSubcategory, shippingOptions } from './model.ts'

const imageUrl = z.url({ protocol: /^https$/ })
const sizeChart = z.object({
  columns: z.array(z.object({ key: z.string(), label: z.string() })).min(1),
  rows: z.array(z.object({ size: z.string(), cm: z.record(z.string(), z.number().positive()) })).min(1),
  sourceUrl: imageUrl.optional(),
})
const catalogSeed = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]{1,160}$/),
  name: z.string().min(1),
  brand: z.string(),
  category: z.enum(categoryIds),
  subcategory: z.string(),
  subtitle: z.string(),
  description: z.string().min(1),
  keywords: z.string().optional(),
  images: z.array(imageUrl).min(1),
  sourceUrl: imageUrl,
  imageAttribution: imageUrl.optional(),
  priceCents: z.number().int().positive(),
  compareAtPriceCents: z.number().int().positive().optional(),
  priceBasis: z.enum(['listed', 'from', 'reference']),
  priceUnit: z.enum(['item', 'lb']),
  priceSourceUrl: imageUrl.optional(),
  ratingTenths: z.number().int().min(0).max(50).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  available: z.boolean().optional(),
  shippingOptions: z.array(z.enum(shippingOptions)),
  benefits: z.array(z.enum(benefits)),
  variants: z.object({
    colors: z.array(z.object({
      id: z.string(), name: z.string(), hex: z.string().regex(/^#[a-f0-9]{6}$/i).optional(),
      swatchImage: imageUrl.optional(), image: imageUrl.optional(),
    })),
    sizes: z.array(z.string()),
  }).optional(),
  sizeChart: sizeChart.optional(),
  featured: z.boolean().optional(),
}).refine((item) => hasSubcategory(item.category, item.subcategory), { path: ['subcategory'] })
  .refine((item) => item.compareAtPriceCents === undefined || item.compareAtPriceCents > item.priceCents, { path: ['compareAtPriceCents'] }))
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length, 'ID seed bị trùng')

export async function seedCatalog(db: Db) {
  const data = JSON.parse(await readFile(new URL('./data/products.json', import.meta.url), 'utf8'))
  const products = catalogSeed.parse(data)
  const inserted = await db.insert(catalogProducts).values(products)
    .onConflictDoNothing({ target: catalogProducts.id }).returning({ id: catalogProducts.id })
  return { total: products.length, inserted: inserted.length }
}
