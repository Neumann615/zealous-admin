import type { PageParam } from '@/types/common'
import type { SmsFlashPromotion } from '@/types/flash'
import { PlusOutlined, UnorderedListOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useControlTab } from '@zealous-admin/layout/index'
import { useAppMessage } from '@/hooks/useAppMessage'
import {
  flashCreateAPI,
  flashDeleteByIdAPI,
  flashUpdateByIdAPI,
  flashUpdateStatusByIdAPI,
  getFlashListAPI,
} from '@/apis/flash'

export default function Flash() {
  const { message, modal } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()

  // 列表查询参数
  const [listQuery, setListQuery] = useState<PageParam & { keyword?: string }>({
    pageNum: 1,
    pageSize: 10,
    keyword: '',
  })
  // 列表数据
  const [list, setList] = useState<SmsFlashPromotion[]>([])
  // 总条数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(false)

  // 编辑对话框
  const [dialogOpen, setdialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [flashPromotion, setFlashPromotion] = useState<SmsFlashPromotion>({
    title: '',
    status: 0,
  })
  const [form] = Form.useForm()

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getFlashListAPI(listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取秒杀活动列表失败:', error)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    getList()
  }, [listQuery])

  // 格式化活动状态
  const formatActiveStatus = (row: SmsFlashPromotion) => {
    const nowDate = Date.now()
    const startDate = row.startDate ? new Date(row.startDate).getTime() : 0
    const endDate = row.endDate ? new Date(row.endDate).getTime() : 0
    if (nowDate >= startDate && nowDate <= endDate) {
      return '活动进行中'
    }
    else if (nowDate > endDate) {
      return '活动已结束'
    }
    else {
      return '活动未开始'
    }
  }

  // 格式化日期
  const formatDate = (date: string) => {
    return date ? dayjs(date).format('YYYY-MM-DD') : '-'
  }

  // 重置搜索
  const handleResetSearch = () => {
    setListQuery({ pageNum: 1, pageSize: 10 })
  }

  // 搜索列表
  const handleSearchList = () => {
    setListQuery({ ...listQuery, pageNum: 1 })
  }

  // 添加活动
  const handleAdd = () => {
    setIsEdit(false)
    setFlashPromotion({ title: '', status: 0 })
    form.setFieldsValue({ title: '', status: 0, startDate: null, endDate: null })
    setdialogOpen(true)
  }

  // 显示时间段列表
  const handleShowSessionList = () => {
    openTab({ key: '/mall/sms/flashSession', label: '秒杀时间段列表' })
  }

  // 状态改变
  const handleStatusChange = async (row: SmsFlashPromotion, checked: boolean) => {
    modal.confirm({
      title: '提示',
      content: '是否要修改该状态?',
      onOk: async () => {
        try {
          await flashUpdateStatusByIdAPI(row.id!, { status: checked ? 1 : 0 })
          message.success('修改成功!')
          getList()
        }
        catch (error) {
          console.error('更新状态失败:', error)
        }
      },
    })
  }

  // 删除活动
  const handleDelete = (row: SmsFlashPromotion) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该活动?',
      onOk: async () => {
        try {
          await flashDeleteByIdAPI(row.id!)
          message.success('删除成功!')
          getList()
        }
        catch (error) {
          console.error('删除活动失败:', error)
        }
      },
    })
  }

  // 编辑活动
  const handleUpdate = (row: SmsFlashPromotion) => {
    setIsEdit(true)
    setFlashPromotion(row)
    form.setFieldsValue({
      title: row.title,
      status: row.status,
      startDate: row.startDate ? dayjs(row.startDate) : null,
      endDate: row.endDate ? dayjs(row.endDate) : null,
    })
    setdialogOpen(true)
  }

  // 处理对话框确认
  const handleDialogConfirm = async () => {
    try {
      const values = await form.validateFields()
      const data: SmsFlashPromotion = {
        ...flashPromotion,
        title: values.title,
        status: values.status,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
      }
      if (isEdit) {
        await flashUpdateByIdAPI(flashPromotion.id!, data)
        message.success('修改成功！')
      }
      else {
        await flashCreateAPI(data)
        message.success('添加成功！')
      }
      setdialogOpen(false)
      getList()
    }
    catch (error) {
      console.error('处理活动失败:', error)
    }
  }

  // 选择时间段
  const handleSelectSession = (row: SmsFlashPromotion) => {
    openTab({ key: `/mall/sms/selectSession?flashPromotionId=${row.id}`, label: '选择时间段' })
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
      title: '活动标题',
      dataIndex: 'title',
      key: 'title',
      align: 'center' as const,
    },
    {
      title: '活动状态',
      key: 'status',
      width: 140,
      align: 'center' as const,
      render: (_: any, row: SmsFlashPromotion) => formatActiveStatus(row),
    },
    {
      title: '开始时间',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 140,
      align: 'center' as const,
      render: (startDate: string) => formatDate(startDate),
    },
    {
      title: '结束时间',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 140,
      align: 'center' as const,
      render: (endDate: string) => formatDate(endDate),
    },
    {
      title: '上线/下线',
      dataIndex: 'status',
      key: 'switch',
      width: 200,
      align: 'center' as const,
      render: (status: number, row: SmsFlashPromotion) => (
        <Switch
          checked={status === 1}
          onChange={checked => handleStatusChange(row, checked)}
          checkedChildren="上线"
          unCheckedChildren="下线"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center' as const,
      render: (_: any, row: SmsFlashPromotion) => (
        <Space>
          <Button type="link" onClick={() => handleSelectSession(row)}>
            设置商品
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
            <Form.Item label="活动名称：">
              <Input
                value={listQuery.keyword}
                onChange={e => setListQuery({ ...listQuery, keyword: e.target.value })}
                placeholder="活动名称"
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
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加活动
            </Button>
            <Button type="primary" icon={<UnorderedListOutlined />} onClick={handleShowSessionList}>
              秒杀时间段列表
            </Button>
          </Space>
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

      {/* 添加/编辑对话框 */}
      <Modal
        title={isEdit ? '编辑活动' : '添加活动'}
        open={dialogOpen}
        onCancel={() => setdialogOpen(false)}
        onOk={handleDialogConfirm}
        width={500}
      >
        <Form form={form} layout="vertical" initialValues={flashPromotion}>
          <Form.Item
            name="title"
            label="活动标题："
            rules={[{ required: true, message: '请输入活动标题' }]}
          >
            <Input placeholder="请输入活动标题" />
          </Form.Item>
          <Form.Item
            name="startDate"
            label="开始时间："
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <DatePicker placeholder="请选择时间" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="endDate"
            label="结束时间："
            rules={[{ required: true, message: '请选择结束时间' }]}
          >
            <DatePicker placeholder="请选择时间" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="status"
            label="上线/下线："
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Switch checkedChildren="上线" unCheckedChildren="下线" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
