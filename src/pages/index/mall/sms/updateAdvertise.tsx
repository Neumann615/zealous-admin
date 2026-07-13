import type { UploadFile } from 'antd/es/upload/interface'
import type { SmsHomeAdvertise } from '@/types/homeAdvertise'
import { UploadOutlined } from '@ant-design/icons'
import { App, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space, Upload } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getHomeAdvertiseByIdAPI, homeAdvertiseUpdateAPI } from '@/apis/homeAdvertise'
import { useAppMessage } from '@/hooks/useAppMessage'

const { TextArea } = Input

export default function UpdateAdvertise() {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [initialPic, setInitialPic] = useState('')

  // 轮播位置选项
  const typeOptions = [
    { label: 'PC首页轮播', value: 0 },
    { label: 'APP首页轮播', value: 1 },
  ]

  // 初始化数据
  useEffect(() => {
    const advertiseId = Number(searchParams.get('id'))
    getHomeAdvertiseByIdAPI(advertiseId).then((res) => {
      const data = res.data
      form.setFieldsValue({
        name: data.name,
        type: data.type,
        startTime: data.startTime ? dayjs(data.startTime) : null,
        endTime: data.endTime ? dayjs(data.endTime) : null,
        status: data.status === 1,
        url: data.url,
        note: data.note,
        sort: data.sort,
      })
      setInitialPic(data.pic)
      if (data.pic) {
        setFileList([
          {
            uid: '-1',
            name: 'image.png',
            status: 'done',
            url: data.pic,
          },
        ])
      }
    })
  }, [searchParams])

  // 提交表单
  const onSubmit = async () => {
    try {
      const values = await form.validateFields()
      const advertiseId = Number(searchParams.get('id'))
      const data: SmsHomeAdvertise = {
        name: values.name,
        type: values.type,
        pic: fileList[0]?.response?.data || initialPic,
        startTime: values.startTime?.format('YYYY-MM-DD HH:mm:ss'),
        endTime: values.endTime?.format('YYYY-MM-DD HH:mm:ss'),
        status: values.status ? 1 : 0,
        url: values.url,
        note: values.note,
        sort: values.sort || 0,
      }
      await homeAdvertiseUpdateAPI(advertiseId, data)
      message.success('修改成功')
      navigate(-1)
    }
    catch (error) {
      console.error('提交失败:', error)
    }
  }

  // 上传图片变化
  const handleChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList)
  }

  // 上传前校验
  const beforeUpload = (file: File) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
    if (!isJpgOrPng) {
      message.error('只能上传JPG/PNG文件!')
    }
    const isLt2M = file.size / 1024 / 1024 < 2
    if (!isLt2M) {
      message.error('图片大小必须小于2MB!')
    }
    return isJpgOrPng && isLt2M
  }

  return (
    <div className="app-container">
      <Card title="编辑广告">
        <Form form={form} layout="vertical">
          <Form.Item
            label="广告名称："
            name="name"
            rules={[{ required: true, message: '请输入广告名称' }]}
          >
            <Input placeholder="请输入广告名称" style={{ width: 500 }} />
          </Form.Item>
          <Form.Item
            label="广告位置："
            name="type"
            rules={[{ required: true, message: '请选择广告位置' }]}
          >
            <Select style={{ width: 300 }}>
              {typeOptions.map(item => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="广告图片：" name="pic">
            <Upload
              action="/api/upload"
              listType="picture"
              fileList={fileList}
              onChange={handleChange}
              beforeUpload={beforeUpload}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>上传图片</Button>
            </Upload>
          </Form.Item>
          <Form.Item
            label="开始时间："
            name="startTime"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <DatePicker showTime placeholder="请选择时间" />
          </Form.Item>
          <Form.Item
            label="到期时间："
            name="endTime"
            rules={[{ required: true, message: '请选择到期时间' }]}
          >
            <DatePicker showTime placeholder="请选择时间" />
          </Form.Item>
          <Form.Item label="是否上线：" name="status" valuePropName="checked">
            <Switch checkedChildren="上线" unCheckedChildren="下线" />
          </Form.Item>
          <Form.Item
            label="链接地址："
            name="url"
            rules={[{ required: true, message: '请输入链接地址' }]}
          >
            <Input placeholder="请输入链接地址" style={{ width: 500 }} />
          </Form.Item>
          <Form.Item label="排序：" name="sort">
            <InputNumber min={0} style={{ width: 300 }} />
          </Form.Item>
          <Form.Item label="备注：" name="note">
            <TextArea rows={3} placeholder="请输入备注" style={{ width: 500 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={onSubmit}>
                提交
              </Button>
              <Button onClick={() => navigate(-1)}>返回</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
