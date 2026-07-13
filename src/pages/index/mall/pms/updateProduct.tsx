import { useSearchParams } from 'react-router-dom'
import ProductDetail from './ProductDetail'

// 修改商品页面，复用 ProductDetail 组件
export default function UpdateProduct() {
  const [searchParams] = useSearchParams()
  const productId = searchParams.get('id')

  return <ProductDetail isEdit={true} productId={productId} />
}
