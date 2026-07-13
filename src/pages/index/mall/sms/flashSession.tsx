import type { SmsFlashPromotionSession } from '@/types/flash'
import { PlusOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  TimePicker,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import {
  flashSessionCreateAPI,
  flashSessionDeleteByIdAPI,
  flashSessionUpdateByIdAPI,
  flashSessionUpdateStatusByIdAPI,
  getFlashSessionListAPI,
} from '@/apis/flashSession'
import { useAppMessage } from '@/hooks/useAppMessage'

const { TextArea } = Input

export default function FlashSession() {
  const { message, modal } = useAppMessage()
  // 秒杀时间段列表数据
  const [list, setList] = useState<SmsFlashPromotionSession[]>([])
  // 加载状态
  const [listLoading, setListLoading] = useState(false)

  // 编辑对话框
  const [dialogOpen, setdialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [flashSession, setFlashSession] = useState<SmsFlashPromotionSession>({
    name: '',
    status: 0,
  })
  const [form] = Form.useForm()

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getFlashSessionListAPI()
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
  }, [])

  // 格式化时间
  const formatTime = (time: string) => {
    return time ? dayjs(time, 'HH:mm:ss').format('HH:mm') : '-'
  }

  // 添加时间段
  const handleAdd = () => {
    setIsEdit(false)
    setFlashSession({ name: '', status: 1 })
    form.setFieldsValue({ name: '', status: 1, startTime: null, endTime: null })
    setdialogOpen(true)
  }

  // 状态改变
  const handleStatusChange = async (row: SmsFlashPromotionSession, checked: boolean) => {
    modal.confirm({
      title: '提示',
      content: '是否要修改该状态?',
      onOk: async () => {
        try {
          await flashSessionUpdateStatusByIdAPI(row.id!, { status: checked ? 1 : 0 })
          message.success('修改成功!')
          getList()
        }
        catch (error) {
          console.error('更新状态失败:', error)
        }
      },
    })
  }

  // 更新时间段
  const handleUpdate = (row: SmsFlashPromotionSession) => {
    setIsEdit(true)
    setFlashSession(row)
    form.setFieldsValue({
      name: row.name,
      status: row.status,
      startTime: row.startTime ? dayjs(row.startTime, 'HH:mm:ss') : null,
      endTime: row.endTime ? dayjs(row.endTime, 'HH:mm:ss') : null,
    })
    setdialogOpen(true)
  }

  // 删除时间段
  const handleDelete = (row: SmsFlashPromotionSession) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该时间段?',
      onOk: async () => {
        try {
          await flashSessionDeleteByIdAPI(row.id!)
          message.success('删除成功!')
          getList()
        }
        catch (error) {
          console.error('删除时间段失败:', error)
        }
      },
    })
  }

  // 处理对话框确认
  const handleDialogConfirm = async () => {
    try {
      const values = await form.validateFields()
      const data: SmsFlashPromotionSession = {
        ...flashSession,
        name: values.name,
        status: values.status ? 1 : 0,
        startTime: values.startTime?.format('HH:mm:ss'),
        endTime: values.endTime?.format('HH:mm:ss'),
      }
      if (isEdit) {
        await flashSessionUpdateByIdAPI(flashSession.id!, data)
        message.success('修改成功！')
      }
      else {
        await flashSessionCreateAPI(data)
        message.success('添加成功！')
      }
      setdialogOpen(false)
      getList()
    }
    catch (error) {
      console.error('处理时间段失败:', error)
    }
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
      title: '启用',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: number, row: SmsFlashPromotionSession) => (
        <Switch
          checked={status === 1}
          onChange={checked => handleStatusChange(row, checked)}
          checkedChildren="启用"
          unCheckedChildren="不启用"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      align: 'center' as const,
      render: (_: any, row: SmsFlashPromotionSession) => (
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
          rowKey="id"
        />
      </Card>

      {/* 添加/编辑对话框 */}
      <Modal
        title="添加时间段"
        open={dialogOpen}
        onCancel={() => setdialogOpen(false)}
        onOk={handleDialogConfirm}
        width={500}
      >
        <Form form={form} layout="vertical" initialValues={flashSession}>
          <Form.Item
            name="name"
            label="秒杀时间段名称："
            rules={[{ required: true, message: '请输入秒杀时间段名称' }]}
          >
            <Input placeholder="请输入秒杀时间段名称" />
          </Form.Item>
          <Form.Item
            name="startTime"
            label="每日开始时间："
            rules={[{ required: true, message: '请选择每日开始时间' }]}
          >
            <TimePicker placeholder="请选择时间" format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="endTime"
            label="每日结束时间："
            rules={[{ required: true, message: '请选择每日结束时间' }]}
          >
            <TimePicker placeholder="请选择时间" format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="status"
            label="是否启用："
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="启用" unCheckedChildren="不启用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
