import { create } from 'zustand'

import type { CartItem, CartTotals } from '@/features/cart'

import type { Order, PaymentMethod } from '../types'

type OrderState = {
  lastOrder: Order | null
  /** Giả lập gọi API đặt hàng; thay bằng request thật khi có backend. */
  placeOrder: (items: CartItem[], totals: CartTotals, paymentMethod: PaymentMethod) => Order
}

export const useOrderStore = create<OrderState>((set) => ({
  lastOrder: null,
  placeOrder: (items, totals, paymentMethod) => {
    const order: Order = {
      ...totals,
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      paymentMethod,
      status: 'success',
      createdAt: Date.now(),
      items: items.map((item) => ({ ...item, options: item.options ? { ...item.options } : undefined })),
    }
    set({ lastOrder: order })
    return order
  },
}))
