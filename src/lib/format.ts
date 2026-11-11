const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

/** 2800 → "$2,800", 2.99 → "$2.99", 0.3 → "$0.30" (số lẻ luôn đủ 2 chữ số thập phân). */
export function formatPrice(value: number): string {
  return Number.isInteger(value) ? usdWhole.format(value) : usdCents.format(value)
}

/** "2334" → "****** 2334" */
export function maskCardNumber(last4: string): string {
  return `****** ${last4}`
}

const vnd = new Intl.NumberFormat('vi-VN')

/** 1250000 → "1.250.000 ₫" */
export function formatVnd(value: number): string {
  return `${vnd.format(value)} ₫`
}
