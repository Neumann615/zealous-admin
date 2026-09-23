import type { AdminRecord, PageParam, RoleRecord } from '@zealous-admin/auth'
import { PlusOutlined } from '@ant-design/icons'
import {
  assignUserRoles,
  createUser,
  deleteUser,
  getRoleAll,
  getUserPage,
  getUserRoles,
  updateUser,
  updateUserStatus,
} from '@zealous-admin/auth'
import { useAppMessage } from '@zealous-admin/layout/index'
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
import { createStyles } from 'antd-style'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

// ============================================================
// 样式
// ============================================================
const useStyles = createStyles(({ token, css }) => ({
  toolbar: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${token.marginMD}px;
    flex-wrap: wrap;
    gap: ${token.marginSM}px;
  `,
  tableWrapper: css`
    .ant-table-thead > tr > th {
      background: ${token.colorFillAlter};
      font-weight: 600;
    }
  `,
}))

// ============================================================
// 表单校验规则
// ============================================================
const FORM_RULES = {
  username: [
    { required: true, message: '请输入帐号' },
    { min: 2, max: 50, message: '帐号长度为 2-50 个字符' },
  ],
  nickName: [
    { required: true, message: '请输入姓名' },
    { max: 50, message: '姓名不能超过 50 个字符' },
  ],
  email: [
    { type: 'email' as const, message: '请输入有效的邮箱地址' },
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, max: 50, message: '密码长度为 6-50 个字符' },
  ],
}

// ============================================================
// 组件
// ============================================================
export default function SystemAdmin() {
  const { message, modal } = useAppMessage()
  const { styles } = useStyles()
  const [form] = Form.useForm()

  const [listQuery, setListQuery] = useState<PageParam>({
    pageNum: 1,
    pageSize: 10,
    keyword: '',
  })
  const [list, setList] = useState<AdminRecord[]>([])
  const [allRoleList, setAllRoleList] = useState<RoleRecord[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number>()

  const [allocDialogVisible, setAllocDialogVisible] = useState(false)
  const [allocAdminId, setAllocAdminId] = useState<number>()
  const [allocRoleIds, setAllocRoleIds] = useState<number[]>([])

  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getUserPage(listQuery)
      setList(res.list)
      setTotal(res.total)
    }
    catch { /* ignore */ }
    finally { setListLoading(false) }
  }

  const getAllRoleList = async () => {
    try {
      const response = await getRoleAll()
      setAllRoleList(response)
    }
    catch { /* ignore */ }
  }

  useEffect(() => {
    getList()
    getAllRoleList()
  }, [listQuery])

  const getRoleListByAdmin = async (adminId: number) => {
    try {
      const res = await getUserRoles(adminId)
      setAllocRoleIds(res.map((item: RoleRecord) => item.id!))
    }
    catch { /* ignore */ }
  }

  const handleStatusChange = async (row: AdminRecord, checked: boolean) => {
    modal.confirm({
      title: '提示',
      content: '是否要修改该状态?',
      onOk: async () => {
        try {
          await updateUserStatus(row.id!, checked ? 1 : 0)
          message.success('修改成功!')
          getList()
        }
        catch { getList() }
      },
      onCancel: () => getList(),
    })
  }

  const handleDelete = (row: AdminRecord) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该用户?',
      onOk: async () => {
        await deleteUser(row.id!)
        message.success('删除成功!')
        getList()
      },
    })
  }

  const handleAdd = () => {
    setIsEdit(false)
    setEditId(undefined)
    form.resetFields()
    form.setFieldsValue({ status: 1 })
    setDialogOpen(true)
  }

  const handleUpdate = (row: AdminRecord) => {
    setIsEdit(true)
    setEditId(row.id)
    form.setFieldsValue(row)
    setDialogOpen(true)
  }

  const handleDialogConfirm = async () => {
    const values = await form.validateFields()
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        if (isEdit) {
          await updateUser(editId!, values)
          message.success('修改成功！')
        }
        else {
          await createUser(values)
          message.success('添加成功！')
        }
        setDialogOpen(false)
        getList()
      },
    })
  }

  const handleSelectRole = (row: AdminRecord) => {
    setAllocAdminId(row.id!)
    setAllocDialogVisible(true)
    getRoleListByAdmin(row.id!)
  }

  const handleAllocDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        await assignUserRoles({ adminId: allocAdminId!, roleIds: allocRoleIds.join(',') })
        message.success('分配成功！')
        setAllocDialogVisible(false)
      },
    })
  }

  const handleSearch = () => {
    setListQuery(prev => ({ ...prev, pageNum: 1 }))
  }

  const handleReset = () => {
    setListQuery({ pageNum: 1, pageSize: 10, keyword: '' })
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
      width: 100,
      align: 'center' as const,
      render: (status: number, row: AdminRecord) => (
        <Switch checked={status === 1} onChange={checked => handleStatusChange(row, checked)} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      align: 'center' as const,
      render: (_: any, row: AdminRecord) => (
        <Space size="small">
          <Button type="link" onClick={() => handleSelectRole(row)}>分配角色</Button>
          <Button type="link" onClick={() => handleUpdate(row)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card>
        <div className={styles.toolbar}>
          <Space wrap>
            <Input
              value={listQuery.keyword}
              onChange={e => setListQuery({ ...listQuery, keyword: e.target.value })}
              onPressEnter={handleSearch}
              placeholder="帐号/姓名"
              style={{ width: 220 }}
              allowClear
              onClear={() => setListQuery({ ...listQuery, keyword: '', pageNum: 1 })}
            />
            <Button type="primary" onClick={handleSearch}>查询</Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加</Button>
        </div>
        <div className={styles.tableWrapper}>
          <Table
            columns={columns}
            dataSource={list}
            loading={listLoading}
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
        </div>
      </Card>

      <Modal
        title={isEdit ? '编辑用户' : '添加用户'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleDialogConfirm}
        width={560}
        destroyOnClose
      >
        <Form
          form={form}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 16 }}
          preserve={false}
        >
          <Form.Item label="帐号" name="username" rules={FORM_RULES.username}>
            <Input allowClear />
          </Form.Item>
          <Form.Item label="姓名" name="nickName" rules={FORM_RULES.nickName}>
            <Input allowClear />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={FORM_RULES.email}>
            <Input allowClear />
          </Form.Item>
          {!isEdit && (
            <Form.Item label="密码" name="password" rules={FORM_RULES.password}>
              <Input.Password allowClear />
            </Form.Item>
          )}
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item label="是否启用" name="status">
            <Radio.Group>
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
          placeholder="请选择角色"
          style={{ width: '100%' }}
        >
          {allRoleList.map(item => (
            <Select.Option key={item.id} value={item.id!}>{item.name}</Select.Option>
          ))}
        </Select>
      </Modal>
    </div>
  )
}
