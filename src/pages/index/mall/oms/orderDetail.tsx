import type {
  OmsMoneyInfoParam,
  OmsOrderDeliveryParam,
  OmsOrderDetail,
  OmsReceiverInfoParam,
} from '@/types/order'
import {
  CloseCircleOutlined,
  EditOutlined,
  LeftOutlined,
  SendOutlined,
  TruckOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Tag,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useControlTab } from '@zealous-admin/layout/index'
import {
  getOrderDetailByIdAPI,
  orderUpdateCloseAPI,
  orderUpdateDeliveryAPI,
  orderUpdateMoneyInfoAPI,
  orderUpdateNoteAPI,
  orderUpdateReceiverInfoAPI,
} from '@/apis/order'
import { useMallOrderStore } from '@/store/mall/order'
import { useAppMessage } from '@/hooks/useAppMessage'

const { Option } = Select

export default function OrderDetail() {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()
  const [searchParams] = useSearchParams()
  const orderStore = useMallOrderStore()

  // 订单ID
  const orderId = Number(searchParams.get('id'))
  // 订单详情数据
  const [orderDetail, setOrderDetail] = useState<OmsOrderDetail | null>(null)
  // 加载状态
  const [loading, setLoading] = useState(false)

  // 收货人信息编辑对话框
  const [receiverModalVisible, setReceiverModalVisible] = useState(false)
  const [receiverForm] = Form.useForm()
  // 费用信息编辑对话框
  const [moneyModalVisible, setMoneyModalVisible] = useState(false)
  const [moneyForm] = Form.useForm()
  // 订单备注对话框
  const [noteModalVisible, setNoteModalVisible] = useState(false)
  const [noteForm] = Form.useForm()
  // 订单发货对话框
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false)
  const [deliveryForm] = Form.useForm()
  // 关闭订单对话框
  const [closeModalVisible, setCloseModalVisible] = useState(false)
  const [closeForm] = Form.useForm()

  // 获取订单详情
  const getOrderDetail = async () => {
    if (!orderId)
      return
    setLoading(true)
    try {
      const response = await getOrderDetailByIdAPI(orderId)
      setLoading(false)
      setOrderDetail(response.data)
    }
    catch (error) {
      setLoading(false)
      console.error('获取订单详情失败:', error)
    }
  }

  // 初始化
  useEffect(() => {
    getOrderDetail()
  }, [orderId])

  // 格式化支付方式
  const formatPayType = (value: number) => {
    if (value === 1)
      return '支付宝'
    else if (value === 2)
      return '微信'
    else return '未支付'
  }

  // 格式化订单来源
  const formatSourceType = (value: number) => {
    return value === 1 ? 'APP订单' : 'PC订单'
  }

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

  // 获取状态颜色
  const getStatusColor = (status: number) => {
    const colorMap: Record<number, string> = {
      0: 'orange',
      1: 'blue',
      2: 'green',
      3: 'green',
      4: 'red',
    }
    return colorMap[status] || 'gray'
  }

  // 处理修改收货人信息
  const handleEditReceiverInfo = () => {
    if (!orderDetail)
      return
    receiverForm.setFieldsValue({
      receiverName: orderDetail.receiverName,
      receiverPhone: orderDetail.receiverPhone,
      receiverPostCode: orderDetail.receiverPostCode,
      receiverProvince: orderDetail.receiverProvince,
      receiverCity: orderDetail.receiverCity,
      receiverRegion: orderDetail.receiverRegion,
      receiverDetailAddress: orderDetail.receiverDetailAddress,
    })
    setReceiverModalVisible(true)
  }

  // 处理保存收货人信息
  const handleSaveReceiverInfo = async () => {
    try {
      const values = await receiverForm.validateFields()
      const data: OmsReceiverInfoParam = {
        ...values,
        orderId,
        status: orderDetail!.status,
      }
      await orderUpdateReceiverInfoAPI(data)
      setReceiverModalVisible(false)
      getOrderDetail()
      message.success('修改成功', 1)
    }
    catch (error) {
      console.error('修改收货人信息失败:', error)
    }
  }

  // 处理修改费用信息
  const handleEditMoneyInfo = () => {
    if (!orderDetail)
      return
    moneyForm.setFieldsValue({
      freightAmount: orderDetail.freightAmount,
      discountAmount: orderDetail.discountAmount,
    })
    setMoneyModalVisible(true)
  }

  // 处理保存费用信息
  const handleSaveMoneyInfo = async () => {
    try {
      const values = await moneyForm.validateFields()
      const data: OmsMoneyInfoParam = {
        ...values,
        orderId,
        status: orderDetail!.status,
      }
      await orderUpdateMoneyInfoAPI(data)
      setMoneyModalVisible(false)
      getOrderDetail()
      message.success('修改成功', 1)
    }
    catch (error) {
      console.error('修改费用信息失败:', error)
    }
  }

  // 处理修改备注
  const handleEditNote = () => {
    noteForm.setFieldsValue({ note: orderDetail?.note || '' })
    setNoteModalVisible(true)
  }

  // 处理保存备注
  const handleSaveNote = async () => {
    try {
      const values = await noteForm.validateFields()
      await orderUpdateNoteAPI({ id: orderId, note: values.note, status: orderDetail!.status })
      setNoteModalVisible(false)
      getOrderDetail()
      message.success('修改成功', 1)
    }
    catch (error) {
      console.error('修改备注失败:', error)
    }
  }

  // 处理订单发货
  const handleDelivery = () => {
    deliveryForm.setFieldsValue({
      deliveryCompany: orderDetail?.deliveryCompany,
      deliverySn: orderDetail?.deliverySn,
    })
    setDeliveryModalVisible(true)
  }

  // 处理保存发货信息
  const handleSaveDelivery = async () => {
    try {
      const values = await deliveryForm.validateFields()
      const data: OmsOrderDeliveryParam = {
        ...values,
        orderId,
      }
      await orderUpdateDeliveryAPI([data])
      setDeliveryModalVisible(false)
      getOrderDetail()
      message.success('发货成功', 1)
    }
    catch (error) {
      console.error('发货失败:', error)
    }
  }

  // 处理关闭订单
  const handleCloseOrder = () => {
    closeForm.setFieldsValue({ note: '' })
    setCloseModalVisible(true)
  }

  // 处理保存关闭订单
  const handleSaveCloseOrder = async () => {
    try {
      const values = await closeForm.validateFields()
      await orderUpdateCloseAPI({ ids: String(orderId), note: values.note })
      setCloseModalVisible(false)
      getOrderDetail()
      message.success('关闭成功', 1)
    }
    catch (error) {
      console.error('关闭订单失败:', error)
    }
  }

  // 处理发货（跳转）
  const handleGoToDelivery = () => {
    if (orderDetail) {
      orderStore.setDeliverOrderList([orderDetail])
      openTab({ key: '/mall/oms/deliverOrderList', label: '发货订单列表' })
    }
  }

  // 商品列
  const itemColumns = [
    {
      title: '商品图片',
      dataIndex: 'productPic',
      key: 'productPic',
      width: 100,
      render: (pic: string) => (
        <img src={pic} alt="商品" style={{ width: 80, height: 80 }} />
      ),
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: '商品货号',
      dataIndex: 'productSn',
      key: 'productSn',
      width: 150,
    },
    {
      title: '商品价格',
      dataIndex: 'productPrice',
      key: 'productPrice',
      width: 120,
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    {
      title: '商品数量',
      dataIndex: 'productQuantity',
      key: 'productQuantity',
      width: 120,
    },
    {
      title: '商品分类',
      dataIndex: 'productCategoryId',
      key: 'productCategoryId',
      width: 120,
    },
    {
      title: '销售属性1',
      dataIndex: 'sp1',
      key: 'sp1',
      width: 120,
    },
    {
      title: '销售属性2',
      dataIndex: 'sp2',
      key: 'sp2',
      width: 120,
    },
  ]

  // 操作记录列
  const historyColumns = [
    {
      title: '操作人',
      dataIndex: 'operateMan',
      key: 'operateMan',
      width: 150,
    },
    {
      title: '操作时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
    },
    {
      title: '订单状态',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      width: 120,
      render: (status: number) => formatStatus(status),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
    },
  ]

  if (!orderDetail)
    return null

  return (
    <div className="app-container">
      <Card
        title="订单详情"
        extra={(
          <Button type="primary" icon={<LeftOutlined />} onClick={() => navigate('/mall/oms/order')}>
            返回列表
          </Button>
        )}
      >
        <Card type="inner" title="基本信息" style={{ marginBottom: 20 }}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="订单编号">{orderDetail.orderSn}</Descriptions.Item>
            <Descriptions.Item label="订单状态">
              <Tag color={getStatusColor(orderDetail.status)}>{formatStatus(orderDetail.status)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="订单来源">{formatSourceType(orderDetail.sourceType)}</Descriptions.Item>
            <Descriptions.Item label="订单类型">
              {orderDetail.orderType === 1 ? '秒杀订单' : '普通订单'}
            </Descriptions.Item>
            <Descriptions.Item label="支付方式">{formatPayType(orderDetail.payType)}</Descriptions.Item>
            <Descriptions.Item label="订单金额">
              ¥
              {orderDetail.totalAmount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="应付金额">
              ¥
              {orderDetail.payAmount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="运费">
              ¥
              {orderDetail.freightAmount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="活动优惠">
              ¥
              {orderDetail.promotionAmount?.toFixed(2) || '0.00'}
            </Descriptions.Item>
            <Descriptions.Item label="积分">
              +
              {orderDetail.integration}
            </Descriptions.Item>
            <Descriptions.Item label="成长值">
              +
              {orderDetail.growth}
            </Descriptions.Item>
            <Descriptions.Item label="活动">{orderDetail.promotionInfo}</Descriptions.Item>
          </Descriptions>
          <Divider />
          <Descriptions bordered column={2}>
            <Descriptions.Item label="下单人">
              {orderDetail.memberUsername}
            </Descriptions.Item>
            <Descriptions.Item label="下单时间">{orderDetail.createTime}</Descriptions.Item>
            <Descriptions.Item label="支付时间">{orderDetail.paymentTime || '-'}</Descriptions.Item>
            <Descriptions.Item label="发货时间">{orderDetail.deliveryTime || '-'}</Descriptions.Item>
            <Descriptions.Item label="确认收货时间">{orderDetail.receiveTime || '-'}</Descriptions.Item>
            <Descriptions.Item label="评分时间">{orderDetail.commentTime || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          type="inner"
          title="收货人信息"
          extra={(
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={handleEditReceiverInfo}
              disabled={orderDetail.status === 4}
            >
              修改收货人信息
            </Button>
          )}
          style={{ marginBottom: 20 }}
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="收货人">{orderDetail.receiverName}</Descriptions.Item>
            <Descriptions.Item label="电话号码">{orderDetail.receiverPhone}</Descriptions.Item>
            <Descriptions.Item label="地址">
              {orderDetail.receiverProvince}
              {' '}
              {orderDetail.receiverCity}
              {' '}
              {orderDetail.receiverRegion}
              {' '}
              {orderDetail.receiverDetailAddress}
            </Descriptions.Item>
            <Descriptions.Item label="邮编">{orderDetail.receiverPostCode}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          type="inner"
          title="商品信息"
          style={{ marginBottom: 20 }}
        >
          <Table
            columns={itemColumns}
            dataSource={orderDetail.orderItemList}
            rowKey="id"
            pagination={false}
          />
        </Card>

        <Card
          type="inner"
          title="费用信息"
          extra={(
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={handleEditMoneyInfo}
              disabled={orderDetail.status !== 1}
            >
              编辑费用信息
            </Button>
          )}
          style={{ marginBottom: 20 }}
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="商品价格">
              ¥
              {orderDetail.totalAmount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="运费">
              ¥
              {orderDetail.freightAmount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="优惠券">
              ¥
              {orderDetail.couponAmount?.toFixed(2) || '0.00'}
            </Descriptions.Item>
            <Descriptions.Item label="积分">
              ¥
              {orderDetail.integrationAmount?.toFixed(2) || '0.00'}
            </Descriptions.Item>
            <Descriptions.Item label="折扣">
              ¥
              {orderDetail.discountAmount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="优惠">
              ¥
              {orderDetail.promotionAmount?.toFixed(2) || '0.00'}
            </Descriptions.Item>
            <Descriptions.Item label="实际支付金额">
              ¥
              {orderDetail.payAmount.toFixed(2)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          type="inner"
          title="订单备注"
          extra={(
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={handleEditNote}
              disabled={orderDetail.status === 4}
            >
              修改备注
            </Button>
          )}
          style={{ marginBottom: 20 }}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="备注">{orderDetail.note || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card type="inner" title="其他信息" style={{ marginBottom: 20 }}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="发票类型">{orderDetail.billType === 0 ? '不开发票' : orderDetail.billType === 1 ? '电子发票' : '纸质发票'}</Descriptions.Item>
            <Descriptions.Item label="发票抬头">{orderDetail.billHeader || '-'}</Descriptions.Item>
            <Descriptions.Item label="发票内容">{orderDetail.billContent || '-'}</Descriptions.Item>
            <Descriptions.Item label="收票人邮箱">{orderDetail.billReceiverEmail || '-'}</Descriptions.Item>
            <Descriptions.Item label="收票人电话">{orderDetail.billReceiverPhone || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          type="inner"
          title="操作"
          style={{ marginBottom: 20 }}
        >
          {orderDetail.status === 0 && (
            <Button
              type="danger"
              icon={<CloseCircleOutlined />}
              onClick={handleCloseOrder}
              style={{ marginRight: 10 }}
            >
              关闭订单
            </Button>
          )}
          {orderDetail.status === 1 && (
            <>
              <Button
                type="primary"
                icon={<TruckOutlined />}
                onClick={handleGoToDelivery}
                style={{ marginRight: 10 }}
              >
                发货订单列表
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleDelivery}
              >
                订单发货
              </Button>
            </>
          )}
        </Card>

        <Card type="inner" title="操作记录">
          <Table
            columns={historyColumns}
            dataSource={orderDetail.historyList}
            rowKey="id"
            pagination={false}
          />
        </Card>
      </Card>

      {/* 收货人信息编辑对话框 */}
      <Modal
        title="修改收货人信息"
        open={receiverModalVisible}
        onCancel={() => setReceiverModalVisible(false)}
        onOk={handleSaveReceiverInfo}
      >
        <Form form={receiverForm} layout="vertical">
          <Form.Item name="receiverName" label="收货人姓名" rules={[{ required: true, message: '请输入收货人姓名' }]}>
            <Input placeholder="请输入收货人姓名" />
          </Form.Item>
          <Form.Item name="receiverPhone" label="收货人电话" rules={[{ required: true, message: '请输入收货人电话' }]}>
            <Input placeholder="请输入收货人电话" />
          </Form.Item>
          <Form.Item name="receiverPostCode" label="收货人邮编">
            <Input placeholder="请输入收货人邮编" />
          </Form.Item>
          <Form.Item name="receiverProvince" label="省份/直辖市">
            <Input placeholder="请输入省份/直辖市" />
          </Form.Item>
          <Form.Item name="receiverCity" label="城市">
            <Input placeholder="请输入城市" />
          </Form.Item>
          <Form.Item name="receiverRegion" label="区">
            <Input placeholder="请输入区" />
          </Form.Item>
          <Form.Item name="receiverDetailAddress" label="详细地址">
            <Input.TextArea rows={3} placeholder="请输入详细地址" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 费用信息编辑对话框 */}
      <Modal
        title="修改费用信息"
        open={moneyModalVisible}
        onCancel={() => setMoneyModalVisible(false)}
        onOk={handleSaveMoneyInfo}
      >
        <Form form={moneyForm} layout="vertical">
          <Form.Item name="freightAmount" label="运费金额" rules={[{ required: true, message: '请输入运费金额' }]}>
            <Input type="number" placeholder="请输入运费金额" />
          </Form.Item>
          <Form.Item name="discountAmount" label="折扣金额" rules={[{ required: true, message: '请输入折扣金额' }]}>
            <Input type="number" placeholder="请输入折扣金额" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 订单备注对话框 */}
      <Modal
        title="修改订单备注"
        open={noteModalVisible}
        onCancel={() => setNoteModalVisible(false)}
        onOk={handleSaveNote}
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 订单发货对话框 */}
      <Modal
        title="订单发货"
        open={deliveryModalVisible}
        onCancel={() => setDeliveryModalVisible(false)}
        onOk={handleSaveDelivery}
      >
        <Form form={deliveryForm} layout="vertical">
          <Form.Item name="deliveryCompany" label="物流公司" rules={[{ required: true, message: '请输入物流公司' }]}>
            <Input placeholder="请输入物流公司" />
          </Form.Item>
          <Form.Item name="deliverySn" label="物流单号" rules={[{ required: true, message: '请输入物流单号' }]}>
            <Input placeholder="请输入物流单号" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 关闭订单对话框 */}
      <Modal
        title="关闭订单"
        open={closeModalVisible}
        onCancel={() => setCloseModalVisible(false)}
        onOk={handleSaveCloseOrder}
      >
        <Form form={closeForm} layout="vertical">
          <Form.Item name="note" label="备注" rules={[{ required: true, message: '请输入备注' }]}>
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
