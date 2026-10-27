import type { CartTotals } from '@/features/cart'

export type PaymentBrand = 'visa' | 'mastercard' | 'paypal'

export type PaymentMethod = {
  id: string
  brand: PaymentBrand
  /** 4 số cuối thẻ, hoặc email với PayPal. */
  label: string
}

export type Order = CartTotals & {
  id: string
  paymentMethod: PaymentMethod
  status: 'success'
  createdAt: number
}
