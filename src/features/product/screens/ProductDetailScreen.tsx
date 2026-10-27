import { Redirect, useLocalSearchParams } from 'expo-router'

import { productApi } from '../api/productApi'
import { StandardProductDetail } from '../components/StandardProductDetail'
import { VariantProductDetail } from '../components/VariantProductDetail'

export function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const product = productApi.getById(id)

  if (!product) return <Redirect href="/" />

  // Sản phẩm có biến thể (màu/size) dùng layout chọn biến thể, còn lại dùng layout chuẩn.
  return product.variants ? (
    <VariantProductDetail product={{ ...product, variants: product.variants }} />
  ) : (
    <StandardProductDetail product={product} />
  )
}
