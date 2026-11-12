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
    phone: text('phone'),
    /** Đồng ý nhận thông báo khuyến mãi (mặc định tắt). */
    promoNotifications: boolean('promo_notifications').notNull().default(false),
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

export type CheckoutItem = {
  key: string
  productId: string
  name: string
  subtitle: string
  image: string
  priceCents: number
  quantity: number
  options?: { color?: string; size?: string }
}

/** Bản chụp địa chỉ giao hàng lúc đặt đơn — sửa/xoá sổ địa chỉ sau đó không ảnh hưởng đơn cũ. */
export type ShippingAddress = {
  recipientName: string
  phone: string
  line1: string
  city: string
}

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestId: text('request_id').notNull(),
  requestHash: text('request_hash').notNull(),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').$type<'pending_payment' | 'completed' | 'cancelled'>().notNull(),
  paymentMode: text('payment_mode').$type<'demo' | 'verified'>().notNull(),
  items: jsonb('items').$type<CheckoutItem[]>().notNull(),
  /** Null với các đơn tạo trước khi có bước chọn địa chỉ. */
  shippingAddress: jsonb('shipping_address').$type<ShippingAddress>(),
  subtotalCents: integer('subtotal_cents').notNull(),
  discountCents: integer('discount_cents').notNull(),
  taxCents: integer('tax_cents').notNull(),
  /** Hình thức giao (`standard` | `express` | `instant`); null với đơn tạo trước khi có phí ship. */
  shippingMethod: text('shipping_method').$type<'standard' | 'express' | 'instant'>(),
  /** Phí ship đã tính (sau FREESHIP); đơn cũ mặc định 0 nên tổng tiền không đổi. */
  shippingCents: integer('shipping_cents').notNull().default(0),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  /**
   * Tiến độ giao hàng, tách khỏi `status` (thanh toán). Chỉ có ý nghĩa khi `status = 'completed'`.
   * processing → shipping → delivered.
   */
  fulfillment: text('fulfillment').$type<'processing' | 'shipping' | 'delivered'>().notNull().default('processing'),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  /** Người cập nhật bước giao hàng gần nhất (admin, hoặc chính khách khi bấm nút demo ở dev). */
  fulfillmentUpdatedBy: uuid('fulfillment_updated_by').references(() => users.id, { onDelete: 'set null' }),
  /** Nội dung chuyển khoản SePay (vd. `DH7K2M9QXA`); null với đơn demo. */
  paymentCode: text('payment_code'),
  /** Số tiền phải chuyển (VND) — chốt lúc tạo đơn theo tỉ giá cấu hình. */
  amountVnd: integer('amount_vnd'),
  /** Tổng tiền đã nhận qua SePay cho đơn đang chờ — khách có thể chuyển nhiều lần, đủ `amountVnd` thì xác nhận. */
  receivedVnd: integer('received_vnd').notNull().default(0),
  paymentExpiresAt: timestamp('payment_expires_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('orders_user_request_idx').on(table.userId, table.requestId),
  index('orders_user_created_idx').on(table.userId, table.createdAt),
  uniqueIndex('orders_payment_code_idx').on(table.paymentCode),
])

export type OrderRow = typeof orders.$inferSelect

export const productReviews = pgTable('product_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => catalogProducts.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('product_reviews_user_product_idx').on(table.userId, table.productId),
  index('product_reviews_product_created_idx').on(table.productId, table.createdAt, table.id),
  check('product_reviews_rating_valid', sql`${table.rating} BETWEEN 1 AND 5`),
  check('product_reviews_content_valid', sql`char_length(btrim(${table.content})) BETWEEN 1 AND 1000`),
])

/** Giỏ hàng lưu theo tài khoản; `key` = productId + màu + size (khớp key phía app). */
export const cartItems = pgTable('cart_items', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  productId: text('product_id').notNull().references(() => catalogProducts.id, { onDelete: 'cascade' }),
  color: text('color'),
  size: text('size'),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('cart_items_user_key_idx').on(table.userId, table.key),
  check('cart_items_quantity_valid', sql`${table.quantity} BETWEEN 1 AND 99`),
])

/** Mã giảm giá đang áp cho giỏ của user (một mã / giỏ). */
export const cartVouchers = pgTable('cart_vouchers', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
})

export const favorites = pgTable('favorites', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => catalogProducts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('favorites_user_product_idx').on(table.userId, table.productId),
  index('favorites_user_created_idx').on(table.userId, table.createdAt),
])

export const uploadPurpose = pgEnum('upload_purpose', ['avatar', 'feedback', 'review'])

