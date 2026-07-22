import type { PageParam } from '@/types/common'
import type { DictData, DictType } from '@/types/dict'
import { PlusOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import {
  dictDataCreateAPI,
  dictDataDeleteByIdAPI,
  dictDataUpdateByIdAPI,
  dictTypeCreateAPI,
  dictTypeDeleteByIdAPI,
  dictTypeUpdateByIdAPI,
  getDictDataListAPI,
  getDictTypeAllAPI,
  getDictTypeListAPI,
} from '@/apis/dict'
import { useAppMessage } from '@/hooks/useAppMessage'

const { TextArea } = Input

// ==================== 字典类型管理 ====================
function DictTypePane() {
  const { message, modal } = useAppMessage()

  const [listQuery, setListQuery] = useState<PageParam>({ pageNum: 1, pageSize: 10, keyword: '' })
  const [list, setList] = useState<DictType[]>([])
  const [total, setTotal] = useState(0)
  const [listLoading, setListLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [record, setRecord] = useState<DictType>({ name: '', dictType: '', status: 1 })

  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getDictTypeListAPI(listQuery)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch { /* ignore */ }
    finally { setListLoading(false) }
  }

  useEffect(() => { getList() }, [listQuery])

  const handleAdd = () => {
    setIsEdit(false)
    setRecord({ name: '', dictType: '', status: 1 })
    setDialogOpen(true)
  }

  const handleUpdate = (row: DictType) => {
    setIsEdit(true)
    setRecord({ ...row })
    setDialogOpen(true)
  }

  const handleDelete = (row: DictType) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该字典类型?',
      onOk: async () => {
        await dictTypeDeleteByIdAPI(row.id!)
        message.success('删除成功!')
        getList()
      },
    })
  }

  const handleConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        if (isEdit) {
          await dictTypeUpdateByIdAPI(record.id!, record)
          message.success('修改成功！')
        }
        else {
          await dictTypeCreateAPI(record)
          message.success('添加成功！')
        }
        setDialogOpen(false)
        getList()
      },
    })
  }

  const columns = [
    { title: '编号', dataIndex: 'id', key: 'id', width: 80, align: 'center' as const },
    { title: '字典名称', dataIndex: 'name', key: 'name', align: 'center' as const },
    { title: '类型编码', dataIndex: 'dictType', key: 'dictType', align: 'center' as const },
    { title: '备注', dataIndex: 'remark', key: 'remark', align: 'center' as const },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      align: 'center' as const,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
    },
    {
      title: '是否启用',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: number) => <Switch checked={status === 1} disabled />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      align: 'center' as const,
      render: (_: any, row: DictType) => (
        <Space>
          <Button type="link" onClick={() => handleUpdate(row)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card
        className="filter-container"
        title="筛选搜索"
        extra={(
          <>
            <Button onClick={() => setListQuery({ ...listQuery, pageNum: 1, keyword: '' })} style={{ marginRight: 15 }}>重置</Button>
            <Button type="primary" onClick={() => setListQuery({ ...listQuery, pageNum: 1 })}>查询搜索</Button>
          </>
        )}
      >
        <Form layout="inline">
          <Form.Item label="输入搜索：">
            <Input
              value={listQuery.keyword}
              onChange={e => setListQuery({ ...listQuery, keyword: e.target.value })}
              placeholder="字典名称/类型编码"
              style={{ width: 200 }}
              allowClear
            />
          </Form.Item>
        </Form>
      </Card>
      <Card
        title="数据列表"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加</Button>}
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
          onChange={pagi => setListQuery({ ...listQuery, pageNum: pagi.current || 1, pageSize: pagi.pageSize || 10 })}
          rowKey="id"
        />
      </Card>

      <Modal
        title={isEdit ? '编辑字典类型' : '添加字典类型'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleConfirm}
        width={500}
      >
        <Form labelCol={{ span: 6 }}>
          <Form.Item label="字典名称：">
            <Input value={record.name} onChange={e => setRecord({ ...record, name: e.target.value })} style={{ width: 250 }} />
          </Form.Item>
          <Form.Item label="类型编码：">
            <Input value={record.dictType} onChange={e => setRecord({ ...record, dictType: e.target.value })} style={{ width: 250 }} disabled={isEdit} />
          </Form.Item>
          <Form.Item label="备注：">
            <TextArea value={record.remark} onChange={e => setRecord({ ...record, remark: e.target.value })} rows={3} style={{ width: 250 }} />
          </Form.Item>
          <Form.Item label="是否启用：">
            <Radio.Group value={record.status} onChange={e => setRecord({ ...record, status: e.target.value })}>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ==================== 字典数据管理 ====================
function DictDataPane() {
  const { message, modal } = useAppMessage()

  const [typeList, setTypeList] = useState<DictType[]>([])
  const [selectedType, setSelectedType] = useState<string>()
  const [listQuery, setListQuery] = useState<PageParam>({ pageNum: 1, pageSize: 10 })
  const [list, setList] = useState<DictData[]>([])
  const [total, setTotal] = useState(0)
  const [listLoading, setListLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [record, setRecord] = useState<DictData>({
    dictType: '',
    dictLabel: '',
    dictValue: '',
    dictSort: 0,
    status: 1,
  })

  useEffect(() => {
    getDictTypeAllAPI().then(res => setTypeList(res.data)).catch(() => {})
  }, [])

  const getList = async () => {
    if (!selectedType)
      return
    setListLoading(true)
    try {
      const res = await getDictDataListAPI({ ...listQuery, dictType: selectedType })
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch { /* ignore */ }
    finally { setListLoading(false) }
  }

  useEffect(() => { getList() }, [listQuery, selectedType])

  const handleTypeChange = (value: string) => {
    setSelectedType(value)
    setListQuery(prev => ({ ...prev, pageNum: 1 }))
  }

  const handleAdd = () => {
    if (!selectedType) {
      message.warning('请先选择字典类型')
      return
    }
    setIsEdit(false)
    setRecord({ dictType: selectedType, dictLabel: '', dictValue: '', dictSort: 0, status: 1 })
    setDialogOpen(true)
  }

  const handleUpdate = (row: DictData) => {
    setIsEdit(true)
    setRecord({ ...row })
    setDialogOpen(true)
  }

  const handleDelete = (row: DictData) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该字典数据?',
      onOk: async () => {
        await dictDataDeleteByIdAPI(row.id!)
        message.success('删除成功!')
        getList()
      },
    })
  }

  const handleConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        if (isEdit) {
          await dictDataUpdateByIdAPI(record.id!, record)
          message.success('修改成功！')
        }
        else {
          await dictDataCreateAPI(record)
          message.success('添加成功！')
        }
        setDialogOpen(false)
        getList()
      },
    })
  }

  const columns = [
    { title: '编号', dataIndex: 'id', key: 'id', width: 80, align: 'center' as const },
    { title: '字典标签', dataIndex: 'dictLabel', key: 'dictLabel', align: 'center' as const },
    { title: '字典值', dataIndex: 'dictValue', key: 'dictValue', align: 'center' as const },
    { title: '排序', dataIndex: 'dictSort', key: 'dictSort', width: 80, align: 'center' as const },
    {
      title: '是否启用',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: number) => <Switch checked={status === 1} disabled />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      align: 'center' as const,
      render: (_: any, row: DictData) => (
        <Space>
          <Button type="link" onClick={() => handleUpdate(row)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card className="filter-container" title="筛选搜索">
        <Form layout="inline">
          <Form.Item label="字典类型：">
            <Select
              value={selectedType}
              onChange={handleTypeChange}
              placeholder="请选择字典类型"
              style={{ width: 200 }}
              allowClear
            >
              {typeList.map(t => (
                <Select.Option key={t.dictType} value={t.dictType}>{t.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Card>
      <Card
        title="数据列表"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加</Button>}
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
          onChange={pagi => setListQuery({ ...listQuery, pageNum: pagi.current || 1, pageSize: pagi.pageSize || 10 })}
          rowKey="id"
        />
      </Card>

      <Modal
        title={isEdit ? '编辑字典数据' : '添加字典数据'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleConfirm}
        width={500}
      >
        <Form labelCol={{ span: 6 }}>
          <Form.Item label="字典标签：">
            <Input value={record.dictLabel} onChange={e => setRecord({ ...record, dictLabel: e.target.value })} style={{ width: 250 }} />
          </Form.Item>
          <Form.Item label="字典值：">
            <Input value={record.dictValue} onChange={e => setRecord({ ...record, dictValue: e.target.value })} style={{ width: 250 }} />
          </Form.Item>
          <Form.Item label="排序：">
            <InputNumber value={record.dictSort} onChange={v => setRecord({ ...record, dictSort: v || 0 })} style={{ width: 250 }} />
          </Form.Item>
          <Form.Item label="是否启用：">
            <Radio.Group value={record.status} onChange={e => setRecord({ ...record, status: e.target.value })}>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ==================== 字典管理主页 ====================
export default function SystemDict() {
  return (
    <div className="app-container">
      <Tabs
        defaultActiveKey="type"
        items={[
          { key: 'type', label: '字典类型', children: <DictTypePane /> },
          { key: 'data', label: '字典数据', children: <DictDataPane /> },
        ]}
      />
    </div>
  )
}
