import { createContext, useContext, useState, type PropsWithChildren } from 'react'

import type { Product } from '@/features/products'

type CartItem = { product: Product; quantity: number }
type CartState = {
  items: CartItem[]
  count: number
  addItem: (product: Product) => void
  removeItem: (id: string) => void
}

const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([])

  function addItem(product: Product) {
    setItems((current) => {
      const exists = current.some((item) => item.product.id === product.id)
      return exists
        ? current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { product, quantity: 1 }]
    })
  }

  function removeItem(id: string) {
    setItems((current) => current.flatMap((item) => {
      if (item.product.id !== id) return [item]
      return item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : []
    }))
  }

  return (
    <CartContext.Provider value={{ items, count: items.reduce((sum, item) => sum + item.quantity, 0), addItem, removeItem }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const cart = useContext(CartContext)
  if (!cart) throw new Error('useCart must be used inside CartProvider')
  return cart
}
