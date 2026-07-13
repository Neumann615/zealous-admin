import type { UmsAdmin } from '@/types/admin'
import type { PageParam } from '@/types/common'
import type { UmsRole } from '@/types/role'
import { PlusOutlined } from '@ant-design/icons'
import {
  App,
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
import { useAppMessage } from '@/hooks/useAppMessage'
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

const { TextArea } = Input

export default function Admin() {
  const { message, modal } = useAppMessage()
  // 列表查询参数
  const [listQuery, setListQuery] = useState<PageParam>({
    pageNum: 1,
    pageSize: 10,
    keyword: '',
  })
  // 管理员列表数据
  const [list, setList] = useState<UmsAdmin[]>([])
  // 所有角色列表
  const [allRoleList, setAllRoleList] = useState<UmsRole[]>([])
  // 表格加载状态
  const [listLoading, setListLoading] = useState(true)
  // 分页总数
  const [total, setTotal] = useState(0)

  // 当前操作的管理员
  const [admin, setAdmin] = useState<UmsAdmin>({
    username: '',
    password: '',
    status: 1,
  })
  // 管理员编辑对话框是否可见
  const [dialogOpen, setDialogOpen] = useState(false)
  // 是否编辑状态
  const [isEdit, setIsEdit] = useState(false)

  // 分配角色对话框是否可见
  const [allocDialogVisible, setAllocDialogVisible] = useState(false)
  // 当前正在分配角色的管理员ID
  const [allocAdminId, setAllocAdminId] = useState<number>()
  // 当前管理员已分配的角色ID
  const [allocRoleIds, setAllocRoleIds] = useState<number[]>([])

  // 获取管理员列表
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getAdminListAPI(listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取管理员列表失败:', error)
    }
  }

  // 获取所有角色列表
  const getAllRoleList = async () => {
    try {
      const response = await getRoleListAllAPI()
      setAllRoleList(response.data)
    }
    catch (error) {
      console.error('获取角色列表失败:', error)
    }
  }

  // 组件挂载后初始化数据
  useEffect(() => {
    getList()
    getAllRoleList()
  }, [listQuery])

  // 根据管理员ID获取角色列表
  const getRoleListByAdmin = async (adminId: number) => {
    try {
      const res = await getRoleByAdminIdAPI(adminId)
      const allocRoleList = res.data
      const roleIds: number[] = []
      allocRoleList.forEach(item => roleIds.push(item.id!))
      setAllocRoleIds(roleIds)
    }
    catch (error) {
      console.error('获取管理员角色列表失败:', error)
    }
  }

  // 重置搜索条件
  const handleResetSearch = () => {
    setListQuery({ ...listQuery, pageNum: 1, keyword: '' })
  }

  // 处理搜索
  const handleSearchList = () => {
    setListQuery({ ...listQuery, pageNum: 1 })
  }

  // 处理添加管理员
  const handleAdd = () => {
    console.log('添加管理员')
    setDialogOpen(true)
    setIsEdit(false)
    setAdmin({
      username: '',
      password: '',
      status: 1,
    })
  }

  // 处理状态变化
  const handleStatusChange = async (row: UmsAdmin, checked: boolean) => {
    modal.confirm({
      title: '提示',
      content: '是否要修改该状态?',
      onOk: async () => {
        try {
          await adminUpdateStatusByIdAPI(row.id!, { status: checked ? 1 : 0 })
          message.success('修改成功!')
          getList()
        }
        catch (error) {
          console.error('更新状态失败:', error)
          getList()
        }
      },
      onCancel: () => {
        getList()
      },
    })
  }

  // 处理删除
  const handleDelete = (row: UmsAdmin) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该用户?',
      onOk: async () => {
        try {
          await adminDeleteByIdAPI(row.id!)
          message.success('删除成功!')
          getList()
        }
        catch (error) {
          console.error('删除失败:', error)
        }
      },
    })
  }

  // 处理更新
  const handleUpdate = (row: UmsAdmin) => {
    setDialogOpen(true)
    setIsEdit(true)
    setAdmin({ ...row })
  }

  // 处理对话框确认
  const handleDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        try {
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
        }
        catch (error) {
          console.error('操作失败:', error)
        }
      },
    })
  }

  // 处理分配角色对话框确认
  const handleAllocDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        try {
          await adminRoleUpdateAPI({ adminId: allocAdminId!, roleIds: allocRoleIds.join(',') })
          message.success('分配成功！')
          setAllocDialogVisible(false)
        }
        catch (error) {
          console.error('分配角色失败:', error)
        }
      },
    })
  }

  // 处理选择角色
  const handleSelectRole = (row: UmsAdmin) => {
    setAllocAdminId(row.id!)
    setAllocDialogVisible(true)
    getRoleListByAdmin(row.id!)
  }

  // 日期格式化
  const formatDateTime = (time: string) => {
    if (!time) {
      return 'N/A'
    }
    return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
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
      title: '帐号',
      dataIndex: 'username',
      key: 'username',
      align: 'center' as const,
    },
    {
      title: '姓名',
      dataIndex: 'nickName',
      key: 'nickName',
      align: 'center' as const,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      align: 'center' as const,
    },
    {
      title: '添加时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      align: 'center' as const,
      render: (createTime: string) => formatDateTime(createTime),
    },
    {
      title: '最后登录',
      dataIndex: 'loginTime',
      key: 'loginTime',
      width: 160,
      align: 'center' as const,
      render: (loginTime: string) => formatDateTime(loginTime),
    },
    {
      title: '是否启用',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center' as const,
      render: (status: number, row: UmsAdmin) => (
        <Switch
          checked={status === 1}
          onChange={checked => handleStatusChange(row, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      align: 'center' as const,
      render: (_: any, row: UmsAdmin) => (
        <Space>
          <Button type="link" onClick={() => handleSelectRole(row)}>
            分配角色
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
            <Form.Item label="输入搜索：">
              <Input
                value={listQuery.keyword}
                onChange={e => setListQuery({ ...listQuery, keyword: e.target.value })}
                placeholder="帐号/姓名"
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>
          </div>
        </Form>
      </Card>
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

      {/* 添加/编辑用户对话框 */}
      <Modal
        title={isEdit ? '编辑用户' : '添加用户'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleDialogConfirm}
        width={500}
      >
        <Form labelCol={{ span: 6 }}>
          <Form.Item label="帐号：">
            <Input
              value={admin.username}
              onChange={e => setAdmin({ ...admin, username: e.target.value })}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item label="姓名：">
            <Input
              value={admin.nickName}
              onChange={e => setAdmin({ ...admin, nickName: e.target.value })}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item label="邮箱：">
            <Input
              value={admin.email}
              onChange={e => setAdmin({ ...admin, email: e.target.value })}
              style={{ width: 250 }}
            />
          </Form.Item>
          {!isEdit && (
            <Form.Item label="密码：">
              <Input.Password
                value={admin.password}
                onChange={e => setAdmin({ ...admin, password: e.target.value })}
                style={{ width: 250 }}
              />
            </Form.Item>
          )}
          <Form.Item label="备注：">
            <TextArea
              value={admin.note}
              onChange={e => setAdmin({ ...admin, note: e.target.value })}
              rows={5}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item label="是否启用：">
            <Radio.Group
              value={admin.status}
              onChange={e => setAdmin({ ...admin, status: e.target.value })}
            >
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配角色对话框 */}
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
            <Select.Option key={item.id} value={item.id!}>
              {item.name}
            </Select.Option>
          ))}
        </Select>
      </Modal>
    </div>
  )
}
