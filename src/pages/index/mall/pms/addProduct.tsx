import ProductDetail from './ProductDetail'

/** 添加商品页面 — 复用 ProductDetail 组件 */
export default function AddProduct() {
  return <ProductDetail isEdit={false} />
}
