import type { PmsProductAttributeCategory } from '@/types/productAttr'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Radio,
  Select,
  Spin,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getProductAttributeByIdAPI,
  productAttributeUpdateAPI,
} from '@/apis/productAttr'
import { getProductAttributeCategoryListAPI } from '@/apis/productAttrCate'
import { useAppMessage } from '@/hooks/useAppMessage'

const { Option } = Select

export default () => {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // 从 URL 获取参数
  const attrId = Number(searchParams.get('id')) || 0
  const cid = Number(searchParams.get('cid')) || 0
  const cname = searchParams.get('cname') || ''
  const type = Number(searchParams.get('type')) || 0

  // 商品属性分类列表
  const [productAttributeCategoryList, setProductAttributeCategoryList] = useState<
    PmsProductAttributeCategory[]
  >([])

  // 获取商品属性分类列表
  const getProductAttributeCategoryList = async () => {
    const res = await getProductAttributeCategoryListAPI({ pageNum: 1, pageSize: 100 })
    setProductAttributeCategoryList(res.data.list)
  }

  // 获取属性详情
  const getAttrDetail = async () => {
    if (!attrId)
      return
    setLoading(true)
    try {
      const res = await getProductAttributeByIdAPI(attrId)
      form.setFieldsValue(res.data)
    }
    catch (error) {
      console.error('获取属性详情失败:', error)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getProductAttributeCategoryList()
    getAttrDetail()
  }, [attrId])

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await productAttributeUpdateAPI(attrId, values)
      message.success('修改成功')
      navigate(-1)
    }
    catch (error) {
      console.error('修改商品属性失败:', error)
    }
  }

  return (
    <div className="app-container">
      <Card title={`编辑${type === 0 ? '属性' : '参数'} - ${cname}`}>
        <Spin spinning={loading}>
          <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item
              label={type === 0 ? '属性名称' : '参数名称'}
              name="name"
              rules={[{ required: true, message: `请输入${type === 0 ? '属性' : '参数'}名称` }]}
            >
              <Input placeholder={`请输入${type === 0 ? '属性' : '参数'}名称`} />
            </Form.Item>

            <Form.Item label="商品类型" name="productAttributeCategoryId">
              <Select placeholder="请选择商品类型">
                {productAttributeCategoryList.map(item => (
                  <Option key={item.id} value={item.id}>
                    {item.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {type === 0 && (
              <>
                <Form.Item label="属性是否可选" name="selectType">
                  <Radio.Group>
                    <Radio value={0}>唯一</Radio>
                    <Radio value={1}>单选</Radio>
                    <Radio value={2}>多选</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="属性值的类型" name="inputType">
                  <Radio.Group>
                    <Radio value={0}>手工录入</Radio>
                    <Radio value={1}>从列表选择</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) =>
                    prevValues.inputType !== currentValues.inputType}
                >
                  {({ getFieldValue }) =>
                    getFieldValue('inputType') === 1
                      ? (
                          <Form.Item
                            label="属性值"
                            name="inputList"
                            rules={[{ required: true, message: '请输入属性值' }]}
                            extra="多个属性值用逗号分隔"
                          >
                            <Input placeholder="请输入属性值，多个用逗号分隔" />
                          </Form.Item>
                        )
                      : null}
                </Form.Item>
              </>
            )}

            {type === 1 && (
              <Form.Item
                label="参数值"
                name="inputList"
                rules={[{ required: true, message: '请输入参数值' }]}
                extra="多个参数值用逗号分隔"
              >
                <Input placeholder="请输入参数值，多个用逗号分隔" />
              </Form.Item>
            )}

            <Form.Item name="type" hidden>
              <Input />
            </Form.Item>

            <Form.Item>
              <Button type="primary" onClick={handleSubmit}>
                提交
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  )
}
