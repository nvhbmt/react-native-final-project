export type CartItem = {
  /** Khoá dòng giỏ hàng = productId + biến thể, để cùng sản phẩm khác size là 2 dòng. */
  key: string
  productId: string
  name: string
  subtitle: string
  image: string | number
  price: number
  quantity: number
  options?: { color?: string; size?: string }
  /** Server đánh dấu false khi sản phẩm đã ngừng bán. */
  available?: boolean
}

export type CartTotals = {
  subtotal: number
  discount: number
  tax: number
  fees: number
  total: number
}

/** Giỏ hàng trả về từ server (`GET /cart`). */
export type CartSnapshot = {
  items: CartItem[]
  voucher: { code: string; rate: number } | null
  totals?: CartTotals
}
