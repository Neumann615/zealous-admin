import type { SmsFlashPromotionSession } from '@/types/flash'
import { Button, Card, Table } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useControlTab } from '@zealous-admin/layout/index'
import { getFlashSessionSelectListAPI } from '@/apis/flashSession'

export default function SelectSession() {
  const navigate = useNavigate()
  const { openTab } = useControlTab()
  const [searchParams] = useSearchParams()

  // 秒杀时间段列表
  const [list, setList] = useState<SmsFlashPromotionSession[]>([])
  // 加载状态
  const [listLoading, setListLoading] = useState(false)

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getFlashSessionSelectListAPI({
        flashPromotionId: Number(searchParams.get('flashPromotionId')),
      })
      setListLoading(false)
      setList(res.data)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取秒杀时间段列表失败:', error)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    getList()
  }, [searchParams])

  // 格式化时间
  const formatTime = (time: string) => {
    return time ? dayjs(time, 'HH:mm:ss').format('HH:mm') : '-'
  }

  // 显示关联商品
  const handleShowRelation = (row: SmsFlashPromotionSession) => {
    openTab({
      key: `/mall/sms/flashProductRelation?flashPromotionId=${searchParams.get('flashPromotionId')}&flashPromotionSessionId=${row.id}`,
      label: '秒杀商品关联',
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
      title: '秒杀时间段名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
    },
    {
      title: '每日开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      align: 'center' as const,
      render: (startTime: string) => formatTime(startTime),
    },
    {
      title: '每日结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      align: 'center' as const,
      render: (endTime: string) => formatTime(endTime),
    },
    {
      title: '商品数量',
      dataIndex: 'productCount',
      key: 'productCount',
      align: 'center' as const,
    },
    {
      title: '操作',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, row: SmsFlashPromotionSession) => (
        <Button type="link" onClick={() => handleShowRelation(row)}>
          商品列表
        </Button>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card title="数据列表">
        <Table
          columns={columns}
          dataSource={list}
          loading={listLoading}
          bordered
          rowKey="id"
        />
      </Card>
    </div>
  )
}
