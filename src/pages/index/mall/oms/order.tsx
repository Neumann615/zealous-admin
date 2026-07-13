import type { OmsOrder, OrderQueryParam } from '@/types/order'
import {
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  TruckOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useControlTab } from '@zealous-admin/layout/index'
import { getOrderListAPI, orderDeleteByIdsAPI, orderUpdateCloseAPI } from '@/apis/order'
import { useMallOrderStore } from '@/store/mall/order'

const { Search } = Input
const { Option } = Select

export default function OrderList() {
  const { openTab } = useControlTab()
  const orderStore = useMallOrderStore()

  // 订单列表查询参数
  const [listQuery, setListQuery] = useState<OrderQueryParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 订单列表数据
  const [list, setList] = useState<OmsOrder[]>([])
  // 列表加载状态
  const [listLoading, setListLoading] = useState(false)
  // 分页数据
  const [total, setTotal] = useState(0)
  // 多选数据
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<OmsOrder[]>([])
  // 批量操作类型
  const [batchOperateType, setBatchOperateType] = useState<number>()
  // 关闭订单对话框
  const [closeOrderModalVisible, setCloseOrderModalVisible] = useState(false)
  const [closeOrderForm] = Form.useForm()

  // 订单状态选项
  const statusOptions = [
    { label: '待付款', value: 0 },
    { label: '待发货', value: 1 },
    { label: '已发货', value: 2 },
    { label: '已完成', value: 3 },
    { label: '已关闭', value: 4 },
  ]

  // 订单类型选项
  const orderTypeOptions = [
    { label: '正常订单', value: 0 },
    { label: '秒杀订单', value: 1 },
  ]

  // 订单来源选项
  const sourceTypeOptions = [
    { label: 'PC订单', value: 0 },
    { label: 'APP订单', value: 1 },
  ]

  // 批量操作选项
  const batchOperateOptions = [
    { label: '批量发货', value: 1 },
    { label: '关闭订单', value: 2 },
    { label: '删除订单', value: 3 },
  ]

  // 获取订单列表
  const getList = async () => {
    setListLoading(true)
    try {
      const response = await getOrderListAPI(listQuery)
      setListLoading(false)
      setList(response.data.list)
      setTotal(response.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取订单列表失败:', error)
    }
  }

  // 初始化列表
  useEffect(() => {
    getList()
  }, [listQuery])

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

  // 处理重置搜索
  const handleResetSearch = () => {
    setListQuery({ pageNum: 1, pageSize: 10 })
  }

  // 处理搜索列表
  const handleSearchList = () => {
    setListQuery({ ...listQuery, pageNum: 1 })
  }

  // 处理查看订单
  const handleViewOrder = (row: OmsOrder) => {
    openTab({ key: `/mall/oms/orderDetail?id=${row.id}`, label: '订单详情' })
  }

  // 处理关闭订单
  const handleCloseOrder = (row: OmsOrder) => {
    setSelectedRows([row])
    closeOrderForm.setFieldsValue({ note: '' })
    setCloseOrderModalVisible(true)
  }

  // 处理订单发货
  const handleDeliveryOrder = (row: OmsOrder) => {
    orderStore.setDeliverOrderList([row])
    openTab({ key: '/mall/oms/deliverOrderList', label: '发货订单列表' })
  }

  // 处理删除订单
  const handleDeleteOrder = async (row: OmsOrder) => {
    await deleteOrderFn([row.id])
  }

  // 处理批量操作
  const handleBatchOperate = async () => {
    if (!selectedRowKeys || selectedRowKeys.length < 1) {
      message.warning('请选择要操作的订单', 1)
      return
    }
    if (batchOperateType === 1) {
      const listItems = selectedRows.filter(item => item.status === 1)
      if (!listItems || listItems.length < 1) {
        message.warning('选中订单中没有可以发货的订单', 1)
        return
      }
      orderStore.setDeliverOrderList(listItems)
      openTab({ key: '/mall/oms/deliverOrderList', label: '发货订单列表' })
    }
    else if (batchOperateType === 2) {
      const closeOrderList = selectedRows.filter(item => item.status === 0)
      if (closeOrderList.length === 0) {
        message.warning('选中订单中没有待付款订单', 1)
        return
      }
      setSelectedRows(closeOrderList)
      closeOrderForm.setFieldsValue({ note: '' })
      setCloseOrderModalVisible(true)
    }
    else if (batchOperateType === 3) {
      const deleteOrderList = selectedRows.filter(item => item.status === 4)
      if (deleteOrderList.length === 0) {
        message.warning('选中订单中没有已关闭订单', 1)
        return
      }
      const ids = deleteOrderList.map(item => item.id)
      await deleteOrderFn(ids)
    }
  }

  // 删除订单函数
  const deleteOrderFn = async (ids: number[]) => {
    try {
      await orderDeleteByIdsAPI({ ids: ids.join(',') })
      message.success('删除成功！', 1)
      getList()
      setSelectedRowKeys([])
      setSelectedRows([])
    }
    catch (error) {
      console.error('删除订单失败:', error)
    }
  }

  // 处理关闭订单确认
  const handleCloseOrderConfirm = async () => {
    try {
      const values = await closeOrderForm.validateFields()
      const orderIds = selectedRows.map(item => item.id).join(',')
      await orderUpdateCloseAPI({ ids: orderIds, note: values.note })
      setCloseOrderModalVisible(false)
      getList()
      message.success('关闭成功', 1)
      setSelectedRowKeys([])
      setSelectedRows([])
    }
    catch (error) {
      console.error('关闭订单失败:', error)
    }
  }

  // 处理分页变化
  const handleTableChange = (pagination: { current?: number, pageSize?: number }) => {
    setListQuery({
      ...listQuery,
      pageNum: pagination.current || 1,
      pageSize: pagination.pageSize || 10,
    })
  }

  // 处理选择变化
  const handleSelectionChange = (newSelectedRowKeys: React.Key[], newSelectedRows: OmsOrder[]) => {
    setSelectedRowKeys(newSelectedRowKeys)
    setSelectedRows(newSelectedRows)
  }

  // 表格列
  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center',
    },
    {
      title: '订单编号',
      dataIndex: 'orderSn',
      key: 'orderSn',
      width: 180,
      align: 'center',
    },
    {
      title: '提交时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      align: 'center',
    },
    {
      title: '用户账号',
      dataIndex: 'memberUsername',
      key: 'memberUsername',
      align: 'center',
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'center',
      render: (amount: number) => `¥${amount}`,
    },
    {
      title: '支付方式',
      key: 'payType',
      width: 120,
      align: 'center',
      render: (_: any, record: OmsOrder) => formatPayType(record.payType),
    },
    {
      title: '订单来源',
      key: 'sourceType',
      width: 120,
      align: 'center',
      render: (_: any, record: OmsOrder) => formatSourceType(record.sourceType),
    },
    {
      title: '订单状态',
      key: 'status',
      width: 120,
      align: 'center',
      render: (_: any, record: OmsOrder) => (
        <Tag color={getStatusColor(record.status)}>{formatStatus(record.status)}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center',
      render: (_: any, record: OmsOrder) => (
        <>
          <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewOrder(record)}>
            查看
          </Button>
          {record.status === 1 && (
            <Button type="text" icon={<TruckOutlined />} onClick={() => handleDeliveryOrder(record)}>
              发货
            </Button>
          )}
          {record.status === 0 && (
            <Button type="text" icon={<CloseCircleOutlined />} onClick={() => handleCloseOrder(record)}>
              关闭
            </Button>
          )}
          {record.status === 4 && (
            <Popconfirm title="确定删除该订单?" onConfirm={() => handleDeleteOrder(record)}>
              <Button type="text" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </>
      ),
    },
  ]

  // 表格选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: handleSelectionChange,
  }

  return (
    <div className="app-container">
      <Card
        className="filter-container"
        title="筛选搜索"
        extra={(
          <>
            <Button onClick={handleResetSearch} style={{ marginRight: 15 }}>
              重置
            </Button>
            <Button type="primary" onClick={handleSearchList}>
              查询搜索
            </Button>
          </>
        )}
      >
        <Form layout="inline">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px' }}>
            <Form.Item label="订单编号：">
              <Input
                value={listQuery.orderSn}
                onChange={e =>
                  setListQuery({ ...listQuery, orderSn: e.target.value })}
                placeholder="请输入订单编号"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="收货人：">
              <Input
                value={listQuery.receiverKeyword}
                onChange={e =>
                  setListQuery({ ...listQuery, receiverKeyword: e.target.value })}
                placeholder="请输入收货人姓名/手机号"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="提交时间：">
              <DatePicker
                value={listQuery.createTime ? new Date(listQuery.createTime) : undefined}
                onChange={date =>
                  setListQuery({
                    ...listQuery,
                    createTime: date ? date.format('YYYY-MM-DD') : undefined,
                  })}
                placeholder="请选择时间"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="订单状态：">
              <Select
                value={listQuery.status}
                onChange={value =>
                  setListQuery({ ...listQuery, status: value })}
                placeholder="全部"
                clearable
                style={{ width: 200 }}
              >
                {statusOptions.map(item => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="订单类型：">
              <Select
                value={listQuery.orderType}
                onChange={value =>
                  setListQuery({ ...listQuery, orderType: value })}
                placeholder="全部"
                clearable
                style={{ width: 200 }}
              >
                {orderTypeOptions.map(item => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="订单来源：">
              <Select
                value={listQuery.sourceType}
                onChange={value =>
                  setListQuery({ ...listQuery, sourceType: value })}
                placeholder="全部"
                clearable
                style={{ width: 200 }}
              >
                {sourceTypeOptions.map(item => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card
        className="operate-container"
        title="数据列表"
        extra={(
          <>
            <Select
              value={batchOperateType}
              onChange={setBatchOperateType}
              placeholder="批量操作"
              style={{ width: 150, marginRight: 15 }}
            >
              {batchOperateOptions.map(item => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
            <Button type="primary" onClick={handleBatchOperate}>
              确定
            </Button>
          </>
        )}
      >
        <Table
          columns={columns}
          dataSource={list}
          loading={listLoading}
          bordered
          rowSelection={rowSelection}
          pagination={{
            current: listQuery.pageNum,
            pageSize: listQuery.pageSize,
            total,
            pageSizeOptions: ['5', '10', '15'],
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          rowKey="id"
        />
      </Card>

      {/* 关闭订单对话框 */}
      <Modal
        title="关闭订单"
        open={closeOrderModalVisible}
        onCancel={() => setCloseOrderModalVisible(false)}
        onOk={handleCloseOrderConfirm}
      >
        <Form form={closeOrderForm} layout="vertical">
          <Form.Item
            name="note"
            label="操作备注："
            rules={[{ required: true, message: '请输入备注' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
