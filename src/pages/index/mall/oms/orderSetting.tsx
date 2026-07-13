import type { OmsOrderSetting } from '@/types/orderSetting'
import { SaveOutlined } from '@ant-design/icons'
import { App, Button, Card, Form, InputNumber } from 'antd'
import React, { useEffect, useState } from 'react'
import { getOrderSettingByIdAPI, orderSettingUpdateByIdAPI } from '@/apis/orderSetting'
import { useAppMessage } from '@/hooks/useAppMessage'

export default function OrderSetting() {
  const { message } = useAppMessage()
  // 表单
  const [form] = Form.useForm()
  // 订单设置数据
  const [orderSetting, setOrderSetting] = useState<OmsOrderSetting | null>(null)
  // 加载状态
  const [loading, setLoading] = useState(false)

  // 获取订单设置
  const getOrderSetting = async () => {
    setLoading(true)
    try {
      const response = await getOrderSettingByIdAPI(1)
      setLoading(false)
      setOrderSetting(response.data)
      form.setFieldsValue(response.data)
    }
    catch (error) {
      setLoading(false)
      console.error('获取订单设置失败:', error)
    }
  }

  // 初始化
  useEffect(() => {
    getOrderSetting()
  }, [])

  // 处理保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await orderSettingUpdateByIdAPI(1, { ...values, id: 1 })
      message.success('修改成功', 1)
    }
    catch (error) {
      console.error('修改失败:', error)
    }
  }

  return (
    <div className="app-container">
      <Card title="订单设置">
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 12 }}
          initialValues={orderSetting}
        >
          <Form.Item
            name="flashOrderOvertime"
            label="秒杀订单超时时限："
            rules={[{ required: true, message: '请输入' }]}
          >
            <InputNumber
              min={0}
              placeholder="秒杀订单超时时限（分钟）"
              style={{ width: '100%' }}
              addonAfter="分钟"
            />
          </Form.Item>
          <Form.Item
            name="normalOrderOvertime"
            label="普通订单超时时限："
            rules={[{ required: true, message: '请输入' }]}
          >
            <InputNumber
              min={0}
              placeholder="普通订单超时时限（分钟）"
              style={{ width: '100%' }}
              addonAfter="分钟"
            />
          </Form.Item>
          <Form.Item
            name="confirmOvertime"
            label="自动确认收货时限："
            rules={[{ required: true, message: '请输入' }]}
          >
            <InputNumber
              min={0}
              placeholder="自动确认收货时限（天）"
              style={{ width: '100%' }}
              addonAfter="天"
            />
          </Form.Item>
          <Form.Item
            name="finishOvertime"
            label="交易完成后自动好评时限："
            rules={[{ required: true, message: '请输入' }]}
          >
            <InputNumber
              min={0}
              placeholder="交易完成后自动好评时限（天）"
              style={{ width: '100%' }}
              addonAfter="天"
            />
          </Form.Item>
          <Form.Item
            name="commentOvertime"
            label="订单完成后自动关闭评价时限："
            rules={[{ required: true, message: '请输入' }]}
          >
            <InputNumber
              min={0}
              placeholder="订单完成后自动关闭评价时限（天）"
              style={{ width: '100%' }}
              addonAfter="天"
            />
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 6 }}>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
