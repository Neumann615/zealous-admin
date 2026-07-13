import type { OmsOrderReturnApply, ReturnApplyQueryParam } from '@/types/returnApply'
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Select,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useControlTab } from '@zealous-admin/layout/index'
import { getReturnApplyListAPI, returnApplyDeleteByIdsAPI } from '@/apis/returnApply'
import { useAppMessage } from '@/hooks/useAppMessage'

const { Option } = Select

export default function ReturnApply() {
  const { message } = useAppMessage()
  const { openTab } = useControlTab()

  // 默认处理状态
  const defaultStatusOptions = [
    {
      label: '待处理',
      value: 0,
    },
    {
      label: '退货中',
      value: 1,
    },
    {
      label: '已完成',
      value: 2,
    },
    {
      label: '已拒绝',
      value: 3,
    },
  ]

  // 列表查询参数
  const [listQuery, setListQuery] = useState<ReturnApplyQueryParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 列表数据
  const [list, setList] = useState<OmsOrderReturnApply[]>([])
  // 列表总条数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(false)
  // 多选数据
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<OmsOrderReturnApply[]>([])
  // 批量操作类型
  const [batchOperateType, setBatchOperateType] = useState<number>()

  // 获取列表
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getReturnApplyListAPI(listQuery)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      console.error('获取列表失败:', error)
    }
    finally {
      setListLoading(false)
    }
  }

  // 组件挂载
  useEffect(() => {
    getList()
  }, [listQuery])

  // 格式化状态
  const formatStatus = (status: number) => {
    return defaultStatusOptions.find(item => item.value === status)?.label
  }

  // 格式化退款金额
  const formatReturnAmount = (row: OmsOrderReturnApply) => {
    return row.productRealPrice * row.productCount
  }

  // 格式化日期
  const formatDateTime = (dateTime: string) => {
    return dateTime ? dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss') : '-'
  }

  // 处理选择变化
  const handleSelectionChange = (newSelectedRowKeys: React.Key[], newSelectedRows: OmsOrderReturnApply[]) => {
    setSelectedRowKeys(newSelectedRowKeys)
    setSelectedRows(newSelectedRows)
  }

  // 处理重置搜索
  const handleResetSearch = () => {
    setListQuery({ pageNum: 1, pageSize: 10 })
  }

  // 处理搜索列表
  const handleSearchList = () => {
    setListQuery({ ...listQuery, pageNum: 1 })
  }

  // 查看详情
  const handleViewDetail = (row: OmsOrderReturnApply) => {
    openTab({ key: `/mall/oms/returnApplyDetail?id=${row.id}`, label: '退货详情' })
  }

  // 处理批量操作
  const handleBatchOperate = async () => {
    if (!selectedRowKeys || selectedRowKeys.length < 1) {
      message.warning('请选择要操作的申请', 1)
      return
    }
    if (batchOperateType === 1) {
      // 批量删除
      await returnApplyDeleteByIdsAPI({ ids: selectedRows.map(item => item.id).join(',') })
      message.success('删除成功!', 1)
      getList()
      setSelectedRowKeys([])
      setSelectedRows([])
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

  // 表格列
  const columns = [
    {
      title: '服务单号',
      dataIndex: 'id',
      key: 'id',
      width: 180,
      align: 'center',
    },
    {
      title: '申请时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      align: 'center',
      render: (createTime: string) => formatDateTime(createTime),
    },
    {
      title: '用户账号',
      dataIndex: 'memberUsername',
      key: 'memberUsername',
      align: 'center',
    },
    {
      title: '退款金额',
      key: 'returnAmount',
      width: 180,
      align: 'center',
      render: (_: any, row: OmsOrderReturnApply) => `￥${formatReturnAmount(row)}`,
    },
    {
      title: '申请状态',
      key: 'status',
      width: 180,
      align: 'center',
      render: (_: any, row: OmsOrderReturnApply) => formatStatus(row.status),
    },
    {
      title: '处理时间',
      dataIndex: 'handleTime',
      key: 'handleTime',
      width: 180,
      align: 'center',
      render: (handleTime: string) => formatDateTime(handleTime),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      align: 'center',
      render: (_: any, row: OmsOrderReturnApply) => (
        <Button type="text" onClick={() => handleViewDetail(row)}>
          查看详情
        </Button>
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
            <Form.Item label="输入搜索：">
              <Input
                value={listQuery.id}
                onChange={e => setListQuery({ ...listQuery, id: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="服务单号"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="处理状态：">
              <Select
                value={listQuery.status}
                onChange={value => setListQuery({ ...listQuery, status: value })}
                placeholder="全部"
                clearable
                style={{ width: 200 }}
              >
                {defaultStatusOptions.map(item => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="申请时间：">
              <DatePicker
                value={listQuery.createTime ? dayjs(listQuery.createTime) : undefined}
                onChange={date => setListQuery({ ...listQuery, createTime: date ? date.format('YYYY-MM-DD') : undefined })}
                placeholder="请选择时间"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="操作人员：">
              <Input
                value={listQuery.handleMan}
                onChange={e => setListQuery({ ...listQuery, handleMan: e.target.value })}
                placeholder="全部"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="处理时间：">
              <DatePicker
                value={listQuery.handleTime ? dayjs(listQuery.handleTime) : undefined}
                onChange={date => setListQuery({ ...listQuery, handleTime: date ? date.format('YYYY-MM-DD') : undefined })}
                placeholder="请选择时间"
                style={{ width: 200 }}
              />
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
              <Option key={1} value={1}>
                批量删除
              </Option>
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
    </div>
  )
}
