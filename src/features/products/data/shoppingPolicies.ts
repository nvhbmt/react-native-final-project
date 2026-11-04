import type { OtherFilter, Product, ShippingOption } from '../types'

// Mock shop policies; replace these alongside the catalog when the API is available.
export function getShoppingPolicy(product: Product) {
  const shippingOptions: ShippingOption[] = product.category === 'fruits'
    ? ['instant', 'express', 'standard']
    : ['express', 'standard']
  const benefits: OtherFilter[] = ['buyer-protection']
  if (product.category !== 'fruits') benefits.push('free-return', 'ship-to-store')
  if (['boots', 'hoodie-shirt', 'phone-purple', 'cherry'].includes(product.id)) benefits.push('best-deal')
  return {
    shippingOptions: product.shippingOptions ?? shippingOptions,
    benefits: product.benefits ?? benefits,
  }
}
