import type { CartItem, CartTotals } from '@/features/cart'

export type PaymentBrand = 'visa' | 'mastercard' | 'paypal' | 'vietqr'

export type PaymentMethod = {
  id: string
  brand: PaymentBrand
  /** 4 số cuối thẻ, email PayPal, hoặc tên phương thức chuyển khoản. */
  label: string
  kind: 'demo_card' | 'bank_transfer'
}

/** Hướng dẫn chuyển khoản SePay cho đơn đang chờ thanh toán. */
export type PaymentInstructions = {
  provider: 'sepay'
  bank: string
  accountNumber: string
  accountName: string
  amountVnd: number
  /** Nội dung chuyển khoản bắt buộc (mã đơn). */
  content: string
  qrUrl: string
  expiresAt: number | null
  expired: boolean
}

export type OrderStatus = 'pending_payment' | 'completed' | 'cancelled'

export type Order = CartTotals & {
  id: string
  /** Mã ngắn hiển thị (#AB12CD34). */
  code: string
  paymentMethod: PaymentMethod
  status: OrderStatus
  paymentMode: 'demo' | 'verified'
  createdAt: number
  paidAt: number | null
  cancelledAt: number | null
  cancellable: boolean
  items: CartItem[]
  amountVnd: number | null
  payment: PaymentInstructions | null
}

export type OrderPage = { items: Order[]; nextCursor: string | null }
