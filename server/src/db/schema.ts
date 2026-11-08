import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { benefits, categoryIds, shippingOptions, type ProductVariants, type RatingBreakdown, type SizeChart } from '@/modules/catalog/model.ts'

export const userRole = pgEnum('user_role', ['customer', 'admin'])

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Luôn lưu dạng chữ thường để so khớp không phân biệt hoa/thường. */
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name').notNull(),
    avatarUrl: text('avatar_url'),
    role: userRole('role').notNull().default('customer'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
)

/**
 * Refresh token dạng opaque, chỉ lưu SHA-256 của token. Mỗi lần refresh sẽ xoay vòng (rotate):
 * token cũ bị thu hồi, token mới cùng `familyId`. Nếu một token đã thu hồi bị dùng lại
 * (dấu hiệu bị đánh cắp) thì thu hồi cả family → mọi thiết bị dùng chuỗi đó phải đăng nhập lại.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('refresh_tokens_token_hash_unique').on(table.tokenHash),
    index('refresh_tokens_user_id_idx').on(table.userId),
    index('refresh_tokens_family_active_idx').on(table.familyId).where(sql`${table.revokedAt} is null`),
  ],
)

export type UserRow = typeof users.$inferSelect
export type RefreshTokenRow = typeof refreshTokens.$inferSelect

export const catalogCategory = pgEnum('catalog_category', categoryIds)
export const catalogShipping = pgEnum('catalog_shipping', shippingOptions)
export const catalogBenefit = pgEnum('catalog_benefit', benefits)

export const catalogProducts = pgTable(
  'catalog_products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    brand: text('brand').notNull(),
    category: catalogCategory('category').notNull(),
    subcategory: text('subcategory').notNull(),
    subtitle: text('subtitle').notNull(),
    description: text('description').notNull(),
    keywords: text('keywords').notNull().default(''),
    images: text('images').array().notNull(),
    priceCents: integer('price_cents').notNull(),
    compareAtPriceCents: integer('compare_at_price_cents'),
    priceBasis: text('price_basis').$type<'listed' | 'from' | 'reference'>().notNull(),
    priceUnit: text('price_unit').$type<'item' | 'lb'>().notNull(),
    priceSourceUrl: text('price_source_url'),
    ratingTenths: integer('rating_tenths'),
    reviewCount: integer('review_count').notNull().default(0),
    ratingBreakdown: jsonb('rating_breakdown').$type<RatingBreakdown>(),
    sales: integer('sales'),
    available: boolean('available'),
    shippingOptions: catalogShipping('shipping_options').array().notNull(),
    benefits: catalogBenefit('benefits').array().notNull(),
    variants: jsonb('variants').$type<ProductVariants>(),
    sizeChart: jsonb('size_chart').$type<SizeChart>(),
    featured: boolean('featured').notNull().default(false),
    sourceUrl: text('source_url').notNull(),
    imageAttribution: text('image_attribution'),
  },
  (table) => [
    index('catalog_products_category_subcategory_idx').on(table.category, table.subcategory),
    index('catalog_products_price_idx').on(table.priceCents),
    check('catalog_products_price_valid', sql`${table.priceCents} > 0 AND ${table.compareAtPriceCents} > ${table.priceCents}`),
    check('catalog_products_rating_valid', sql`${table.ratingTenths} BETWEEN 0 AND 50`),
    check('catalog_products_counts_valid', sql`${table.reviewCount} >= 0 AND (${table.sales} IS NULL OR ${table.sales} >= 0)`),
    check('catalog_products_images_nonempty', sql`cardinality(${table.images}) > 0`),
  ],
)

export type CatalogProductRow = typeof catalogProducts.$inferSelect
