import { useLocalSearchParams } from 'expo-router'

import { useCatalogRequest } from '@/features/products/hooks/useCatalogRequest'

import { productPath } from '../api/productApi'
import type { ProductDetail } from '../types'

export function useRouteProduct() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const request = useCatalogRequest<ProductDetail>(id ? productPath(id) : undefined)
  return { ...request, product: request.data }
}
