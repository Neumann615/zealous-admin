import {
  App,
  Button,
  Card,
  Form,
  Input,
  Radio,
  Spin,
} from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getBrandAPI, updateBrandAPI } from '@/apis/brand'
import { useAppMessage } from '@/hooks/useAppMessage'

export default function UpdateBrand() {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const brandId = Number(searchParams.get('id'))

  // 获取品牌详情
  useEffect(() => {
    const getBrandDetail = async () => {
      if (!brandId)
        return
      setLoading(true)
      try {
        const res = await getBrandAPI(brandId)
        form.setFieldsValue(res.data)
      }
      catch (error) {
        console.error('获取品牌详情失败:', error)
      }
      finally {
        setLoading(false)
      }
    }
    getBrandDetail()
  }, [brandId])

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await updateBrandAPI(brandId, values)
      message.success('修改成功')
      navigate(-1)
    }
    catch (error) {
      console.error('修改品牌失败:', error)
    }
  }

  return (
    <div className="app-container">
      <Card title="编辑品牌">
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
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
