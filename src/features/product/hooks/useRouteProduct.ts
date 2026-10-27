import { useLocalSearchParams } from 'expo-router'

import { productApi } from '../api/productApi'

/** Sản phẩm theo param `[id]` của route hiện tại (undefined nếu không tồn tại). */
export function useRouteProduct() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return productApi.getById(id)
}
