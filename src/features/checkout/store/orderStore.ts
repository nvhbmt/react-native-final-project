import { create } from 'zustand'

import type { CartTotals } from '@/features/cart'

import type { Order, PaymentMethod } from '../types'

type OrderState = {
  lastOrder: Order | null
  /** Giả lập gọi API đặt hàng; thay bằng request thật khi có backend. */
  placeOrder: (totals: CartTotals, paymentMethod: PaymentMethod) => Order
}

export const useOrderStore = create<OrderState>((set) => ({
  lastOrder: null,
  placeOrder: (totals, paymentMethod) => {
    const order: Order = {
      ...totals,
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      paymentMethod,
      status: 'success',
      createdAt: Date.now(),
    }
    set({ lastOrder: order })
    return order
  },
}))
