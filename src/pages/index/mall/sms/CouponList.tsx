import type { CouponQueryParam, SmsCoupon } from '@/types/coupon'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useControlTab } from '@zealous-admin/layout/index'
import { useAppMessage } from '@/hooks/useAppMessage'
import { couponDeleteByIdAPI, getCouponListAPI } from '@/apis/coupon'
import { couponPlatforms, couponTypes } from '@/utils/constant'

const { Search } = Input
const { Option } = Select

export default function CouponList() {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()

  // 列表查询参数
  const [listQuery, setListQuery] = useState<CouponQueryParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 类型选项
  const [typeOptions] = useState(couponTypes)
  // 列表数据
  const [list, setList] = useState<SmsCoupon[]>([])
  // 总数
  const [total, setTotal] = useState<number>(0)
  // 加载状态
  const [listLoading, setListLoading] = useState<boolean>(false)
  // 多选数据
  const [multipleSelection, setMultipleSelection] = useState<SmsCoupon[]>([])

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const response = await getCouponListAPI(listQuery)
      setListLoading(false)
      setList(response.data.list)
      setTotal(response.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取优惠券列表失败:', error)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    getList()
  }, [])

  // 重置搜索条件
  const handleResetSearch = () => {
    setListQuery({ pageNum: 1, pageSize: 10 })
  }

  // 搜索列表
  const handleSearchList = () => {
    setListQuery(prev => ({ ...prev, pageNum: 1 }))
    getList()
  }

  // 处理多选变化
  const handleSelectionChange = (_selectedRowKeys: React.Key[], selectedRows: SmsCoupon[]) => {
    setMultipleSelection(selectedRows)
  }

  // 处理页面大小变化
  const handleSizeChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: 1, pageSize: val }))
    getList()
  }

  // 处理当前页变化
  const handleCurrentChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: val }))
    getList()
  }

  // 添加优惠券
  const handleAdd = () => {
    openTab({ key: '/mall/sms/addCoupon', label: '添加优惠券' })
  }

  // 查看优惠券
  const handleView = (row: SmsCoupon) => {
    openTab({ key: `/mall/sms/couponHistory?id=${row.id}`, label: '优惠券领取记录' })
  }

  // 更新优惠券
  const handleUpdate = (row: SmsCoupon) => {
    openTab({ key: `/mall/sms/updateCoupon?id=${row.id}`, label: '编辑优惠券' })
  }

  // 删除优惠券
  const handleDelete = async (row: SmsCoupon) => {
    try {
      await couponDeleteByIdAPI(row.id!)
      message.success('删除成功!')
      getList()
    }
    catch (error) {
      console.error('删除优惠券失败:', error)
    }
  }

  // 格式化类型
  const formatType = (type: number) => {
    const findItem = typeOptions.find(item => item.value === type)
    return findItem?.label || ''
  }

  // 格式化使用类型
  const formatUseType = (useType: number) => {
    if (useType === 0)
      return '全场通用'
    else if (useType === 1)
      return '指定分类'
    else return '指定商品'
  }

  // 格式化平台
  const formatPlatform = (platform: number) => {
    const findItem = couponPlatforms.find(item => item.value === platform)
    return findItem?.label || ''
  }

  // 格式化日期
  const formatDate = (date?: string) => {
    if (!date)
      return 'N/A'
    return new Date(date).toLocaleDateString('zh-CN')
  }

  // 格式化状态
  const formatStatus = (endTime?: string) => {
    if (!endTime)
      return '未知'
    const now = Date.now()
    const endDate = new Date(endTime).getTime()
    return endDate > now
      ? (
          <Tag color="green">未过期</Tag>
        )
      : (
          <Tag color="red">已过期</Tag>
        )
  }

  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      align: 'center',
    },
    {
      title: '优惠券名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
    },
    {
      title: '优惠券类型',
      key: 'type',
      width: 120,
      align: 'center',
      render: (_: any, record: SmsCoupon) => formatType(record.type || 0),
    },
    {
      title: '可使用商品',
      key: 'useType',
      width: 120,
      align: 'center',
      render: (_: any, record: SmsCoupon) => formatUseType(record.useType || 0),
    },
    {
      title: '使用门槛',
      key: 'minPoint',
      width: 140,
      align: 'center',
      render: (_: any, record: SmsCoupon) => `满${record.minPoint}元可用`,
    },
    {
      title: '面值',
      key: 'amount',
      width: 100,
      align: 'center',
      render: (_: any, record: SmsCoupon) => `${record.amount}元`,
    },
    {
      title: '适用平台',
      key: 'platform',
      width: 120,
      align: 'center',
      render: (_: any, record: SmsCoupon) => formatPlatform(record.platform || 0),
    },
    {
      title: '有效期',
      key: 'dateRange',
      width: 180,
      align: 'center',
      render: (_: any, record: SmsCoupon) =>
        `${formatDate(record.startTime)} 至 ${formatDate(record.endTime)}`,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_: any, record: SmsCoupon) => formatStatus(record.endTime),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center',
      render: (_: any, record: SmsCoupon) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            查看
          </Button>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleUpdate(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该优惠券?"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const rowSelection = {
    selectedRowKeys: multipleSelection.map(item => item.id),
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
            <Form.Item label="优惠券名称：">
              <Input
                value={listQuery.name}
                onChange={e =>
                  setListQuery(prev => ({ ...prev, name: e.target.value }))}
                placeholder="优惠券名称"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="优惠券类型：">
              <Select
                value={listQuery.type}
                onChange={value =>
                  setListQuery(prev => ({ ...prev, type: value }))}
                placeholder="全部"
                allowClear
                style={{ width: 200 }}
              >
                {typeOptions.map(item => (
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
          <Button type="primary" onClick={handleAdd} icon={<PlusOutlined />}>
            添加
          </Button>
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
            onChange: (pagination) => {
              handleSizeChange(pagination.pageSize!)
              handleCurrentChange(pagination.current!)
            },
          }}
          rowKey="id"
        />
      </Card>
    </div>
  )
}
