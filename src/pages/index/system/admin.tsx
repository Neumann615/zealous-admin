import type { Admin } from '@/types/admin'
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
  Select,
  Space,
  Switch,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import {
  adminDeleteByIdAPI,
  adminRegisterAPI,
  adminRoleUpdateAPI,
  adminUpdateByIdAPI,
  adminUpdateStatusByIdAPI,
  getAdminListAPI,
  getRoleByAdminIdAPI,
} from '@/apis/admin'
import { getRoleListAllAPI } from '@/apis/role'
import { useAppMessage } from '@/hooks/useAppMessage'

const { TextArea } = Input

export default function SystemAdmin() {
  const { message, modal } = useAppMessage()

  const [listQuery, setListQuery] = useState<PageParam>({
    pageNum: 1,
    pageSize: 10,
    keyword: '',
  })
  const [list, setList] = useState<Admin[]>([])
  const [allRoleList, setAllRoleList] = useState<Role[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const [admin, setAdmin] = useState<Admin>({
    username: '',
    password: '',
    status: 1,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)

  const [allocDialogVisible, setAllocDialogVisible] = useState(false)
  const [allocAdminId, setAllocAdminId] = useState<number>()
  const [allocRoleIds, setAllocRoleIds] = useState<number[]>([])

  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getAdminListAPI(listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch {
      setListLoading(false)
    }
  }

  const getAllRoleList = async () => {
    try {
      const response = await getRoleListAllAPI()
      setAllRoleList(response.data)
    }
    catch { /* ignore */ }
  }

  useEffect(() => {
    getList()
    getAllRoleList()
  }, [listQuery])

  const getRoleListByAdmin = async (adminId: number) => {
    try {
      const res = await getRoleByAdminIdAPI(adminId)
      setAllocRoleIds(res.data.map((item: Role) => item.id!))
    }
    catch { /* ignore */ }
  }

  const handleStatusChange = async (row: Admin, checked: boolean) => {
    modal.confirm({
      title: '提示',
      content: '是否要修改该状态?',
      onOk: async () => {
        try {
          await adminUpdateStatusByIdAPI(row.id!, { status: checked ? 1 : 0 })
          message.success('修改成功!')
          getList()
        }
        catch { getList() }
      },
      onCancel: () => getList(),
    })
  }

  const handleDelete = (row: Admin) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该用户?',
      onOk: async () => {
        await adminDeleteByIdAPI(row.id!)
        message.success('删除成功!')
        getList()
      },
    })
  }

  const handleAdd = () => {
    setDialogOpen(true)
    setIsEdit(false)
    setAdmin({ username: '', password: '', status: 1 })
  }

  const handleUpdate = (row: Admin) => {
    setDialogOpen(true)
    setIsEdit(true)
    setAdmin({ ...row })
  }

  const handleDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        if (isEdit) {
          await adminUpdateByIdAPI(admin.id!, admin)
          message.success('修改成功！')
        }
        else {
          await adminRegisterAPI(admin)
          message.success('添加成功！')
        }
        setDialogOpen(false)
        getList()
      },
    })
  }

  const handleSelectRole = (row: Admin) => {
    setAllocAdminId(row.id!)
    setAllocDialogVisible(true)
    getRoleListByAdmin(row.id!)
  }

  const handleAllocDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        await adminRoleUpdateAPI({ adminId: allocAdminId!, roleIds: allocRoleIds.join(',') })
        message.success('分配成功！')
        setAllocDialogVisible(false)
      },
    })
  }

  const columns = [
    { title: '编号', dataIndex: 'id', key: 'id', width: 80, align: 'center' as const },
    { title: '帐号', dataIndex: 'username', key: 'username', align: 'center' as const },
    { title: '姓名', dataIndex: 'nickName', key: 'nickName', align: 'center' as const },
    { title: '邮箱', dataIndex: 'email', key: 'email', align: 'center' as const },
    {
      title: '添加时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      align: 'center' as const,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
    },
    {
      title: '最后登录',
      dataIndex: 'loginTime',
      key: 'loginTime',
      width: 160,
      align: 'center' as const,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
    },
    {
      title: '是否启用',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center' as const,
      render: (status: number, row: Admin) => (
        <Switch checked={status === 1} onChange={checked => handleStatusChange(row, checked)} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      align: 'center' as const,
      render: (_: any, row: Admin) => (
        <Space>
          <Button type="link" onClick={() => handleSelectRole(row)}>分配角色</Button>
          <Button type="link" onClick={() => handleUpdate(row)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(row)}>删除</Button>
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
              placeholder="帐号/姓名"
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
        title={isEdit ? '编辑用户' : '添加用户'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleDialogConfirm}
        width={500}
      >
        <Form labelCol={{ span: 6 }}>
          <Form.Item label="帐号：">
            <Input value={admin.username} onChange={e => setAdmin({ ...admin, username: e.target.value })} style={{ width: 250 }} />
          </Form.Item>
          <Form.Item label="姓名：">
            <Input value={admin.nickName} onChange={e => setAdmin({ ...admin, nickName: e.target.value })} style={{ width: 250 }} />
          </Form.Item>
          <Form.Item label="邮箱：">
            <Input value={admin.email} onChange={e => setAdmin({ ...admin, email: e.target.value })} style={{ width: 250 }} />
          </Form.Item>
          {!isEdit && (
            <Form.Item label="密码：">
              <Input.Password value={admin.password} onChange={e => setAdmin({ ...admin, password: e.target.value })} style={{ width: 250 }} />
            </Form.Item>
          )}
          <Form.Item label="备注：">
            <TextArea value={admin.note} onChange={e => setAdmin({ ...admin, note: e.target.value })} rows={4} style={{ width: 250 }} />
          </Form.Item>
          <Form.Item label="是否启用：">
            <Radio.Group value={admin.status} onChange={e => setAdmin({ ...admin, status: e.target.value })}>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="分配角色"
        open={allocDialogVisible}
        onCancel={() => setAllocDialogVisible(false)}
        onOk={handleAllocDialogConfirm}
        width={400}
      >
        <Select
          mode="multiple"
          value={allocRoleIds}
          onChange={values => setAllocRoleIds(values)}
          placeholder="请选择"
          style={{ width: '80%' }}
        >
          {allRoleList.map(item => (
            <Select.Option key={item.id} value={item.id!}>{item.name}</Select.Option>
          ))}
        </Select>
      </Modal>
    </div>
  )
}
