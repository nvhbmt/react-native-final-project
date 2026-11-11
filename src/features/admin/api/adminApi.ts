import type { FulfillmentStatus, Order } from '@/features/checkout/types'
import { api } from '@/lib/api'

/** Đơn trong trang quản trị: kèm khách đặt và bước giao hàng kế tiếp (null = không chuyển được). */
export type AdminOrder = Order & {
  customer: { id: string; fullName: string; email: string } | null
  nextFulfillment: Exclude<FulfillmentStatus, 'processing'> | null
  fulfillmentUpdatedBy: string | null
}

export type AdminOrderPage = { items: AdminOrder[]; nextCursor: string | null }

export const adminApi = {
  /** `to` phải đúng bước kế tiếp; server trả 409 ORDER_CHANGED nếu đơn vừa được người khác cập nhật. */
  moveFulfillment: (id: string, to: 'shipping' | 'delivered') =>
    api.post<AdminOrder>(`/admin/orders/${encodeURIComponent(id)}/fulfillment`, { to }),
  /** Gửi tin vào Hộp thư của khách đã bật nhận khuyến mãi; trả số người nhận. */
  sendPromotion: (input: { title: string; body: string; productId?: string }) =>
    api.post<{ sent: number }>('/admin/promotions', input),
}

export const adminOrdersPath = (fulfillment: FulfillmentStatus | 'all') =>
  `/admin/orders?limit=20${fulfillment === 'all' ? '' : `&fulfillment=${fulfillment}`}`
