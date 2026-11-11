import { create } from 'zustand'

import type { CartItem, CartSnapshot, CartTotals } from '../types'

export const TAX_RATE = 0.1

// Mã giảm giá cho giỏ của khách (khớp server: `server/src/modules/commerce/pricing.ts`).
// Đã đăng nhập thì server kiểm tra mã.
const GUEST_VOUCHERS: Record<string, number> = { SALE10: 0.1, FREESHIP: 0 }

type AddItemInput = Omit<CartItem, 'key' | 'quantity'> & { quantity?: number }

/**
 * Nơi lưu giỏ khi đã đăng nhập (server). Mỗi thao tác trả về giỏ server để thay state local.
 * Đăng ký bởi `cartSync.ts`; file này không import API để test được bằng `node --test`.
 */
export type CartRemote = {
  add: (line: Pick<CartItem, 'productId' | 'quantity' | 'options'>) => Promise<CartSnapshot>
  setQuantity: (key: string, quantity: number) => Promise<CartSnapshot>
  remove: (key: string) => Promise<CartSnapshot>
  applyVoucher: (code: string) => Promise<CartSnapshot>
  clear: () => Promise<CartSnapshot>
}

type CartState = {
  items: CartItem[]
  voucher: { code: string; rate: number } | null
  /** Lỗi đồng bộ gần nhất (vd. sản phẩm hết hàng) để UI hiển thị. */
  syncError: string | null
  addItem: (input: AddItemInput) => void
  setQuantity: (key: string, quantity: number) => void
  removeItem: (key: string) => void
  /** Trả về false nếu mã không hợp lệ. */
  applyVoucher: (code: string) => Promise<boolean>
  clear: () => void
  /** Thay toàn bộ giỏ bằng dữ liệu server. */
  replace: (snapshot: CartSnapshot) => void
}

let remote: CartRemote | null = null
/** Lấy lại giỏ server khi một thao tác lỗi (state local có thể đã lệch). */
let resync: (() => Promise<void>) | null = null

export function setCartRemote(next: CartRemote | null, reload: (() => Promise<void>) | null = null) {
  remote = next
  resync = reload
}

export const itemKey = (i: Pick<CartItem, 'productId' | 'options'>) =>
  [i.productId, i.options?.color, i.options?.size].filter(Boolean).join(':')

export const useCartStore = create<CartState>((set, get) => {
  /** Cập nhật local ngay (optimistic), rồi đồng bộ server nếu đã đăng nhập. */
  function sync(request: (() => Promise<CartSnapshot>) | undefined) {
    if (!remote || !request) return
    request().then(
      (snapshot) => get().replace(snapshot),
      (error: Error) => {
        set({ syncError: error?.message || 'Không đồng bộ được giỏ hàng' })
        void resync?.()
      },
    )
  }

  return {
    items: [],
    voucher: null,
    syncError: null,

    addItem: ({ quantity = 1, ...input }) => {
      if (!Number.isInteger(quantity) || quantity <= 0) return
      const key = itemKey(input)
      set((s) => {
        const existing = s.items.find((i) => i.key === key)
        if (existing) {
          return { syncError: null, items: s.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i)) }
        }
        return { syncError: null, items: [...s.items, { ...input, key, quantity: Math.min(99, quantity) }] }
      })
      sync(() => remote!.add({ productId: input.productId, quantity, options: input.options }))
    },

    setQuantity: (key, quantity) => {
      if (!Number.isInteger(quantity)) return
      const next = Math.min(99, quantity)
      set((s) => ({
        syncError: null,
        items: next <= 0 ? s.items.filter((i) => i.key !== key) : s.items.map((i) => (i.key === key ? { ...i, quantity: next } : i)),
      }))
      sync(() => (next <= 0 ? remote!.remove(key) : remote!.setQuantity(key, next)))
    },

    removeItem: (key) => {
      set((s) => ({ syncError: null, items: s.items.filter((i) => i.key !== key) }))
      sync(() => remote!.remove(key))
    },

    applyVoucher: async (code) => {
      const normalized = code.trim().toUpperCase()
      if (remote) {
        try {
          get().replace(await remote.applyVoucher(normalized))
          return true
        } catch {
          return false
        }
      }
      const rate = GUEST_VOUCHERS[normalized]
      if (rate === undefined) return false
      set({ voucher: { code: normalized, rate } })
      return true
    },

    clear: () => {
      set({ items: [], voucher: null, syncError: null })
      sync(() => remote!.clear())
    },

    replace: ({ items, voucher }) =>
      set({ items: items.filter((item) => item.available !== false), voucher, syncError: null }),
  }
})

/** Tính tiền từ state — tách hàm thuần để dễ test và tái dùng ở màn Payment/Success. */
export function computeTotals(items: CartItem[], voucherRate = 0): CartTotals {
  const subtotal = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100
  const discount = Math.round(subtotal * voucherRate * 100) / 100
  const taxable = Math.round((subtotal - discount) * 100) / 100
  const tax = Math.round(taxable * TAX_RATE * 100) / 100
  const fees = 0
  return { subtotal, discount, tax, fees, total: Math.round((taxable + tax + fees) * 100) / 100 }
}
