import { create } from 'zustand'

import { useInboxStore } from '@/features/inbox/store/inboxStore'
import { api } from '@/lib/api'

import type { FulfillmentStatus, Order, PaymentMethod } from '../types'

export const ordersApi = {
  paymentMethods: () => api.get<PaymentMethod[]>('/payment-methods'),
  get: (id: string) => api.get<Order>(`/orders/${encodeURIComponent(id)}`),
  pay: (id: string) => api.post<Order>(`/orders/${encodeURIComponent(id)}/pay`),
  cancel: (id: string) => api.post<Order>(`/orders/${encodeURIComponent(id)}/cancel`),
  /** Chỉ dùng khi demo: chuyển sang bước giao hàng tiếp theo. */
  advance: (id: string) => api.post<Order>(`/orders/${encodeURIComponent(id)}/advance`),
}

/** Tăng khi đơn thay đổi (đặt mới, huỷ, đã thanh toán) để danh sách đơn tải lại. */
const useOrdersVersion = create<{ revision: number }>(() => ({ revision: 0 }))
export const invalidateOrders = () => {
  useOrdersVersion.setState(({ revision }) => ({ revision: revision + 1 }))
  // Server gửi thông báo vào hộp thư khi đơn thay đổi → cập nhật badge.
  void useInboxStore.getState().refreshUnread()
}
export const useOrdersRevision = () => String(useOrdersVersion((s) => s.revision))

export const ORDER_STATUS_LABEL: Record<Order['status'], string> = {
  pending_payment: 'Chờ thanh toán',
  completed: 'Đã xác nhận',
  cancelled: 'Đã huỷ',
}

export const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
}
