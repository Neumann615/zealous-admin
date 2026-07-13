import type { CouponHistoryQueryParam, SmsCoupon, SmsCouponHistory } from '@/types/coupon'
import { Button, Card, Col, Form, Input, Row, Select, Table } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCouponByIdAPI, getCouponHistoryListAPI } from '@/apis/coupon'
import { couponTypes } from '@/utils/constant'

export default function CouponHistory() {
  const [searchParams] = useSearchParams()

  // 优惠券详情
  const [coupon, setCoupon] = useState<SmsCoupon>({} as SmsCoupon)
  // 优惠券历史列表查询参数
  const [listQuery, setListQuery] = useState<CouponHistoryQueryParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 优惠券历史列表数据
  const [list, setList] = useState<SmsCouponHistory[]>([])
  // 总记录数
  const [total, setTotal] = useState(0)
  // 表格数据加载状态
  const [listLoading, setListLoading] = useState(false)

  // 使用状态选项
  const useTypeOptions = [
    { label: '未使用', value: 0 },
    { label: '已使用', value: 1 },
    { label: '已过期', value: 2 },
  ]

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const response = await getCouponHistoryListAPI(listQuery)
      setListLoading(false)
      setList(response.data.list)
      setTotal(response.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取优惠券历史列表失败:', error)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    const couponId = Number(searchParams.get('id'))
    // 获取优惠券详情
    getCouponByIdAPI(couponId).then((res) => {
      setCoupon(res.data)
    })
    // 设置优惠券ID用于查询历史记录
    setListQuery(prev => ({ ...prev, couponId }))
  }, [searchParams])

  useEffect(() => {
    if (listQuery.couponId) {
      getList()
    }
  }, [listQuery])

  // 重置搜索条件
  const handleResetSearch = () => {
    setListQuery({
      pageNum: 1,
      pageSize: 10,
      couponId: Number(searchParams.get('id')),
    })
  }

  // 搜索列表
  const handleSearchList = () => {
    setListQuery({ ...listQuery, pageNum: 1 })
  }

  // 优惠券类型过滤器
  const formatType = (type: number) => {
    const found = couponTypes.find(option => option.value === type)
    return found ? found.label : ''
  }

  // 优惠券使用类型过滤器
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

  // 优惠券过期状态过滤器
  const formatStatus = (endTime: string) => {
    if (!endTime)
      return ''
    const endTimeDate = new Date(endTime).getTime()
    const now = Date.now()
    return endTimeDate > now ? '未过期' : '已过期'
  }

  // 获取类型过滤器
  const formatGetType = (type: number) => {
    return type === 1 ? '主动获取' : '后台赠送'
  }

  // 优惠券历史使用类型过滤器
  const formatCouponHistoryUseType = (useType: number) => {
    if (useType === 0) {
      return '未使用'
    }
    else if (useType === 1) {
      return '已使用'
    }
    else {
      return '已过期'
    }
  }

  // 格式化日期
  const formatDate = (date: string) => {
    return date ? dayjs(date).format('YYYY-MM-DD') : '-'
  }

  // 格式化日期时间
  const formatDateTime = (date: string) => {
    return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
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
      title: '优惠码',
      dataIndex: 'couponCode',
      key: 'couponCode',
      width: 160,
      align: 'center' as const,
    },
    {
      title: '领取会员',
      dataIndex: 'memberNickname',
      key: 'memberNickname',
      width: 140,
      align: 'center' as const,
    },
    {
      title: '领取方式',
      dataIndex: 'getType',
      key: 'getType',
      width: 100,
      align: 'center' as const,
      render: (getType: number) => formatGetType(getType),
    },
    {
      title: '领取时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      align: 'center' as const,
      render: (createTime: string) => formatDateTime(createTime),
    },
    {
      title: '当前状态',
      dataIndex: 'useStatus',
      key: 'useStatus',
      width: 140,
      align: 'center' as const,
      render: (useStatus: number) => formatCouponHistoryUseType(useStatus),
    },
    {
      title: '使用时间',
      dataIndex: 'useTime',
      key: 'useTime',
      width: 160,
      align: 'center' as const,
      render: (useTime: string) => formatDateTime(useTime),
    },
    {
      title: '订单编号',
      dataIndex: 'orderSn',
      key: 'orderSn',
      align: 'center' as const,
      render: (orderSn: string) => orderSn || 'N/A',
    },
  ]

  return (
    <div className="app-container" style={{ width: '80%', margin: '20px auto' }}>
      {/* 优惠券详情 */}
      <Card title="优惠券详情" style={{ marginBottom: 20 }}>
        <Row gutter={20}>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>名称</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>{coupon.name}</div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>优惠券类型</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>{formatType(coupon.type)}</div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>可使用商品</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>{formatUseType(coupon.useType)}</div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>使用门槛</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              满
              {coupon.minPoint}
              元可用
            </div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>面值</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              {coupon.amount}
              元
            </div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>状态</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>{formatStatus(coupon.endTime!)}</div>
          </Col>
        </Row>
        <Row gutter={20} style={{ marginTop: 20 }}>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>有效期</div>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13 }}>
              {formatDate(coupon.startTime!)}
              至
              {formatDate(coupon.endTime!)}
            </div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>总发行量</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>{coupon.publishCount}</div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>已领取</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>{coupon.receiveCount}</div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>待领取</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              {(coupon.publishCount || 0) - (coupon.receiveCount || 0)}
            </div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>已使用</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>{coupon.useCount}</div>
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>未使用</div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              {(coupon.publishCount || 0) - (coupon.useCount || 0)}
            </div>
          </Col>
        </Row>
      </Card>

      {/* 筛选搜索 */}
      <Card
        className="filter-container"
        title="筛选搜索"
        style={{ marginBottom: 20 }}
        extra={(
          <>
            <Button onClick={handleResetSearch} style={{ marginRight: 15 }}>重置</Button>
            <Button type="primary" onClick={handleSearchList}>查询搜索</Button>
          </>
        )}
      >
        <Form layout="inline">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px' }}>
            <Form.Item label="使用状态：">
              <Select
                value={listQuery.useStatus}
                onChange={val => setListQuery({ ...listQuery, useStatus: val })}
                placeholder="全部"
                allowClear
                style={{ width: 150 }}
              >
                {useTypeOptions.map(item => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="订单编号：">
              <Input
                value={listQuery.orderSn}
                onChange={e => setListQuery({ ...listQuery, orderSn: e.target.value })}
                placeholder="订单编号"
                style={{ width: 200 }}
              />
            </Form.Item>
          </div>
        </Form>
      </Card>

      {/* 优惠券历史列表 */}
      <Card title="领取记录">
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
