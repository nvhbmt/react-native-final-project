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
  /** SePay giả lập ở máy dev: không chuyển tiền thật vào tài khoản trong QR. */
  simulated: boolean
}

export type OrderStatus = 'pending_payment' | 'completed' | 'cancelled'

/** Tiến độ giao hàng của đơn đã thanh toán. */
export type FulfillmentStatus = 'processing' | 'shipping' | 'delivered'

export type ShippingMethodId = 'standard' | 'express' | 'instant'

/** Hình thức giao lưu trong đơn. */
export type ShippingMethod = { id: ShippingMethodId; label: string; eta: string }

/** Lựa chọn giao hàng khả dụng cho giỏ hiện tại (`GET /shipping-methods`), `fee` là phí gốc USD. */
export type ShippingOptionQuote = ShippingMethod & { fee: number }

/** Bản chụp địa chỉ giao hàng lưu trong đơn (không đổi khi sửa sổ địa chỉ). */
export type ShippingAddress = {
  recipientName: string
  phone: string
  line1: string
  city: string
}

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
  /** Null khi đơn chưa thanh toán hoặc đã huỷ. */
  fulfillment: FulfillmentStatus | null
  shippedAt: number | null
  deliveredAt: number | null
  /** Server bật demo và đơn còn bước giao hàng tiếp theo. */
  advanceable: boolean
  cancellable: boolean
  items: CartItem[]
  /** Null với đơn tạo trước khi có bước chọn địa chỉ. */
  shippingAddress: ShippingAddress | null
  /** Null với đơn tạo trước khi có phí ship. */
  shippingMethod: ShippingMethod | null
  amountVnd: number | null
  payment: PaymentInstructions | null
}

export type OrderPage = { items: Order[]; nextCursor: string | null }