/** Ảnh người dùng tải lên; file nằm trên đĩa (`UPLOAD_DIR`), DB giữ metadata + chủ sở hữu. */
export const uploads = pgTable('uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: uploadPurpose('purpose').notNull(),
  fileName: text('file_name').notNull(),
  /** URL ảnh lúc upload (Supabase Storage: tuyệt đối). Null với bản ghi cũ → `/uploads/<fileName>` trên ổ đĩa. */
  url: text('url'),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uploads_file_name_idx').on(table.fileName),
  index('uploads_user_created_idx').on(table.userId, table.createdAt),
])

export type UploadRow = typeof uploads.$inferSelect

/** Địa chỉ giao hàng; mỗi user tối đa 10, đúng một địa chỉ mặc định (nếu có). */
export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientName: text('recipient_name').notNull(),
  phone: text('phone').notNull(),
  line1: text('line1').notNull(),
  city: text('city').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [
  index('addresses_user_idx').on(table.userId, table.createdAt),
  uniqueIndex('addresses_one_default_idx').on(table.userId).where(sql`${table.isDefault}`),
])

export type AddressRow = typeof addresses.$inferSelect

export const inboxKind = pgEnum('inbox_kind', ['order', 'payment', 'feedback', 'system'])

/** Thông báo trong app (tab Inbox). Tạo bởi server khi có sự kiện: đặt đơn, nhận tiền, huỷ đơn... */
export const inboxMessages = pgTable('inbox_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: inboxKind('kind').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  /** Liên kết mở khi chạm, vd. `{ orderId }`. */
  data: jsonb('data').$type<{ orderId?: string; productId?: string }>(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [
  index('inbox_user_created_idx').on(table.userId, table.createdAt, table.id),
  index('inbox_user_unread_idx').on(table.userId).where(sql`${table.readAt} is null`),
])

export type InboxMessageRow = typeof inboxMessages.$inferSelect

export const feedbackMood = pgEnum('feedback_mood', ['sad', 'neutral', 'happy'])

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mood: feedbackMood('mood'),
  topics: text('topics').array().notNull(),
  comment: text('comment').notNull().default(''),
  /** URL tương đối của ảnh đã upload (`purpose=feedback`). */
  images: text('images').array().notNull(),
  rating: integer('rating').notNull(),
  productId: text('product_id').references(() => catalogProducts.id, { onDelete: 'set null' }),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [
  index('feedback_user_created_idx').on(table.userId, table.createdAt),
  check('feedback_rating_valid', sql`${table.rating} BETWEEN 1 AND 5`),
])

/**
 * Giao dịch ngân hàng nhận từ webhook SePay. `provider_txn_id` unique → webhook gửi lại không bị xử lý hai lần.
 * `result`: matched (đã ghi nhận cho đơn), underpaid (thiếu tiền), late (đơn đã trả/huỷ — cần hoàn tiền tay), unmatched.
 */
export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').$type<'sepay'>().notNull(),
  providerTxnId: text('provider_txn_id').notNull(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  amountVnd: integer('amount_vnd').notNull(),
  content: text('content').notNull(),
  referenceCode: text('reference_code'),
  result: text('result').$type<'matched' | 'underpaid' | 'late' | 'unmatched'>().notNull(),
  raw: jsonb('raw').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('payment_transactions_provider_txn_idx').on(table.provider, table.providerTxnId),
  index('payment_transactions_order_idx').on(table.orderId),
])

/** Mã đặt lại mật khẩu (6 số) gửi qua email; chỉ lưu SHA-256, hết hạn sau 15 phút, tối đa 5 lần nhập sai. */
export const passwordResets = pgTable('password_resets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('password_resets_user_idx').on(table.userId, table.createdAt)])

export type PasswordResetRow = typeof passwordResets.$inferSelect

/** Hội thoại với trợ lý mua sắm AI; có thể gắn sản phẩm/đơn hàng làm ngữ cảnh. */
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  productId: text('product_id').references(() => catalogProducts.id, { onDelete: 'set null' }),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [index('ai_conversations_user_updated_idx').on(table.userId, table.updatedAt)])

export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: text('role').$type<'user' | 'assistant'>().notNull(),
  content: text('content').notNull(),
  /** streaming → complete | stopped (người dùng dừng) | error */
  status: text('status').$type<'streaming' | 'complete' | 'stopped' | 'error'>().notNull(),
  /** 1 = hữu ích, -1 = không hữu ích (chỉ cho tin của trợ lý). */
  rating: integer('rating'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (table) => [
  index('ai_messages_conversation_created_idx').on(table.conversationId, table.createdAt, table.id),
  check('ai_messages_rating_valid', sql`${table.rating} IN (-1, 1)`),
])

export type AiConversationRow = typeof aiConversations.$inferSelect
export type AiMessageRow = typeof aiMessages.$inferSelect

/** Bộ đếm giới hạn request dùng chung giữa các instance API (xem lib/rateLimit.ts). */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
}, (table) => [index('rate_limits_reset_idx').on(table.resetAt)])
