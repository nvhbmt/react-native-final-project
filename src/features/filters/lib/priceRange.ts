export const MAX_PRICE = 10000

export function cleanPrice(text: string) {
  const [whole, ...fraction] = text.replace(/,/g, '.').replace(/[^0-9.]/g, '').split('.')
  return fraction.length ? `${whole}.${fraction.join('').slice(0, 2)}` : whole
}

export function normalizePriceRange(minimumPrice: string, maximumPrice: string) {
  const min = Math.min(MAX_PRICE, Math.max(0, Number(minimumPrice) || 0))
  const max = maximumPrice === '' ? MAX_PRICE : Math.min(MAX_PRICE, Math.max(0, Number(maximumPrice) || 0))
  return {
    minimumPrice: minimumPrice === '' ? '' : String(Math.min(min, max)),
    maximumPrice: maximumPrice === '' ? '' : String(Math.max(min, max)),
  }
}
