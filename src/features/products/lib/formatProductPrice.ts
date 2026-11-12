import { formatPrice } from '@/lib/format'

import type { Product } from '../types'

export function formatProductPrice({ price, priceBasis, priceUnit }: Pick<Product, 'price' | 'priceBasis' | 'priceUnit'>) {
  return `${priceBasis === 'from' ? 'Từ ' : ''}${formatPrice(price)}${priceUnit === 'lb' ? '/lb' : ''}`
}
