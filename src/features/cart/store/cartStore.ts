import { create } from 'zustand'

import type { CartItem, CartTotals } from '../types'

export const TAX_RATE = 0.1

// Mã giảm giá giả lập: code → tỉ lệ giảm trên subtotal.
const VOUCHERS: Record<string, number> = { SALE10: 0.1, FREESHIP: 0 }

type AddItemInput = Omit<CartItem, 'key' | 'quantity'> & { quantity?: number }

type CartState = {
  items: CartItem[]
  voucher: { code: string; rate: number } | null
  addItem: (input: AddItemInput) => void
  setQuantity: (key: string, quantity: number) => void
  removeItem: (key: string) => void
  /** Trả về false nếu mã không hợp lệ. */
  applyVoucher: (code: string) => boolean
  clear: () => void
}

const itemKey = (i: Pick<CartItem, 'productId' | 'options'>) =>
  [i.productId, i.options?.color, i.options?.size].filter(Boolean).join(':')

export const useCartStore = create<CartState>((set) => ({
  items: [],
  voucher: null,

  addItem: ({ quantity = 1, ...input }) => {
    if (!Number.isInteger(quantity) || quantity <= 0) return
    const key = itemKey(input)
    set((s) => {
      const existing = s.items.find((i) => i.key === key)
      if (existing) {
        return { items: s.items.map((i) => (i.key === key ? { ...i, quantity: i.quantity + quantity } : i)) }
      }
      return { items: [...s.items, { ...input, key, quantity }] }
    })
  },

  setQuantity: (key, quantity) => {
    if (!Number.isInteger(quantity)) return
    set((s) => ({
      items: quantity <= 0 ? s.items.filter((i) => i.key !== key) : s.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
    }))
  },

  removeItem: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),

  applyVoucher: (code) => {
    const normalized = code.trim().toUpperCase()
    const rate = VOUCHERS[normalized]
    if (rate === undefined) return false
    set({ voucher: { code: normalized, rate } })
    return true
  },

  clear: () => set({ items: [], voucher: null }),
}))

/** Tính tiền từ state — tách hàm thuần để dễ test và tái dùng ở màn Payment/Success. */
export function computeTotals(items: CartItem[], voucherRate = 0): CartTotals {
  const subtotal = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100
  const discount = Math.round(subtotal * voucherRate * 100) / 100
  const taxable = Math.round((subtotal - discount) * 100) / 100
  const tax = Math.round(taxable * TAX_RATE * 100) / 100
  const fees = 0
  return { subtotal, discount, tax, fees, total: Math.round((taxable + tax + fees) * 100) / 100 }
}
