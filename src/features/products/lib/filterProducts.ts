import type { Product, ProductFilters, SortOrder } from '../types'
import { getShoppingPolicy } from '../data/shoppingPolicies'

export function filterProducts(products: Product[], query: string, filters: ProductFilters, sort: SortOrder = 'sales') {
  const search = query.trim().toLowerCase()
  const minimum = Math.max(0, Number(filters.minimumPrice) || 0)
  const maximum = filters.maximumPrice.trim() === '' ? Infinity : Number(filters.maximumPrice)
  const filtered = products.filter((product) => {
    const policy = getShoppingPolicy(product)
    return `${product.name} ${product.keywords ?? ''}`.toLowerCase().includes(search) &&
      product.price >= minimum && product.price <= maximum && product.rating >= filters.minimumRating &&
      (!filters.shippingOptions?.length || filters.shippingOptions.some((option) => policy.shippingOptions.includes(option))) &&
      (!filters.others?.length || filters.others.every((benefit) => policy.benefits.includes(benefit)))
  })

  return filtered.sort((a, b) => {
    if (sort === 'popular') return b.rating - a.rating || b.sales - a.sales
    if (sort === 'matched' && search) return Number(b.name.toLowerCase().startsWith(search)) - Number(a.name.toLowerCase().startsWith(search))
    return b.sales - a.sales
  })
}
