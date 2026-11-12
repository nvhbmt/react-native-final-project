import { ProductStatus } from '../components/ProductStatus'
import { StandardProductDetail } from '../components/StandardProductDetail'
import { VariantProductDetail } from '../components/VariantProductDetail'
import { useRouteProduct } from '../hooks/useRouteProduct'

export function ProductDetailScreen() {
  const { product, ...request } = useRouteProduct()

  if (!product) return <ProductStatus title="Sản phẩm" {...request} />

  // Sản phẩm có biến thể (màu/size) dùng layout chọn biến thể, còn lại dùng layout chuẩn.
  return product.variants && (product.variants.colors.length || product.variants.sizes.length) ? (
    <VariantProductDetail key={product.id} product={{ ...product, variants: product.variants }} />
  ) : (
    <StandardProductDetail key={product.id} product={product} />
  )
}
