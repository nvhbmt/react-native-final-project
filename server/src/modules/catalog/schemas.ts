import { z } from 'zod'

import { benefits, categoryIds, hasSubcategory, shippingOptions } from './model.ts'

const sortOrders = ['sales', 'matched', 'popular'] as const
const price = z.string().regex(/^\d{1,7}(\.\d{1,2})?$/).transform((value) => Math.round(Number(value) * 100))
const limit = (fallback: number, max: number) =>
  z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(max)).default(fallback)
const shipping = z.enum(shippingOptions)
const benefit = z.enum(benefits)
const productId = z.string().regex(/^[a-z0-9-]{1,160}$/)

export const listingQuery = z.object({
  q: z.string().trim().max(100).default(''),
  category: z.enum(categoryIds).optional(),
  subcategory: z.string().regex(/^[a-z0-9-]{1,40}$/).optional(),
  relatedTo: productId.optional(),
  sort: z.enum(sortOrders).default('sales'),
  minPrice: price.optional(),
  maxPrice: price.optional(),
  minRating: z.string().regex(/^(?:[0-4](?:\.\d)?|5(?:\.0)?)$/).transform((value) => Math.round(Number(value) * 10)).optional(),
  'shipping[]': z.union([shipping, z.array(shipping).max(shippingOptions.length)]).optional(),
  'benefits[]': z.union([benefit, z.array(benefit).max(benefits.length)]).optional(),
  cursor: z.string().min(1).max(512).regex(/^[A-Za-z0-9_-]+$/).optional(),
  limit: limit(20, 50),
}).superRefine((value, ctx) => {
  if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
    ctx.addIssue({ code: 'custom', path: ['maxPrice'], message: 'maxPrice phải lớn hơn hoặc bằng minPrice' })
  }
  if (value.subcategory && (!value.category || !hasSubcategory(value.category, value.subcategory))) {
    ctx.addIssue({ code: 'custom', path: ['subcategory'], message: 'Danh mục con phải thuộc category đã chọn' })
  }
}).transform(({ 'shipping[]': shippingValue, 'benefits[]': benefitValue, ...value }) => ({
  ...value,
  shipping: (shippingValue === undefined ? [] : [shippingValue].flat()).sort(),
  benefits: (benefitValue === undefined ? [] : [benefitValue].flat()).sort(),
}))

export const productParams = z.object({ id: productId })
export const relatedQuery = z.object({ limit: limit(6, 20) })

export type ListingQuery = z.output<typeof listingQuery>
