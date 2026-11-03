// Data-only public entry point: detail screens can read the catalog without loading listing UI.
export { allProducts, categories, categoryNames, recommendedProducts } from './data/catalog'
export type { CategoryId, Product as CatalogProduct } from './types'
export { emptyFilters } from './types'
export type { ProductFilters, ShippingOption, OtherFilter } from './types'
