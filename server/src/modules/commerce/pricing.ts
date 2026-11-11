import { inArray } from 'drizzle-orm'

import type { Db } from '@/db/client.ts'
import { catalogProducts, type CheckoutItem } from '@/db/schema.ts'
import { AppError } from '@/lib/http.ts'
import type { shippingOptions } from '@/modules/catalog/model.ts'

type ShippingOption = (typeof shippingOptions)[number]

/**
 * Định giá dùng chung cho giỏ hàng và đơn hàng: giá luôn lấy từ catalog trên server,
 * không bao giờ tin giá client gửi lên.
 */

export const TAX_RATE = 0.1

/** Mã giảm giá: code → tỉ lệ giảm trên subtotal. */
export const VOUCHERS: Record<string, { rate: number; label: string }> = {
  SALE10: { rate: 0.1, label: 'Giảm 10%' },
  FREESHIP: { rate: 0, label: 'Miễn phí vận chuyển' },
}

/** Hình thức giao hàng và phí (USD cent). Thứ tự = thứ tự hiển thị. Phí ship không chịu thuế. */
export const SHIPPING_METHODS = {
  standard: { label: 'Tiêu chuẩn', eta: 'Giao trong 7–10 ngày', feeCents: 299 },
  express: { label: 'Nhanh', eta: 'Giao trong 2 ngày', feeCents: 599 },
  instant: { label: 'Hoả tốc', eta: 'Giao trong 2 giờ', feeCents: 999 },
} as const satisfies Record<ShippingOption, { label: string; eta: string; feeCents: number }>
export type ShippingMethodId = keyof typeof SHIPPING_METHODS
export const SHIPPING_METHOD_IDS = Object.keys(SHIPPING_METHODS) as [ShippingMethodId, ...ShippingMethodId[]]

/** Phí ship thực tính: FREESHIP miễn toàn bộ phí vận chuyển. */
export function shippingFeeCents(method: ShippingMethodId, voucher?: string | null) {
  return voucher === 'FREESHIP' ? 0 : SHIPPING_METHODS[method].feeCents
}

/** Hình thức giao mà mọi sản phẩm trong đơn đều hỗ trợ (giao của các tập). */
export function commonShippingMethods(perProduct: readonly (readonly ShippingOption[])[]): ShippingMethodId[] {
  return SHIPPING_METHOD_IDS.filter((id) => perProduct.length > 0 && perProduct.every((options) => options.includes(id)))
}

export function normalizeVoucher(code: string): string | null {
  const normalized = code.trim().toUpperCase()
  return VOUCHERS[normalized] ? normalized : null
}

export type LineOptions = { color?: string; size?: string }
export type LineInput = { productId: string; quantity: number; options?: LineOptions }

export const lineKey = (productId: string, options?: LineOptions | null) =>
  [productId, options?.color, options?.size].filter(Boolean).join(':')

/** Kiểm tra sản phẩm + biến thể, gắn tên/ảnh/giá hiện tại. Ném 409/400 nếu dòng không hợp lệ. */
export async function priceLines(db: Pick<Db, 'select'>, lines: LineInput[]): Promise<CheckoutItem[]> {
  if (!lines.length) return []
  const ids = [...new Set(lines.map(({ productId }) => productId))]
  const products = await db.select().from(catalogProducts).where(inArray(catalogProducts.id, ids))
  const byId = new Map(products.map((product) => [product.id, product]))

  return lines.map(({ productId, quantity, options }) => {
    const product = byId.get(productId)
    if (!product || product.available === false) {
      throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'Có sản phẩm trong giỏ đã hết hàng hoặc không còn bán')
    }
    const colors = product.variants?.colors ?? []
    const sizes = product.variants?.sizes ?? []
    const color = colors.find(({ id }) => id === options?.color)
    if ((colors.length ? !color : options?.color) || (sizes.length ? !sizes.includes(options?.size ?? '') : options?.size)) {
      throw new AppError(400, 'INVALID_VARIANT', 'Vui lòng chọn màu và kích cỡ hợp lệ')
    }
    const image = color?.image ?? product.images[0]
    if (!image) throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'Có sản phẩm trong giỏ đã hết hàng hoặc không còn bán')
    const cleanOptions = options?.color || options?.size ? { color: options.color, size: options.size } : undefined
    return {
      key: lineKey(productId, options),
      productId,
      name: product.name,
      subtitle: [color?.name, options?.size].filter(Boolean).join(' · ') || product.subtitle,
      image,
      priceCents: product.priceCents,
      quantity,
      ...(cleanOptions ? { options: cleanOptions } : {}),
    }
  })
}

export type TotalsCents = { subtotalCents: number; discountCents: number; taxCents: number; shippingCents: number }

/** `shippingCents`: phí ship đã tính (sau FREESHIP); giỏ hàng chưa chọn hình thức giao thì để 0. */
export function computeTotalsCents(items: Pick<CheckoutItem, 'priceCents' | 'quantity'>[], voucher?: string | null, shippingCents = 0): TotalsCents {
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
  const rate = voucher ? VOUCHERS[voucher]?.rate ?? 0 : 0
  const discountCents = Math.round(subtotalCents * rate)
  const taxCents = Math.round((subtotalCents - discountCents) * TAX_RATE)
  return { subtotalCents, discountCents, taxCents, shippingCents }
}

export const totalCents = (t: TotalsCents) => t.subtotalCents - t.discountCents + t.taxCents + t.shippingCents

/** Đổi sang USD cho app (app hiển thị theo USD). */
export function toDollars(t: TotalsCents) {
  return {
    subtotal: t.subtotalCents / 100,
    discount: t.discountCents / 100,
    tax: t.taxCents / 100,
    fees: t.shippingCents / 100,
    total: totalCents(t) / 100,
  }
}

export const serializeItem = ({ priceCents, ...item }: CheckoutItem) => ({ ...item, price: priceCents / 100 })
