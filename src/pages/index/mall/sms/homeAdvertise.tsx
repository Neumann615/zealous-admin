import type { HomeAdvertiseQueryParam, SmsHomeAdvertise } from '@/types/homeAdvertise'
import { PlusOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Form,
  Image,
  Input,
  Select,
  Space,
  Switch,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useControlTab } from '@zealous-admin/layout/index'
import { useAppMessage } from '@/hooks/useAppMessage'
import { deleteHomeAdvertiseAPI, getHomeAdvertiseListAPI, homeAdvertiseUpdateStatusAPI } from '@/apis/homeAdvertise'

export default function Advertise() {
  const { message, modal } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()

  // 列表查询参数
  const [listQuery, setListQuery] = useState<HomeAdvertiseQueryParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 轮播位置选项
  const typeOptions = [
    { label: 'PC首页轮播', value: 0 },
    { label: 'APP首页轮播', value: 1 },
  ]
  // 列表数据
  const [list, setList] = useState<SmsHomeAdvertise[]>([])
  // 总条数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(false)

  // 批量操作类型
  const operates = [
    { label: '删除', value: 0 },
  ]
  const [operateType, setOperateType] = useState<number>()

  // 选中的条目
  const [selectedRows, setSelectedRows] = useState<SmsHomeAdvertise[]>([])

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getHomeAdvertiseListAPI(listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取列表失败:', error)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    getList()
  }, [listQuery])

  // 重置搜索
  const handleResetSearch = () => {
    setListQuery({ pageNum: 1, pageSize: 10 })
  }

  // 搜索列表
  const handleSearchList = () => {
    setListQuery({ ...listQuery, pageNum: 1 })
  }

  // 处理表格选择变化
  const handleSelectionChange = (selectedRowKeys: React.Key[], selectedRows: SmsHomeAdvertise[]) => {
    setSelectedRows(selectedRows)
  }

  // 处理状态更新
  const handleUpdateStatus = async (row: SmsHomeAdvertise, checked: boolean) => {
    modal.confirm({
      title: '提示',
      content: '是否要修改上线/下线状态?',
      onOk: async () => {
        try {
          await homeAdvertiseUpdateStatusAPI({ id: row.id!, status: checked ? 1 : 0 })
          getList()
          message.success('修改成功!')
        }
        catch (error) {
          console.error('修改失败:', error)
        }
      },
    })
  }

  // 删除广告
  const deleteHomeAdvertise = async (ids: number[]) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该广告?',
      onOk: async () => {
        try {
          await deleteHomeAdvertiseAPI({ ids: ids.join(',') })
          getList()
          message.success('删除成功!')
        }
        catch (error) {
          console.error('删除操作失败:', error)
        }
      },
    })
  }

  // 处理删除
  const handleDelete = (row: SmsHomeAdvertise) => {
    deleteHomeAdvertise([row.id!])
  }

  // 处理批量操作
  const handleBatchOperate = async () => {
    if (selectedRows.length < 1) {
      message.warning('请选择一条记录')
      return
    }
    if (operateType === 0) {
      // 删除
      deleteHomeAdvertise(selectedRows.map(item => item.id!))
    }
    else {
      message.warning('请选择批量操作类型')
    }
  }

  // 处理添加
  const handleAdd = () => {
    openTab({ key: '/mall/sms/addAdvertise', label: '添加广告' })
  }

  // 处理更新
  const handleUpdate = (row: SmsHomeAdvertise) => {
    openTab({ key: `/mall/sms/updateAdvertise?id=${row.id}`, label: '编辑广告' })
  }

  // 格式化类型
  const formatType = (type: number) => {
    return type === 1 ? 'APP首页轮播' : 'PC首页轮播'
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
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '广告名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
    },
    {
      title: '广告位置',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      align: 'center' as const,
      render: (type: number) => formatType(type),
    },
    {
      title: '广告图片',
      dataIndex: 'pic',
      key: 'pic',
      width: 180,
      align: 'center' as const,
      render: (pic: string) => <Image src={pic} style={{ height: 80, width: 150 }} />,
    },
    {
      title: '时间',
      key: 'time',
      width: 240,
      align: 'center' as const,
      render: (_: any, row: SmsHomeAdvertise) => (
        <div>
          <div>
            开始时间：
            {formatDateTime(row.startTime!)}
          </div>
          <div>
            到期时间：
            {formatDateTime(row.endTime!)}
          </div>
        </div>
      ),
    },
    {
      title: '上线/下线',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: number, row: SmsHomeAdvertise) => (
        <Switch
          checked={status === 1}
          onChange={checked => handleUpdateStatus(row, checked)}
          checkedChildren="上线"
          unCheckedChildren="下线"
        />
      ),
    },
    {
      title: '点击次数',
      dataIndex: 'clickCount',
      key: 'clickCount',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '生成订单',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: (_: any, row: SmsHomeAdvertise) => (
        <Space>
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
            <Form.Item label="广告名称：">
              <Input
                value={listQuery.name}
                onChange={e => setListQuery({ ...listQuery, name: e.target.value })}
                placeholder="广告名称"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="广告位置：">
              <Select
                value={listQuery.type}
                onChange={val => setListQuery({ ...listQuery, type: val })}
                placeholder="全部"
                allowClear
                style={{ width: 150 }}
              >
                {typeOptions.map(item => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="到期时间：">
              <Input
                value={listQuery.endTime}
                onChange={e => setListQuery({ ...listQuery, endTime: e.target.value })}
                placeholder="到期时间"
                style={{ width: 200 }}
              />
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card
        title="数据列表"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加广告
          </Button>
        )}
      >
        <Table
          columns={columns}
          dataSource={list}
          loading={listLoading}
          bordered
          rowSelection={{
            onChange: handleSelectionChange,
          }}
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

      {/* 批量操作 */}
      <Card style={{ marginTop: 20 }}>
        <Space>
          <Select
            value={operateType}
            onChange={setOperateType}
            placeholder="批量操作"
            style={{ width: 150 }}
          >
            {operates.map(item => (
              <Select.Option key={item.value} value={item.value}>
                {item.label}
              </Select.Option>
            ))}
          </Select>
          <Button type="primary" onClick={handleBatchOperate}>
            确定
          </Button>
        </Space>
      </Card>
    </div>
  )
}
