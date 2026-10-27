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

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=300&q=75&auto=format&fit=crop`

// Giỏ hàng mẫu khớp màn Checkout trong design.
const SEED_ITEMS: CartItem[] = [
  { productId: 'headphone-classic', name: 'Headphone', subtitle: 'Consequat ex eu', image: img('1583394838336-acd977736f90'), price: 500, quantity: 1 },
  { productId: 'headphone-gold', name: 'Headphone', subtitle: 'Consequat ex eu', image: img('1505740420928-5e560c06d30e'), price: 300, quantity: 1 },
  { productId: 'smartphone-x', name: 'Smartphone', subtitle: 'Consequat ex eu', image: img('1511707171634-5f897ff02aa9'), price: 1000, quantity: 1 },
  { productId: 'smartphone-mini', name: 'Smartphone', subtitle: 'Consequat ex eu', image: img('1592899677977-9c10ca588bbd'), price: 1000, quantity: 1 },
].map((i) => ({ ...i, key: itemKey(i) }))

export const useCartStore = create<CartState>((set, get) => ({
  items: SEED_ITEMS,
  voucher: null,

  addItem: ({ quantity = 1, ...input }) => {
    const key = itemKey(input)
    set((s) => {
      const existing = s.items.find((i) => i.key === key)
      if (existing) {
        return { items: s.items.map((i) => (i.key === key ? { ...i, quantity: i.quantity + quantity } : i)) }
      }
      return { items: [...s.items, { ...input, key, quantity }] }
    })
  },

  setQuantity: (key, quantity) =>
    set((s) => ({
      items: quantity <= 0 ? s.items.filter((i) => i.key !== key) : s.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
    })),

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
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const discount = Math.round(subtotal * voucherRate * 100) / 100
  const taxable = subtotal - discount
  const tax = Math.round(taxable * TAX_RATE * 100) / 100
  const fees = 0
  return { subtotal, discount, tax, fees, total: taxable + tax + fees }
}

