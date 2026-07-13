import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Cascader,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Spin,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getProductAttrInfoByCateIdAPI } from '@/apis/productAttr'
import { productAttributeCategoryListWithAttrAPI } from '@/apis/productAttrCate'
import {
  getProductCategoryByIdAPI,
  getProductCategoryListAPI,
  productCategoryUpdateByIdAPI,
} from '@/apis/productCate'
import { useAppMessage } from '@/hooks/useAppMessage'

export default () => {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const cateId = Number(searchParams.get('id'))

  // 可选上级分类
  const [selectProductCateList, setSelectProductCateList] = useState<
    { id: number, name: string }[]
  >([])

  // 筛选属性级联选择器中的数据
  const [filterAttrs, setFilterAttrs] = useState<
    { label: string, value: number, children?: { label: string, value: number }[] }[]
  >([])

  // 获取可选上级分类列表
  const getSelectProductCateList = async () => {
    const res = await getProductCategoryListAPI(0, { pageSize: 100, pageNum: 1 })
    const list = [{ id: 0, name: '无上级分类' }, ...res.data.list]
    setSelectProductCateList(list)
  }

  // 获取商品属性分类列表
  const getProductAttrCateList = async () => {
    const res = await productAttributeCategoryListWithAttrAPI()
    const list = res.data.map((item: any) => ({
      label: item.name,
      value: item.id,
      children: item.productAttributeList?.map((it: any) => ({
        label: it.name,
        value: it.id,
      })),
    }))
    setFilterAttrs(list)
  }

  // 获取分类详情
  const getCateDetail = async () => {
    if (!cateId)
      return
    setLoading(true)
    try {
      const res = await getProductCategoryByIdAPI(cateId)
      form.setFieldsValue(res.data)

      // 获取筛选属性
      const attrRes = await getProductAttrInfoByCateIdAPI(cateId)
      const filterProductAttrList = attrRes.data.map((item: any) => [
        item.attributeCategoryId,
        item.attributeId,
      ])
      form.setFieldValue('filterProductAttrList', filterProductAttrList)
    }
    catch (error) {
      console.error('获取分类详情失败:', error)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getSelectProductCateList()
    getProductAttrCateList()
    getCateDetail()
  }, [cateId])

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      // 处理筛选属性
      const productAttributeIdList = (values.filterProductAttrList || [])
        .filter((item: number[]) => item && item.length === 2)
        .map((item: number[]) => item[1])

      await productCategoryUpdateByIdAPI(cateId, {
        ...values,
        productAttributeIdList,
      })
      message.success('修改成功')
      navigate(-1)
    }
    catch (error) {
      console.error('修改商品分类失败:', error)
    }
  }

  return (
    <div className="app-container">
      <Card title="编辑商品分类">
        <Spin spinning={loading}>
          <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item
              label="分类名称"
              name="name"
              rules={[
                { required: true, message: '请输入分类名称' },
                { min: 2, max: 140, message: '长度在 2 到 140 个字符' },
              ]}
            >
              <Input placeholder="请输入分类名称" />
            </Form.Item>

            <Form.Item label="上级分类" name="parentId">
              <Select placeholder="请选择分类">
                {selectProductCateList.map(item => (
                  <Select.Option key={item.id} value={item.id}>
                    {item.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="数量单位" name="productUnit">
              <Input placeholder="请输入数量单位" />
            </Form.Item>

            <Form.Item label="排序" name="sort">
              <Input type="number" placeholder="请输入排序" />
            </Form.Item>

            <Form.Item label="是否显示" name="showStatus">
              <Radio.Group>
                <Radio value={1}>是</Radio>
                <Radio value={0}>否</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="是否显示在导航栏" name="navStatus">
              <Radio.Group>
                <Radio value={1}>是</Radio>
                <Radio value={0}>否</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="分类图标" name="icon">
              <Input placeholder="请输入分类图标URL" />
            </Form.Item>

            <Form.List name="filterProductAttrList">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <Form.Item
                      key={field.key}
                      label={index === 0 ? '筛选属性' : ''}
                    >
                      <Space>
                        <Form.Item name={field.name} noStyle>
                          <Cascader
                            options={filterAttrs}
                            placeholder="请选择筛选属性"
                            style={{ width: 300 }}
                            clearable
                          />
                        </Form.Item>
                        {fields.length > 1 && (
                          <Button
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(field.name)}
                            danger
                          />
                        )}
                      </Space>
                    </Form.Item>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      icon={<PlusOutlined />}
                      disabled={fields.length >= 3}
                    >
                      新增筛选属性
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <Form.Item label="关键词" name="keywords">
              <Input placeholder="请输入关键词" />
            </Form.Item>

            <Form.Item label="分类描述" name="description">
              <Input.TextArea placeholder="请输入分类描述" rows={4} />
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
