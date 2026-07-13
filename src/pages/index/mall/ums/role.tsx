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
  Switch,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useControlTab } from '@zealous-admin/layout/index'
import { useAppMessage } from '@/hooks/useAppMessage'
import {
  getRoleListAPI,
  roleCreateAPI,
  roleDeleteByIdsAPI,
  roleUpdateByIdAPI,
  roleUpdateStatusAPI,
} from '@/apis/role'
import AllocMenuModal from './allocMenu'

const { TextArea } = Input

export default function Role() {
  const { message, modal } = useAppMessage()
  const { openTab } = useControlTab()

  // 列表查询参数
  const [listQuery, setListQuery] = useState<PageParam>({
    pageNum: 1,
    pageSize: 10,
    keyword: '',
  })
  // 角色列表数据
  const [list, setList] = useState<UmsRole[]>([])
  // 表格加载状态
  const [listLoading, setListLoading] = useState(true)
  // 分页总数
  const [total, setTotal] = useState(0)

  // 当前操作的角色对象
  const [role, setRole] = useState<UmsRole>({
    name: '',
    adminCount: 0,
    status: 1,
  })
  // 编辑对话框是否可见
  const [dialogOpen, setDialogOpen] = useState(false)
  // 是否编辑状态
  const [isEdit, setIsEdit] = useState(false)
  // 分配菜单弹窗
  const [allocMenuVisible, setAllocMenuVisible] = useState(false)
  const [allocMenuRoleId, setAllocMenuRoleId] = useState<number>()

  // 获取角色列表
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getRoleListAPI(listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取角色列表失败:', error)
    }
  }

  // 组件挂载后初始化数据
  useEffect(() => {
    getList()
  }, [listQuery])

  // 重置搜索条件
  const handleResetSearch = () => {
    setListQuery({ ...listQuery, pageNum: 1, keyword: '' })
  }

  // 处理搜索
  const handleSearchList = () => {
    setListQuery({ ...listQuery, pageNum: 1 })
  }

  // 处理添加角色
  const handleAdd = () => {
    setDialogOpen(true)
    setIsEdit(false)
    setRole({
      name: '',
      adminCount: 0,
      status: 1,
    })
  }

  // 处理状态变化
  const handleStatusChange = async (row: UmsRole, checked: boolean) => {
    modal.confirm({
      title: '提示',
      content: '是否要修改该状态?',
      onOk: async () => {
        try {
          await roleUpdateStatusAPI(row.id!, { status: checked ? 1 : 0 })
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
  const handleDelete = (row: UmsRole) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该角色?',
      onOk: async () => {
        try {
          const ids = [row.id]
          await roleDeleteByIdsAPI({ ids: ids.toString() })
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
  const handleUpdate = (row: UmsRole) => {
    setDialogOpen(true)
    setIsEdit(true)
    setRole({ ...row })
  }

  // 处理对话框确认
  const handleDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        try {
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
        }
        catch (error) {
          console.error('操作失败:', error)
        }
      },
    })
  }

  // 处理选择菜单
  const handleSelectMenu = (row: UmsRole) => {
    setAllocMenuRoleId(row.id)
    setAllocMenuVisible(true)
  }

  // 处理选择资源
  const handleSelectResource = (row: UmsRole) => {
    openTab({ key: `/mall/ums/allocResource?roleId=${row.id}`, label: '分配资源' })
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
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      align: 'center' as const,
    },
    {
      title: '用户数',
      dataIndex: 'adminCount',
      key: 'adminCount',
      width: 100,
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
      title: '是否启用',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center' as const,
      render: (status: number, row: UmsRole) => (
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
      width: 260,
      align: 'center' as const,
      render: (_: any, row: UmsRole) => (
        <div style={{ display: 'flex', gap: 4, whiteSpace: 'nowrap' }}>
          <Button type="link" onClick={() => handleSelectMenu(row)}>分配菜单</Button>
          <Button type="link" onClick={() => handleSelectResource(row)}>分配资源</Button>
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
                placeholder="角色名称"
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

      {/* 添加/编辑角色对话框 */}
      <Modal
        title={isEdit ? '编辑角色' : '添加角色'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleDialogConfirm}
        width={500}
      >
        <Form labelCol={{ span: 6 }}>
          <Form.Item label="角色名称：">
            <Input
              value={role.name}
              onChange={e => setRole({ ...role, name: e.target.value })}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item label="描述：">
            <TextArea
              value={role.description}
              onChange={e => setRole({ ...role, description: e.target.value })}
              rows={5}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item label="是否启用：">
            <Radio.Group
              value={role.status}
              onChange={e => setRole({ ...role, status: e.target.value })}
            >
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配菜单弹窗 */}
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
