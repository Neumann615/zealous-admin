import type { ElCascaderDataVo } from '@/types/common'
import type { CouponSelectProductOptionVo, SmsCouponExt } from '@/types/coupon'
import type { PmsProduct } from '@/types/product'
import {
  App,
  Button,
  Card,
  Cascader,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { couponCreateAPI } from '@/apis/coupon'
import { getProductListAPI } from '@/apis/product'
import { getProductCategoryListWithChildrenAPI } from '@/apis/productCate'
import { couponPlatforms, couponTypes } from '@/utils/constant'
import { useAppMessage } from '@/hooks/useAppMessage'

const { TextArea } = Input

export default function AddCoupon() {
  const { message, modal } = useAppMessage()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [coupon, setCoupon] = useState<SmsCouponExt>({
    type: 0,
    name: '',
    platform: 0,
    amount: 0,
    perLimit: 1,
    useType: 0,
    productRelationList: [],
    productCategoryRelationList: [],
  })
  const [isEdit] = useState(false)

  // 商品分类选项
  const [productCateOptions, setProductCateOptions] = useState<ElCascaderDataVo[]>([])
  // 选中的商品分类
  const [selectProductCate, setSelectProductCate] = useState<number[]>([])

  // 搜索商品的加载状态
  const [selectProductLoading, setSelectProductLoading] = useState(false)
  // 搜索商品的选项
  const [selectProductOptions, setSelectProductOptions] = useState<CouponSelectProductOptionVo[]>([])
  // 选中的商品ID
  const [selectProduct, setSelectProduct] = useState<number>()

  // 获取分类列表
  const getProductCateList = async () => {
    try {
      const res = await getProductCategoryListWithChildrenAPI()
      const list = res.data
      setProductCateOptions(
        list.map((item: any) => ({
          label: item.name,
          value: item.id,
          children: item.children?.map((it: any) => ({ label: it.name, value: it.id })),
        })),
      )
    }
    catch (error) {
      console.error('获取商品分类列表失败:', error)
    }
  }

  // 初始化数据
  useEffect(() => {
    getProductCateList()
    form.setFieldsValue({
      type: 0,
      platform: 0,
      perLimit: 1,
      useType: 0,
      publishCount: 0,
      amount: 0,
      minPoint: 0,
    })
  }, [])

  // 搜索商品方法
  const searchProductMethod = async (query: string) => {
    if (query) {
      setSelectProductLoading(true)
      try {
        const res = await getProductListAPI({ pageNum: 1, pageSize: 10, keyword: query })
        setSelectProductLoading(false)
        const productList: PmsProduct[] = res.data.list
        setSelectProductOptions(
          productList.map(item => ({
            productId: item.id,
            productName: item.name,
            productSn: item.productSn,
          })),
        )
      }
      catch (error) {
        setSelectProductLoading(false)
        console.error('搜索商品失败:', error)
      }
    }
    else {
      setSelectProductOptions([])
    }
  }

  // 添加商品关联
  const handleAddProductRelation = () => {
    if (!selectProduct) {
      message.warning('请先选择商品')
      return
    }
    const product = getProductById(selectProduct)
    if (product) {
      setCoupon(prev => ({
        ...prev,
        productRelationList: [...(prev.productRelationList || []), product],
      }))
      setSelectProduct(undefined)
    }
  }

  // 删除商品关联
  const handleDeleteProductRelation = (index: number) => {
    setCoupon(prev => ({
      ...prev,
      productRelationList: prev.productRelationList?.filter((_, i) => i !== index),
    }))
  }

  // 添加商品分类关联
  const handleAddProductCategoryRelation = () => {
    if (selectProductCate.length <= 0) {
      message.warning('请先选择商品分类')
      return
    }
    const relation = getProductCateByIds(selectProductCate)
    setCoupon(prev => ({
      ...prev,
      productCategoryRelationList: [...(prev.productCategoryRelationList || []), relation],
    }))
    setSelectProductCate([])
  }

  // 删除商品分类关联
  const handleDeleteProductCateRelation = (index: number) => {
    setCoupon(prev => ({
      ...prev,
      productCategoryRelationList: prev.productCategoryRelationList?.filter((_, i) => i !== index),
    }))
  }

  // 根据ID获取关联商品
  const getProductById = (id: number) => {
    return selectProductOptions.find(item => item.productId === id)
  }

  // 根据IDs获取商品分类
  const getProductCateByIds = (ids: number[]) => {
    const findParentCate = productCateOptions.find(item => item.value === ids[0])
    const findCate = findParentCate?.children?.find(item => item.value === ids[1])
    return {
      productCategoryId: ids[1],
      productCategoryName: findCate?.label,
      parentCategoryName: findParentCate?.label,
    }
  }

  // 提交表单
  const onSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data: SmsCouponExt = {
        ...coupon,
        ...values,
        enableTime: values.enableTime?.format('YYYY-MM-DD'),
        startTime: values.startTime?.format('YYYY-MM-DD'),
        endTime: values.endTime?.format('YYYY-MM-DD'),
      }
      modal.confirm({
        title: '提示',
        content: '是否提交数据',
        onOk: async () => {
          try {
            await couponCreateAPI(data)
            message.success('提交成功')
            navigate(-1)
          }
          catch (error) {
            console.error('创建优惠券失败:', error)
          }
        },
      })
    }
    catch (error) {
      console.error('验证失败:', error)
    }
  }

  // 重置表单
  const resetForm = () => {
    form.resetFields()
    setCoupon({
      type: 0,
      name: '',
      platform: 0,
      amount: 0,
      perLimit: 1,
      useType: 0,
      productRelationList: [],
      productCategoryRelationList: [],
    })
  }

  // 商品表格列
  const productColumns = [
    {
      title: '商品名称',
      dataIndex: 'productName',
      key: 'productName',
      align: 'center' as const,
    },
    {
      title: '货号',
      dataIndex: 'productSn',
      key: 'productSn',
      width: 120,
      align: 'center' as const,
      render: (productSn: string) => `NO.${productSn}`,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Button type="link" danger onClick={() => handleDeleteProductRelation(index)}>
          删除
        </Button>
      ),
    },
  ]

  // 商品分类表格列
  const productCateColumns = [
    {
      title: '分类名称',
      key: 'categoryName',
      align: 'center' as const,
      render: (_: any, row: any) => `${row.parentCategoryName} > ${row.productCategoryName}`,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Button type="link" danger onClick={() => handleDeleteProductCateRelation(index)}>
          删除
        </Button>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card title="添加优惠券">
        <Form form={form} layout="vertical" labelWidth={150}>
          <Form.Item label="优惠券类型：" name="type" rules={[{ required: true }]}>
            <Select style={{ width: 300 }}>
              {couponTypes.map(type => (
                <Select.Option key={type.value} value={type.value}>
                  {type.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="优惠券名称：" name="name" rules={[{ required: true, message: '请输入优惠券名称' }]}>
            <Input style={{ width: 300 }} placeholder="请输入优惠券名称" />
          </Form.Item>
          <Form.Item label="适用平台：" name="platform" rules={[{ required: true }]}>
            <Select style={{ width: 300 }}>
              {couponPlatforms.map(item => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="总发行量："
            name="publishCount"
            rules={[{ required: true, message: '只能输入正整数' }]}
          >
            <InputNumber min={0} style={{ width: 300 }} placeholder="只能输入正整数" />
          </Form.Item>
          <Form.Item
            label="面额："
            name="amount"
            rules={[{ required: true, message: '面值只能是数值，限2位小数' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: 300 }} placeholder="面值只能是数值，限2位小数" addonAfter="元" />
          </Form.Item>
          <Form.Item label="每人限领：" name="perLimit">
            <InputNumber min={1} style={{ width: 300 }} placeholder="只能输入正整数" addonAfter="张" />
          </Form.Item>
          <Form.Item
            label="使用门槛："
            name="minPoint"
            rules={[{ required: true, message: '只能输入正整数' }]}
          >
            <InputNumber min={0} style={{ width: 300 }} placeholder="只能输入正整数" addonBefore="满" addonAfter="元可用" />
          </Form.Item>
          <Form.Item label="领取日期：" name="enableTime">
            <DatePicker placeholder="选择日期" />
          </Form.Item>
          <Form.Item label="有效期：">
            <Space>
              <Form.Item name="startTime" noStyle>
                <DatePicker placeholder="选择日期" />
              </Form.Item>
              <span>至</span>
              <Form.Item name="endTime" noStyle>
                <DatePicker placeholder="选择日期" />
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item label="可使用商品：" name="useType">
            <Select style={{ width: 300 }} onChange={val => setCoupon(prev => ({ ...prev, useType: val }))}>
              <Select.Option value={0}>全场通用</Select.Option>
              <Select.Option value={1}>指定分类</Select.Option>
              <Select.Option value={2}>指定商品</Select.Option>
            </Select>
          </Form.Item>
          {coupon.useType === 1 && (
            <Form.Item label="指定分类：">
              <Space direction="vertical">
                <Cascader
                  options={productCateOptions}
                  placeholder="请选择分类名称"
                  value={selectProductCate}
                  onChange={value => setSelectProductCate(value as number[])}
                  style={{ width: 300 }}
                />
                <Button onClick={handleAddProductCategoryRelation}>添加</Button>
                <Table
                  columns={productCateColumns}
                  dataSource={coupon.productCategoryRelationList}
                  rowKey="productCategoryId"
                  size="small"
                  pagination={false}
                  style={{ width: 500 }}
                />
              </Space>
            </Form.Item>
          )}
          {coupon.useType === 2 && (
            <Form.Item label="指定商品：">
              <Space direction="vertical">
                <Select
                  showSearch
                  value={selectProduct}
                  onChange={setSelectProduct}
                  onSearch={searchProductMethod}
                  placeholder="商品名称/商品货号"
                  loading={selectProductLoading}
                  filterOption={false}
                  style={{ width: 300 }}
                >
                  {selectProductOptions.map(item => (
                    <Select.Option key={item.productId} value={item.productId!}>
                      {item.productName}
                      {' '}
                      (NO.
                      {item.productSn}
                      )
                    </Select.Option>
                  ))}
                </Select>
                <Button onClick={handleAddProductRelation}>添加</Button>
                <Table
                  columns={productColumns}
                  dataSource={coupon.productRelationList}
                  rowKey="productId"
                  size="small"
                  pagination={false}
                  style={{ width: 500 }}
                />
              </Space>
            </Form.Item>
          )}
          <Form.Item label="备注：" name="note">
            <TextArea rows={5} placeholder="请输入内容" style={{ width: 500 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={onSubmit}>
                提交
              </Button>
              <Button onClick={resetForm}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
