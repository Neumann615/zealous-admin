import type { CouponQueryParam, SmsCoupon } from '@/types/coupon'
import { PlusOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useControlTab } from '@zealous-admin/layout/index'
import { useAppMessage } from '@/hooks/useAppMessage'
import { couponDeleteByIdAPI, getCouponListAPI } from '@/apis/coupon'
import { couponPlatforms, couponTypes } from '@/utils/constant'

export default function Coupon() {
  const { message, modal } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()

  // 列表查询参数
  const [listQuery, setListQuery] = useState<CouponQueryParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 类型选项
  const typeOptions = couponTypes
  // 列表数据
  const [list, setList] = useState<SmsCoupon[]>([])
  // 总数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(false)

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
  }, [listQuery])

  // 重置搜索条件
  const handleResetSearch = () => {
    setListQuery({ pageNum: 1, pageSize: 10 })
  }

  // 搜索列表
  const handleSearchList = () => {
    setListQuery({ ...listQuery, pageNum: 1 })
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
  const handleDelete = (row: SmsCoupon) => {
    modal.confirm({
      title: '提示',
      content: '是否进行删除操作?',
      onOk: async () => {
        try {
          await couponDeleteByIdAPI(row.id!)
          message.success('删除成功!')
          getList()
        }
        catch (error) {
          console.error('删除优惠券失败:', error)
        }
      },
    })
  }

  // 格式化类型
  const formatType = (type: number) => {
    const findItem = typeOptions.find(item => item.value === type)
    return findItem?.label
  }

  // 格式化使用类型
  const formatUseType = (useType: number) => {
    if (useType === 0) {
      return '全场通用'
    }
    else if (useType === 1) {
      return '指定分类'
    }
    else {
      return '指定商品'
    }
  }

  // 格式化平台
  const formatPlatform = (platform: number) => {
    const findItem = couponPlatforms.find(item => item.value === platform)
    return findItem?.label
  }

  // 格式化状态
  const formatStatus = (endTime: string) => {
    const now = Date.now()
    const endDate = new Date(endTime)
    if (endDate.getTime() > now) {
      return '未过期'
    }
    else {
      return '已过期'
    }
  }

  // 格式化日期
  const formatDate = (date: string) => {
    return date ? dayjs(date).format('YYYY-MM-DD') : '-'
  }

  // 分页变化
  const handleTableChange = (pagination: { current?: number, pageSize?: number }) => {
    setListQuery({
      ...listQuery,
      pageNum: pagination.current || 1,
      pageSize: pagination.pageSize || 10,
    })
  }

  // 表格列
  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '优惠劵名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
    },
    {
      title: '优惠券类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      align: 'center' as const,
      render: (type: number) => formatType(type),
    },
    {
      title: '可使用商品',
      dataIndex: 'useType',
      key: 'useType',
      width: 120,
      align: 'center' as const,
      render: (useType: number) => formatUseType(useType),
    },
    {
      title: '使用门槛',
      key: 'minPoint',
      width: 140,
      align: 'center' as const,
      render: (_: any, row: SmsCoupon) => `满${row.minPoint}元可用`,
    },
    {
      title: '面值',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'center' as const,
      render: (amount: number) => `${amount}元`,
    },
    {
      title: '适用平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      align: 'center' as const,
      render: (platform: number) => formatPlatform(platform),
    },
    {
      title: '有效期',
      key: 'dateRange',
      width: 200,
      align: 'center' as const,
      render: (_: any, row: SmsCoupon) => `${formatDate(row.startTime!)}至${formatDate(row.endTime!)}`,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (_: any, row: SmsCoupon) => formatStatus(row.endTime!),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center' as const,
      render: (_: any, row: SmsCoupon) => (
        <Space>
          <Button type="link" onClick={() => handleView(row)}>
            查看
          </Button>
          <Button type="link" onClick={() => handleUpdate(row)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(row)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card
        className="filter-container"
        title="筛选搜索"
        extra={(
          <>
            <Button onClick={handleResetSearch} style={{ marginRight: 15 }}>重置</Button>
            <Button type="primary" onClick={handleSearchList}>查询搜索</Button>
          </>
        )}
      >
        <Form layout="inline">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px' }}>
            <Form.Item label="优惠券名称：">
              <Input
                value={listQuery.name}
                onChange={e => setListQuery({ ...listQuery, name: e.target.value })}
                placeholder="优惠券名称"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="优惠券类型：">
              <Select
                value={listQuery.type}
                onChange={val => setListQuery({ ...listQuery, type: val })}
                placeholder="全部"
                allowClear
                style={{ width: 200 }}
              >
                {typeOptions.map(item => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card
        title="数据列表"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加
          </Button>
        )}
      >
        <Table
          columns={columns}
          dataSource={list}
          loading={listLoading}
          bordered
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
    </div>
  )
}
