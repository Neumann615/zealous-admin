import type { PageParam } from '@/types/common'
import type { OmsOrderReturnReason } from '@/types/returnReason'
import { PlusOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import {
  getReturnReasonByIdAPI,
  getReturnReasonListAPI,
  returnReasonCreateAPI,
  returnReasonDeleteByIdsAPI,
  returnReasonUpdateAPI,
  returnReasonUpdateStatusAPI,
} from '@/apis/returnReason'
import { useAppMessage } from '@/hooks/useAppMessage'

const { Option } = Select

// reason对象默认值
const defaultReturnReason: OmsOrderReturnReason = {
  name: '',
  sort: 0,
  status: 1,
}

export default function ReturnReason() {
  const { message, modal } = useAppMessage()
  const [form] = Form.useForm()

  // 列表查询参数
  const [listQuery, setListQuery] = useState<PageParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 列表数据
  const [list, setList] = useState<OmsOrderReturnReason[]>([])
  // 列表总条数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(false)
  // 多选数据
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<OmsOrderReturnReason[]>([])
  // 编辑框是否可见
  const [dialogOpen, setdialogOpen] = useState(false)
  // 当前操作的reasonId,为null时表示新增
  const [operateReasonId, setOperateReasonId] = useState<number | undefined>()
  // 批量操作类型
  const [batchOperateType, setBatchOperateType] = useState<number>()

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getReturnReasonListAPI(listQuery)
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

  // 组件挂载后加载数据
  useEffect(() => {
    getList()
  }, [listQuery])

  // 格式化日期
  const formatDateTime = (dateTime: string) => {
    return dateTime ? dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss') : '-'
  }

  // 处理添加
  const handleAdd = () => {
    setOperateReasonId(undefined)
    form.setFieldsValue(defaultReturnReason)
    setdialogOpen(true)
  }

  // 处理确认
  const handleConfirm = async () => {
    try {
      const values = await form.validateFields()
      if (!operateReasonId) {
        // 添加操作
        await returnReasonCreateAPI(values)
        message.success('添加成功！', 1)
      }
      else {
        // 编辑操作
        await returnReasonUpdateAPI(operateReasonId, values)
        message.success('修改成功！', 1)
      }
      setdialogOpen(false)
      setOperateReasonId(undefined)
      getList()
    }
    catch (error) {
      console.error('操作失败:', error)
    }
  }

  // 处理编辑
  const handleUpdate = async (row: OmsOrderReturnReason) => {
    if (!row.id)
      return
    setOperateReasonId(row.id)
    const res = await getReturnReasonByIdAPI(row.id)
    form.setFieldsValue(res.data)
    setdialogOpen(true)
  }

  // 处理删除
  const handleDelete = async (row: OmsOrderReturnReason) => {
    if (!row.id)
      return
    await deleteReasonMethod([row.id])
  }

  // 处理选择变化
  const handleSelectionChange = (newSelectedRowKeys: React.Key[], newSelectedRows: OmsOrderReturnReason[]) => {
    setSelectedRowKeys(newSelectedRowKeys)
    setSelectedRows(newSelectedRows)
  }

  // 处理状态变化
  const handleStatusChange = async (row: OmsOrderReturnReason, checked: boolean) => {
    if (!row.id)
      return
    try {
      await returnReasonUpdateStatusAPI({
        ids: String(row.id),
        status: checked ? 1 : 0,
      })
      message.success('状态修改成功', 1)
      getList()
    }
    catch (error) {
      console.error('状态修改失败:', error)
    }
  }

  // 处理批量操作
  const handleBatchOperate = async () => {
    if (!selectedRowKeys || selectedRowKeys.length < 1) {
      message.warning('请选择要操作的条目', 1)
      return
    }
    if (batchOperateType === 1) {
      const ids = selectedRows.map(item => item.id!).filter(id => id !== undefined)
      await deleteReasonMethod(ids)
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

  // 删除原因方法
  const deleteReasonMethod = async (ids: number[]) => {
    modal.confirm({
      title: '提示',
      content: '是否要进行该删除操作?',
      onOk: async () => {
        try {
          await returnReasonDeleteByIdsAPI({ ids: ids.join(',') })
          message.success('删除成功！', 1)
          getList()
          setSelectedRowKeys([])
          setSelectedRows([])
        }
        catch (error) {
          console.error('删除失败:', error)
        }
      },
    })
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
      title: '原因类型',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 100,
      align: 'center',
    },
    {
      title: '是否可用',
      key: 'status',
      align: 'center',
      render: (_: any, row: OmsOrderReturnReason) => (
        <Switch
          checked={row.status === 1}
          onChange={checked => handleStatusChange(row, checked)}
          checkedValue={1}
          unCheckedValue={0}
        />
      ),
    },
    {
      title: '添加时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      align: 'center',
      render: (createTime: string) => formatDateTime(createTime),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      align: 'center',
      render: (_: any, row: OmsOrderReturnReason) => (
        <>
          <Button type="text" onClick={() => handleUpdate(row)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该原因?" onConfirm={() => handleDelete(row)}>
            <Button type="text" danger>
              删除
            </Button>
          </Popconfirm>
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
        className="operate-container"
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

        <div style={{ marginTop: 20 }}>
          <Select
            value={batchOperateType}
            onChange={setBatchOperateType}
            placeholder="批量操作"
            style={{ width: 150, marginRight: 15 }}
          >
            <Option key={1} value={1}>
              删除
            </Option>
          </Select>
          <Button type="primary" onClick={handleBatchOperate}>
            确定
          </Button>
        </div>
      </Card>

      {/* 添加/编辑退货原因对话框 */}
      <Modal
        title={operateReasonId ? '编辑退货原因' : '添加退货原因'}
        open={dialogOpen}
        onCancel={() => setdialogOpen(false)}
        onOk={handleConfirm}
        width={400}
      >
        <Form form={form} layout="vertical" labelCol={{ span: 6 }}>
          <Form.Item
            name="name"
            label="原因类型："
            rules={[{ required: true, message: '请输入原因类型' }]}
          >
            <Input placeholder="请输入原因类型" />
          </Form.Item>
          <Form.Item
            name="sort"
            label="排序："
            rules={[{ required: true, message: '请输入排序' }]}
          >
            <InputNumber placeholder="请输入排序" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="status"
            label="是否启用："
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedValue={1} unCheckedValue={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
