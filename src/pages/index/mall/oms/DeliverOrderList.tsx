import type { OmsOrder, OmsOrderDeliveryParam } from '@/types/order'
import { LeftOutlined, SendOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Space,
  Table,
  Tag,
} from 'antd'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { orderUpdateDeliveryAPI } from '@/apis/order'
import { useMallOrderStore } from '@/store/mall/order'
import { useAppMessage } from '@/hooks/useAppMessage'

export default function DeliverOrderList() {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const orderStore = useMallOrderStore()

  // 表单
  const [form] = Form.useForm()

  // 发货订单列表
  const [list, setList] = useState<OmsOrder[]>(orderStore.deliverOrderList)

  // 格式化订单状态
  const formatStatus = (value: number) => {
    const statusMap: Record<number, string> = {
      0: '待付款',
      1: '待发货',
      2: '已发货',
      3: '已完成',
      4: '已关闭',
      5: '无效订单',
    }
    return statusMap[value] || '待付款'
  }

  // 处理发货
  const handleDelivery = async () => {
    try {
      const values = await form.validateFields()
      // 构建发货参数
      const deliveryParams: OmsOrderDeliveryParam[] = list.map((item, index) => ({
        orderId: item.id,
        deliveryCompany: values[`deliveryCompany_${index}`],
        deliverySn: values[`deliverySn_${index}`],
      }))
      await orderUpdateDeliveryAPI(deliveryParams)
      message.success('发货成功', 1)
      navigate('/mall/oms/order')
    }
    catch (error) {
      console.error('发货失败:', error)
    }
  }

  // 表格列
  const columns = [
    {
      title: '订单编号',
      dataIndex: 'orderSn',
      key: 'orderSn',
      width: 180,
    },
    {
      title: '收货人',
      dataIndex: 'receiverName',
      key: 'receiverName',
      width: 150,
    },
    {
      title: '收货电话',
      dataIndex: 'receiverPhone',
      key: 'receiverPhone',
      width: 150,
    },
    {
      title: '订单状态',
      key: 'status',
      width: 120,
      render: (_: any, record: OmsOrder) => (
        <Tag color="blue">{formatStatus(record.status)}</Tag>
      ),
    },
    {
      title: '物流公司',
      key: 'deliveryCompany',
      width: 200,
      render: (_: any, record: OmsOrder, index: number) => (
        <Form.Item
          name={`deliveryCompany_${index}`}
          rules={[{ required: true, message: '请输入物流公司' }]}
        >
          <Input placeholder="请输入物流公司" />
        </Form.Item>
      ),
    },
    {
      title: '物流单号',
      key: 'deliverySn',
      width: 200,
      render: (_: any, record: OmsOrder, index: number) => (
        <Form.Item
          name={`deliverySn_${index}`}
          rules={[{ required: true, message: '请输入物流单号' }]}
        >
          <Input placeholder="请输入物流单号" />
        </Form.Item>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card
        title="发货订单列表"
        extra={(
          <Button type="primary" icon={<LeftOutlined />} onClick={() => navigate('/mall/oms/order')}>
            返回列表
          </Button>
        )}
      >
        <Form form={form} layout="vertical">
          <Table
            columns={columns}
            dataSource={list}
            rowKey="id"
            pagination={false}
            bordered
          />
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Space size="large">
              <Button type="primary" size="large" icon={<SendOutlined />} onClick={handleDelivery}>
                确认发货
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  )
}
