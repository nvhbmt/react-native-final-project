import { Redirect } from 'expo-router'

import { StandardProductDetail } from '../components/StandardProductDetail'
import { VariantProductDetail } from '../components/VariantProductDetail'
import { useRouteProduct } from '../hooks/useRouteProduct'

export function ProductDetailScreen() {
  const product = useRouteProduct()

  if (!product) return <Redirect href="/" />

  // Sản phẩm có biến thể (màu/size) dùng layout chọn biến thể, còn lại dùng layout chuẩn.
  return product.variants ? (
    <VariantProductDetail product={{ ...product, variants: product.variants }} />
  ) : (
    <StandardProductDetail product={product} />
  )
}
