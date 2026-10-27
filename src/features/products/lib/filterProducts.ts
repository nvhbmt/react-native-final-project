import type { Product, ProductFilters, SortOrder } from '../types'

export function filterProducts(products: Product[], query: string, filters: ProductFilters, sort: SortOrder = 'sales') {
  const search = query.trim().toLowerCase()
  const minimum = Number(filters.minimumPrice) || 0
  const maximum = filters.maximumPrice.trim() === '' ? Infinity : Number(filters.maximumPrice)
  const filtered = products.filter((product) =>
    `${product.name} ${product.keywords ?? ''}`.toLowerCase().includes(search) &&
    product.price >= minimum && product.price <= maximum && product.rating >= filters.minimumRating,
  )

  return filtered.sort((a, b) => {
    if (sort === 'popular') return b.rating - a.rating || b.sales - a.sales
    if (sort === 'matched' && search) return Number(b.name.toLowerCase().startsWith(search)) - Number(a.name.toLowerCase().startsWith(search))
    return b.sales - a.sales
  })
}
