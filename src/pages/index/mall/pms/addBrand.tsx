import type { PmsBrand } from '@/types/brand'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Radio,
} from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBrandAPI } from '@/apis/brand'
import { useAppMessage } from '@/hooks/useAppMessage'

export default function AddBrand() {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  // 默认品牌数据
  const defaultBrand: PmsBrand = {
    bigPic: '',
    brandStory: '',
    factoryStatus: 0,
    firstLetter: '',
    logo: '',
    name: '',
    showStatus: 0,
    sort: 0,
  }

  const [brand, setBrand] = useState<PmsBrand>({ ...defaultBrand })

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await createBrandAPI({ ...brand, ...values })
      message.success('添加成功')
      navigate(-1)
    }
    catch (error) {
      console.error('添加品牌失败:', error)
    }
  }

  // 重置表单
  const handleReset = () => {
    form.resetFields()
    setBrand({ ...defaultBrand })
  }

  return (
    <div className="app-container">
      <Card title="添加品牌">
        <Form
          form={form}
          layout="vertical"
          initialValues={defaultBrand}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            label="品牌名称"
            name="name"
            rules={[
              { required: true, message: '请输入品牌名称' },
              { min: 2, max: 140, message: '长度在 2 到 140 个字符' },
            ]}
          >
            <Input placeholder="请输入品牌名称" />
          </Form.Item>

          <Form.Item label="品牌首字母" name="firstLetter">
            <Input placeholder="请输入品牌首字母" />
          </Form.Item>

          <Form.Item
            label="品牌LOGO"
            name="logo"
            rules={[{ required: true, message: '请输入品牌logo' }]}
          >
            <Input placeholder="请输入品牌LOGO URL" />
          </Form.Item>

          <Form.Item label="品牌专区大图" name="bigPic">
            <Input placeholder="请输入品牌专区大图URL" />
          </Form.Item>

          <Form.Item label="品牌故事" name="brandStory">
            <Input.TextArea placeholder="请输入品牌故事" rows={4} />
          </Form.Item>

          <Form.Item
            label="排序"
            name="sort"
            rules={[{ type: 'number', message: '排序必须为数字' }]}
          >
            <Input type="number" placeholder="请输入排序" />
          </Form.Item>

          <Form.Item label="是否显示" name="showStatus">
            <Radio.Group>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="品牌制造商" name="factoryStatus">
            <Radio.Group>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={handleSubmit} style={{ marginRight: 16 }}>
              提交
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
