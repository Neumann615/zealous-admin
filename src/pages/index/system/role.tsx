import type { PageParam } from '@/types/common'
import type { Role } from '@/types/role'
import { PlusOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Radio,
  Switch,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useAppMessage } from '@/hooks/useAppMessage'
import {
  getRoleListAPI,
  roleCreateAPI,
  roleDeleteByIdAPI,
  roleUpdateByIdAPI,
} from '@/apis/role'
import AllocMenuModal from './allocMenu'

const { TextArea } = Input

export default function SystemRole() {
  const { message, modal } = useAppMessage()

  const [listQuery, setListQuery] = useState<PageParam>({
    pageNum: 1,
    pageSize: 10,
    keyword: '',
  })
  const [list, setList] = useState<Role[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const [role, setRole] = useState<Role>({
    name: '',
    adminCount: 0,
    status: 1,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)

  const [allocMenuVisible, setAllocMenuVisible] = useState(false)
  const [allocMenuRoleId, setAllocMenuRoleId] = useState<number>()

  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getRoleListAPI(listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch {
      setListLoading(false)
    }
  }

  useEffect(() => {
    getList()
  }, [listQuery])

  const handleAdd = () => {
    setDialogOpen(true)
    setIsEdit(false)
    setRole({ name: '', adminCount: 0, status: 1 })
  }

  const handleUpdate = (row: Role) => {
    setDialogOpen(true)
    setIsEdit(true)
    setRole({ ...row })
  }

  const handleDelete = (row: Role) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该角色?',
      onOk: async () => {
        await roleDeleteByIdAPI(row.id!)
        message.success('删除成功!')
        getList()
      },
    })
  }

  const handleDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        if (isEdit) {
          await roleUpdateByIdAPI(role.id!, role)
          message.success('修改成功！')
        }
        else {
          await roleCreateAPI(role)
          message.success('添加成功！')
        }
        setDialogOpen(false)
        getList()
      },
    })
  }

  const handleSelectMenu = (row: Role) => {
    setAllocMenuRoleId(row.id)
    setAllocMenuVisible(true)
  }

  const columns = [
    { title: '编号', dataIndex: 'id', key: 'id', width: 80, align: 'center' as const },
    { title: '角色名称', dataIndex: 'name', key: 'name', align: 'center' as const },
    { title: '描述', dataIndex: 'description', key: 'description', align: 'center' as const },
    { title: '用户数', dataIndex: 'adminCount', key: 'adminCount', width: 80, align: 'center' as const },
    {
      title: '添加时间', dataIndex: 'createTime', key: 'createTime', width: 160, align: 'center' as const,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
    },
    {
      title: '是否启用', dataIndex: 'status', key: 'status', width: 100, align: 'center' as const,
      render: (status: number) => (
        <Switch checked={status === 1} disabled />
      ),
    },
    {
      title: '操作', key: 'actions', width: 220, align: 'center' as const,
      render: (_: any, row: Role) => (
        <div style={{ display: 'flex', gap: 4, whiteSpace: 'nowrap' }}>
          <Button type="link" onClick={() => handleSelectMenu(row)}>分配菜单</Button>
          <Button type="link" onClick={() => handleUpdate(row)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(row)}>删除</Button>
        </div>
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
              placeholder="角色名称"
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
        title={isEdit ? '编辑角色' : '添加角色'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleDialogConfirm}
        width={500}
      >
        <Form labelCol={{ span: 6 }}>
          <Form.Item label="角色名称：">
            <Input value={role.name} onChange={e => setRole({ ...role, name: e.target.value })} style={{ width: 250 }} />
          </Form.Item>
          <Form.Item label="描述：">
            <TextArea value={role.description} onChange={e => setRole({ ...role, description: e.target.value })} rows={4} style={{ width: 250 }} />
          </Form.Item>
          <Form.Item label="是否启用：">
            <Radio.Group value={role.status} onChange={e => setRole({ ...role, status: e.target.value })}>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      <AllocMenuModal
        visible={allocMenuVisible}
        roleId={allocMenuRoleId}
        onClose={() => {
          setAllocMenuVisible(false)
          getList()
        }}
      />
    </div>
  )
}
