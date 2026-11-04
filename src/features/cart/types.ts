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
}

export type CartTotals = {
  subtotal: number
  discount: number
  tax: number
  fees: number
  total: number
}
