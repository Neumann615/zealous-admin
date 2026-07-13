import type {
  PmsMemberPrice,
  PmsProductFullReduction,
  PmsProductLadder,
  PmsProductParam,
} from '@/types/product'
import type { PmsProductAttributeCategory } from '@/types/productAttr'
import {
  App,
  Button,
  Cascader,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Steps,
  Switch,
  Table,
} from 'antd'
import { createStyles } from 'antd-style'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getBrandListAPI } from '@/apis/brand'
import { getMemberLevelListAPI } from '@/apis/memberLevel'
import {
  getPruductUpdateInfoAPI,
  productCreateAPI,
  productUpdateByIdAPI,
} from '@/apis/product'
import { getProductAttributeCategoryListAPI } from '@/apis/productAttrCate'
import { getProductCategoryListWithChildrenAPI } from '@/apis/productCate'
import { useAppMessage } from '@/hooks/useAppMessage'

const { TextArea } = Input
const { Option } = Select

const useStyles = createStyles(({ token, css }) => ({
  container: css`
    padding: ${token.paddingLG}px;
    background: ${token.colorBgContainer};
    min-height: 100%;
  `,
}))

interface ProductDetailProps {
  isEdit?: boolean
  productId?: string | null
}

/** 添加/编辑商品 — 四步表单（共享组件，非路由） */
export default function ProductDetail({
  isEdit = false,
  productId: editProductId,
}: ProductDetailProps) {
  const { message, modal } = useAppMessage()
  const { styles } = useStyles()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pid = editProductId || searchParams.get('id')

  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  // ========== 表单数据 ==========
  const [product, setProduct] = useState<PmsProductParam>({
    albumPics: '',
    brandName: '',
    deleteStatus: 0,
    description: '',
    detailDesc: '',
    detailHtml: '',
    detailMobileHtml: '',
    detailTitle: '',
    feightTemplateId: 0,
    flashPromotionCount: 0,
    flashPromotionId: 0,
    flashPromotionPrice: 0,
    flashPromotionSort: 0,
    giftPoint: 0,
    giftGrowth: 0,
    keywords: '',
    lowStock: 0,
    name: '',
    newStatus: 0,
    note: '',
    originalPrice: 0,
    pic: '',
    memberPriceList: [],
    productFullReductionList: [{ fullPrice: 0, reducePrice: 0 }],
    productLadderList: [{ count: 0, discount: 0, price: 0 }],
    previewStatus: 0,
    price: 0,
    productAttributeValueList: [],
    skuStockList: [],
    subjectProductRelationList: [],
    prefrenceAreaProductRelationList: [],
    productCategoryName: '',
    productSn: '',
    promotionEndTime: '',
    promotionPerLimit: 0,
    promotionStartTime: '',
    promotionType: 0,
    publishStatus: 0,
    recommandStatus: 0,
    sale: 0,
    serviceIds: '',
    sort: 0,
    stock: 0,
    subTitle: '',
    unit: '',
    usePointLimit: 0,
    verifyStatus: 0,
    weight: 0,
  })

  // ========== 下拉选项 ==========
  const [brandOptions, setBrandOptions] = useState<
    { label: string, value: number }[]
  >([])
  const [cateOptions, setCateOptions] = useState<any[]>([])
  const [attrCateOptions, setAttrCateOptions] = useState<
    { label: string, value: number }[]
  >([])
  const [memberLevelOptions, setMemberLevelOptions] = useState<
    { id: number, name: string }[]
  >([])

  // ========== 级联分类选中值 ==========
  const [cateValue, setCateValue] = useState<number[]>([])

  // ========== 初始化 ==========
  useEffect(() => {
    loadOptions()
    if (isEdit && pid) {
      loadProductDetail(Number(pid))
    }
  }, [])

  const loadOptions = async () => {
    try {
      const [brandRes, cateRes, attrCateRes, memberRes] = await Promise.all([
        getBrandListAPI({ pageNum: 1, pageSize: 100 }),
        getProductCategoryListWithChildrenAPI(),
        getProductAttributeCategoryListAPI({ pageNum: 1, pageSize: 100 }),
        getMemberLevelListAPI({ defaultStatus: 0 }),
      ])
      setBrandOptions(
        brandRes.data.list.map((item: any) => ({
          label: item.name,
          value: item.id!,
        })),
      )
      setCateOptions(
        cateRes.data.map((item: any) => ({
          label: item.name,
          value: item.id!,
          children: item.children?.map((it: any) => ({
            label: it.name,
            value: it.id!,
          })),
        })),
      )
      setAttrCateOptions(
        attrCateRes.data.list.map((item: any) => ({
          label: item.name,
          value: item.id!,
        })),
      )
      setMemberLevelOptions(
        memberRes.data.map((item: any) => ({ id: item.id, name: item.name })),
      )
    }
    catch (e) {
      console.error('加载选项失败:', e)
    }
  }

  const loadProductDetail = async (id: number) => {
    setLoading(true)
    try {
      const res = await getPruductUpdateInfoAPI(id)
      const data = res.data
      setProduct(data)
      // 回填级联分类
      if (data.productCategoryId && data.cateParentId) {
        setCateValue([data.cateParentId, data.productCategoryId])
      }
      // 确保列表不为空
      if (!data.productLadderList?.length)
        data.productLadderList = [{ count: 0, discount: 0, price: 0 }]
      if (!data.productFullReductionList?.length)
        data.productFullReductionList = [{ fullPrice: 0, reducePrice: 0 }]
      if (!data.memberPriceList?.length) {
        data.memberPriceList = memberLevelOptions.map(l => ({
          memberLevelId: l.id,
          memberLevelName: l.name,
          memberPrice: 0,
        }))
      }
    }
    catch (e) {
      console.error('加载商品详情失败:', e)
    }
    finally {
      setLoading(false)
    }
  }

  // ========== 字段更新 ==========
  const updateField = <K extends keyof PmsProductParam>(
    key: K,
    value: PmsProductParam[K],
  ) => {
    setProduct(prev => ({ ...prev, [key]: value }))
  }

  // ========== 分类级联 ==========
  const handleCateChange = (val: number[]) => {
    setCateValue(val)
    if (val && val.length === 2) {
      updateField('productCategoryId', val[1])
      updateField('cateParentId', val[0])
      const parent = cateOptions.find(c => c.value === val[0])
      const child = parent?.children?.find((c: any) => c.value === val[1])
      updateField('productCategoryName', child?.label || '')
    }
  }

  // ========== 品牌变更 ==========
  const handleBrandChange = (val: number) => {
    updateField('brandId', val)
    const b = brandOptions.find(item => item.value === val)
    updateField('brandName', b?.label || '')
  }

  // ========== 促销信息 ==========
  const handleAddLadder = () => {
    const list = product.productLadderList || []
    if (list.length >= 3) {
      message.warning('最多添加三条')
      return
    }
    updateField('productLadderList', [
      ...list,
      { count: 0, discount: 0, price: 0 },
    ])
  }
  const handleRemoveLadder = (idx: number) => {
    const list = [...(product.productLadderList || [])]
    list.splice(idx, 1)
    updateField(
      'productLadderList',
      list.length ? list : [{ count: 0, discount: 0, price: 0 }],
    )
  }

  const handleAddFullReduction = () => {
    const list = product.productFullReductionList || []
    if (list.length >= 3) {
      message.warning('最多添加三条')
      return
    }
    updateField('productFullReductionList', [
      ...list,
      { fullPrice: 0, reducePrice: 0 },
    ])
  }
  const handleRemoveFullReduction = (idx: number) => {
    const list = [...(product.productFullReductionList || [])]
    list.splice(idx, 1)
    updateField(
      'productFullReductionList',
      list.length ? list : [{ fullPrice: 0, reducePrice: 0 }],
    )
  }

  // ========== 步骤导航 ==========
  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 3))
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  // ========== 提交 ==========
  const handleSubmit = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要提交该商品？',
      onOk: async () => {
        setLoading(true)
        try {
          if (isEdit && pid) {
            await productUpdateByIdAPI(Number(pid), product)
          }
          else {
            await productCreateAPI(product)
          }
          message.success('提交成功')
          navigate(-1)
        }
        catch (e) {
          console.error('提交失败:', e)
        }
        finally {
          setLoading(false)
        }
      },
    })
  }

  // ========== 步骤渲染 ==========
  const renderStep1 = () => (
    <Form layout="vertical" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Form.Item label="商品分类：" required>
        <Cascader
          value={cateValue}
          options={cateOptions}
          onChange={handleCateChange as any}
          placeholder="请选择分类"
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Form.Item label="商品名称：" required>
        <Input
          value={product.name}
          onChange={e => updateField('name', e.target.value)}
          placeholder="商品名称"
        />
      </Form.Item>
      <Form.Item label="副标题：">
        <Input
          value={product.subTitle}
          onChange={e => updateField('subTitle', e.target.value)}
          placeholder="副标题"
        />
      </Form.Item>
      <Form.Item label="商品品牌：">
        <Select
          value={product.brandId}
          onChange={handleBrandChange}
          placeholder="请选择品牌"
          allowClear
          style={{ width: '100%' }}
        >
          {brandOptions.map(b => (
            <Option key={b.value} value={b.value}>
              {b.label}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label="商品介绍：">
        <TextArea
          value={product.description}
          onChange={e => updateField('description', e.target.value)}
          rows={3}
          placeholder="商品介绍"
        />
      </Form.Item>
      <Form.Item label="商品货号：">
        <Input
          value={product.productSn}
          onChange={e => updateField('productSn', e.target.value)}
          placeholder="货号"
        />
      </Form.Item>
      <Form.Item label="商品售价：">
        <InputNumber
          value={product.price}
          onChange={v => updateField('price', v || 0)}
          style={{ width: '100%' }}
          min={0}
        />
      </Form.Item>
      <Form.Item label="市场价：">
        <InputNumber
          value={product.originalPrice}
          onChange={v => updateField('originalPrice', v || 0)}
          style={{ width: '100%' }}
          min={0}
        />
      </Form.Item>
      <Form.Item label="商品库存：">
        <InputNumber
          value={product.stock}
          onChange={v => updateField('stock', v || 0)}
          style={{ width: '100%' }}
          min={0}
        />
      </Form.Item>
      <Form.Item label="计量单位：">
        <Input
          value={product.unit}
          onChange={e => updateField('unit', e.target.value)}
          placeholder="如：件、个"
        />
      </Form.Item>
      <Form.Item label="商品重量（克）：">
        <InputNumber
          value={product.weight}
          onChange={v => updateField('weight', v || 0)}
          style={{ width: '100%' }}
          min={0}
        />
      </Form.Item>
      <Form.Item label="排序：">
        <InputNumber
          value={product.sort}
          onChange={v => updateField('sort', v || 0)}
          style={{ width: '100%' }}
          min={0}
        />
      </Form.Item>
      <div style={{ textAlign: 'center' }}>
        <Button type="primary" onClick={handleNext}>
          下一步，填写商品促销
        </Button>
      </div>
    </Form>
  )

  const renderStep2 = () => (
    <Form layout="vertical" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Form.Item label="赠送积分：">
        <InputNumber
          value={product.giftPoint}
          onChange={v => updateField('giftPoint', v || 0)}
          style={{ width: '100%' }}
          min={0}
        />
      </Form.Item>
      <Form.Item label="赠送成长值：">
        <InputNumber
          value={product.giftGrowth}
          onChange={v => updateField('giftGrowth', v || 0)}
          style={{ width: '100%' }}
          min={0}
        />
      </Form.Item>
      <Form.Item label="积分购买限制：">
        <InputNumber
          value={product.usePointLimit}
          onChange={v => updateField('usePointLimit', v || 0)}
          style={{ width: '100%' }}
          min={0}
        />
      </Form.Item>
      <Form.Item label="预告商品：">
        <Switch
          checked={product.previewStatus === 1}
          onChange={v => updateField('previewStatus', v ? 1 : 0)}
          checkedChildren="是"
          unCheckedChildren="否"
        />
      </Form.Item>
      <Form.Item label="商品上架：">
        <Switch
          checked={product.publishStatus === 1}
          onChange={v => updateField('publishStatus', v ? 1 : 0)}
          checkedChildren="上架"
          unCheckedChildren="下架"
        />
      </Form.Item>
      <Form.Item label="商品推荐：">
        <span style={{ marginRight: 8 }}>新品</span>
        <Switch
          checked={product.newStatus === 1}
          onChange={v => updateField('newStatus', v ? 1 : 0)}
          size="small"
        />
        <span style={{ margin: '0 8px' }}>推荐</span>
        <Switch
          checked={product.recommandStatus === 1}
          onChange={v => updateField('recommandStatus', v ? 1 : 0)}
          size="small"
        />
      </Form.Item>
      <Form.Item label="服务保证：">
        <Select
          mode="multiple"
          value={
            product.serviceIds ? product.serviceIds.split(',').map(Number) : []
          }
          onChange={vals =>
            updateField('serviceIds', (vals as number[]).join(','))}
          placeholder="请选择"
          style={{ width: '100%' }}
        >
          <Option value={1}>无忧退货</Option>
          <Option value={2}>快速退款</Option>
          <Option value={3}>免费包邮</Option>
        </Select>
      </Form.Item>
      <Form.Item label="详细页标题：">
        <Input
          value={product.detailTitle}
          onChange={e => updateField('detailTitle', e.target.value)}
        />
      </Form.Item>
      <Form.Item label="详细页描述：">
        <Input
          value={product.detailDesc}
          onChange={e => updateField('detailDesc', e.target.value)}
        />
      </Form.Item>
      <Form.Item label="商品关键字：">
        <Input
          value={product.keywords}
          onChange={e => updateField('keywords', e.target.value)}
        />
      </Form.Item>
      <Form.Item label="商品备注：">
        <TextArea
          value={product.note}
          onChange={e => updateField('note', e.target.value)}
          rows={3}
        />
      </Form.Item>
      <Form.Item label="优惠方式：">
        <Radio.Group
          value={product.promotionType}
          onChange={e => updateField('promotionType', e.target.value)}
        >
          <Radio.Button value={0}>无优惠</Radio.Button>
          <Radio.Button value={1}>特惠促销</Radio.Button>
          <Radio.Button value={2}>会员价格</Radio.Button>
          <Radio.Button value={3}>阶梯价格</Radio.Button>
          <Radio.Button value={4}>满减价格</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {/* 特惠促销 */}
      {product.promotionType === 1 && (
        <>
          <Form.Item label="促销价格：">
            <InputNumber
              value={product.promotionPrice || 0}
              onChange={v => updateField('promotionPrice', v || 0)}
              style={{ width: 220 }}
              min={0}
            />
          </Form.Item>
          <Form.Item label="促销开始时间：">
            <DatePicker
              showTime
              value={
                product.promotionStartTime
                  ? dayjs(product.promotionStartTime)
                  : null
              }
              onChange={d =>
                updateField(
                  'promotionStartTime',
                  d?.format('YYYY-MM-DD HH:mm:ss') || '',
                )}
            />
          </Form.Item>
          <Form.Item label="促销结束时间：">
            <DatePicker
              showTime
              value={
                product.promotionEndTime
                  ? dayjs(product.promotionEndTime)
                  : null
              }
              onChange={d =>
                updateField(
                  'promotionEndTime',
                  d?.format('YYYY-MM-DD HH:mm:ss') || '',
                )}
            />
          </Form.Item>
          <Form.Item label="限购数量：">
            <InputNumber
              value={product.promotionPerLimit}
              onChange={v => updateField('promotionPerLimit', v || 0)}
              style={{ width: 220 }}
              min={0}
            />
          </Form.Item>
        </>
      )}

      {/* 会员价格 */}
      {product.promotionType === 2 && (
        <Form.Item label="会员价格：">
          {memberLevelOptions.map(level => (
            <div key={level.id} style={{ marginBottom: 8 }}>
              <span style={{ display: 'inline-block', width: 120 }}>
                {level.name}
                ：
              </span>
              <InputNumber
                value={
                  product.memberPriceList?.find(
                    m => m.memberLevelId === level.id,
                  )?.memberPrice || 0
                }
                onChange={(v) => {
                  const list = [...(product.memberPriceList || [])]
                  const idx = list.findIndex(
                    m => m.memberLevelId === level.id,
                  )
                  if (idx >= 0) {
                    list[idx] = { ...list[idx], memberPrice: v || 0 }
                  }
                  else {
                    list.push({
                      memberLevelId: level.id,
                      memberLevelName: level.name,
                      memberPrice: v || 0,
                    })
                  }
                  updateField('memberPriceList', list)
                }}
                style={{ width: 200 }}
                min={0}
              />
            </div>
          ))}
        </Form.Item>
      )}

      {/* 阶梯价格 */}
      {product.promotionType === 3 && (
        <Form.Item label="阶梯价格：">
          <Table
            dataSource={product.productLadderList}
            rowKey={(_, idx) => String(idx)}
            pagination={false}
            bordered
            size="small"
            style={{ maxWidth: 600 }}
          >
            <Table.Column
              title="数量"
              dataIndex="count"
              key="count"
              render={(v: number, _: PmsProductLadder, idx: number) => (
                <InputNumber
                  value={v}
                  min={0}
                  onChange={(val) => {
                    const list = [...(product.productLadderList || [])]
                    list[idx] = { ...list[idx], count: val || 0 }
                    updateField('productLadderList', list)
                  }}
                />
              )}
            />
            <Table.Column
              title="折扣"
              dataIndex="discount"
              key="discount"
              render={(v: number, _: PmsProductLadder, idx: number) => (
                <InputNumber
                  value={v}
                  min={0}
                  max={10}
                  onChange={(val) => {
                    const list = [...(product.productLadderList || [])]
                    list[idx] = { ...list[idx], discount: val || 0 }
                    updateField('productLadderList', list)
                  }}
                />
              )}
            />
            <Table.Column
              title="折后价格"
              dataIndex="price"
              key="price"
              render={(v: number, _: PmsProductLadder, idx: number) => (
                <InputNumber
                  value={v}
                  min={0}
                  onChange={(val) => {
                    const list = [...(product.productLadderList || [])]
                    list[idx] = { ...list[idx], price: val || 0 }
                    updateField('productLadderList', list)
                  }}
                />
              )}
            />
            <Table.Column
              title="操作"
              key="actions"
              width={120}
              render={(_: any, __: PmsProductLadder, idx: number) => (
                <>
                  <Button type="link" onClick={() => handleRemoveLadder(idx)}>
                    删除
                  </Button>
                  <Button type="link" onClick={handleAddLadder}>
                    添加
                  </Button>
                </>
              )}
            />
          </Table>
        </Form.Item>
      )}

      {/* 满减价格 */}
      {product.promotionType === 4 && (
        <Form.Item label="满减价格：">
          <Table
            dataSource={product.productFullReductionList}
            rowKey={(_, idx) => String(idx)}
            pagination={false}
            bordered
            size="small"
            style={{ maxWidth: 600 }}
          >
            <Table.Column
              title="满"
              dataIndex="fullPrice"
              key="fullPrice"
              render={(v: number, _: PmsProductFullReduction, idx: number) => (
                <InputNumber
                  value={v}
                  min={0}
                  onChange={(val) => {
                    const list = [...(product.productFullReductionList || [])]
                    list[idx] = { ...list[idx], fullPrice: val || 0 }
                    updateField('productFullReductionList', list)
                  }}
                />
              )}
            />
            <Table.Column
              title="立减"
              dataIndex="reducePrice"
              key="reducePrice"
              render={(v: number, _: PmsProductFullReduction, idx: number) => (
                <InputNumber
                  value={v}
                  min={0}
                  onChange={(val) => {
                    const list = [...(product.productFullReductionList || [])]
                    list[idx] = { ...list[idx], reducePrice: val || 0 }
                    updateField('productFullReductionList', list)
                  }}
                />
              )}
            />
            <Table.Column
              title="操作"
              key="actions"
              width={120}
              render={(_: any, __: PmsProductFullReduction, idx: number) => (
                <>
                  <Button
                    type="link"
                    onClick={() => handleRemoveFullReduction(idx)}
                  >
                    删除
                  </Button>
                  <Button type="link" onClick={handleAddFullReduction}>
                    添加
                  </Button>
                </>
              )}
            />
          </Table>
        </Form.Item>
      )}

      <div style={{ textAlign: 'center' }}>
        <Button onClick={handlePrev} style={{ marginRight: 16 }}>
          上一步，填写商品信息
        </Button>
        <Button type="primary" onClick={handleNext}>
          下一步，填写商品属性
        </Button>
      </div>
    </Form>
  )

  const renderStep3 = () => (
    <Form layout="vertical" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Form.Item label="属性类型：">
        <Select
          value={product.productAttributeCategoryId}
          onChange={v => updateField('productAttributeCategoryId', v)}
          placeholder="请选择属性类型"
          allowClear
          style={{ width: '100%' }}
        >
          {attrCateOptions.map(a => (
            <Option key={a.value} value={a.value}>
              {a.label}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label="商品主图：">
        <Input
          value={product.pic}
          onChange={e => updateField('pic', e.target.value)}
          placeholder="图片URL"
        />
      </Form.Item>
      <Form.Item label="商品画册（多张用逗号分隔）：">
        <TextArea
          value={product.albumPics}
          onChange={e => updateField('albumPics', e.target.value)}
          rows={2}
          placeholder="图片URL,图片URL,..."
        />
      </Form.Item>
      <Form.Item label="电脑端详情（HTML）：">
        <TextArea
          value={product.detailHtml}
          onChange={e => updateField('detailHtml', e.target.value)}
          rows={8}
          placeholder="HTML内容"
        />
      </Form.Item>
      <Form.Item label="移动端详情（HTML）：">
        <TextArea
          value={product.detailMobileHtml}
          onChange={e => updateField('detailMobileHtml', e.target.value)}
          rows={8}
          placeholder="HTML内容"
        />
      </Form.Item>
      <div style={{ textAlign: 'center' }}>
        <Button onClick={handlePrev} style={{ marginRight: 16 }}>
          上一步，填写商品促销
        </Button>
        <Button type="primary" onClick={handleNext}>
          下一步，选择商品关联
        </Button>
      </div>
    </Form>
  )

  const renderStep4 = () => (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <p style={{ fontSize: 16, marginBottom: 24, color: '#666' }}>
        商品关联可在商品保存后通过专题推荐、优选专区等功能模块进行设置
      </p>
      <Button onClick={handlePrev} style={{ marginRight: 16 }}>
        上一步，填写商品属性
      </Button>
      <Button type="primary" onClick={handleSubmit} loading={loading}>
        完成，提交商品
      </Button>
    </div>
  )

  const stepsItems = [
    { title: '填写商品信息' },
    { title: '填写商品促销' },
    { title: '填写商品属性' },
    { title: '选择商品关联' },
  ]

  return (
    <div className="app-container">
      <div className={styles.container}>
        <Steps
          current={currentStep}
          items={stepsItems}
          size="small"
          style={{ marginBottom: 24 }}
        />
        {currentStep === 0 && renderStep1()}
        {currentStep === 1 && renderStep2()}
        {currentStep === 2 && renderStep3()}
        {currentStep === 3 && renderStep4()}
      </div>
    </div>
  )
}
