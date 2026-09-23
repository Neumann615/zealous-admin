import type { PageParam, RoleRecord } from '@zealous-admin/auth'
import { PlusOutlined } from '@ant-design/icons'
import { createRole, deleteRole, getRolePage, updateRole } from '@zealous-admin/auth'
import { useAppMessage } from '@zealous-admin/layout/index'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Switch,
  Table,
} from 'antd'
import { createStyles } from 'antd-style'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import AllocMenuModal from './AllocMenuModal'

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
  name: [
    { required: true, message: '请输入角色名称' },
    { min: 2, max: 50, message: '角色名称长度为 2-50 个字符' },
  ],
  description: [
    { max: 200, message: '描述不能超过 200 个字符' },
  ],
}

// ============================================================
// 组件
// ============================================================
export default function SystemRole() {
  const { message, modal } = useAppMessage()
  const { styles } = useStyles()
  const [form] = Form.useForm()

  const [listQuery, setListQuery] = useState<PageParam>({
    pageNum: 1,
    pageSize: 10,
    keyword: '',
  })
  const [list, setList] = useState<RoleRecord[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number>()

  const [allocMenuVisible, setAllocMenuVisible] = useState(false)
  const [allocMenuRoleId, setAllocMenuRoleId] = useState<number>()

  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getRolePage(listQuery)
      setList(res.list)
      setTotal(res.total)
    }
    catch { /* ignore */ }
    finally { setListLoading(false) }
  }

  useEffect(() => {
    getList()
  }, [listQuery])

  const handleAdd = () => {
    setIsEdit(false)
    setEditId(undefined)
    form.resetFields()
    form.setFieldsValue({ status: 1 })
    setDialogOpen(true)
  }

  const handleUpdate = (row: RoleRecord) => {
    setIsEdit(true)
    setEditId(row.id)
    form.setFieldsValue(row)
    setDialogOpen(true)
  }

  const handleDelete = (row: RoleRecord) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该角色?',
      onOk: async () => {
        await deleteRole(row.id!)
        message.success('删除成功!')
        getList()
      },
    })
  }

  const handleDialogConfirm = async () => {
    const values = await form.validateFields()
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        if (isEdit) {
          await updateRole(editId!, values)
          message.success('修改成功！')
        }
        else {
          await createRole(values)
          message.success('添加成功！')
        }
        setDialogOpen(false)
        getList()
      },
    })
  }

  const handleSelectMenu = (row: RoleRecord) => {
    setAllocMenuRoleId(row.id)
    setAllocMenuVisible(true)
  }

  const handleSearch = () => {
    setListQuery(prev => ({ ...prev, pageNum: 1 }))
  }

  const handleReset = () => {
    setListQuery({ pageNum: 1, pageSize: 10, keyword: '' })
  }

  const columns = [
    { title: '编号', dataIndex: 'id', key: 'id', width: 80, align: 'center' as const },
    { title: '角色名称', dataIndex: 'name', key: 'name', align: 'center' as const },
    { title: '描述', dataIndex: 'description', key: 'description', align: 'center' as const },
    { title: '用户数', dataIndex: 'adminCount', key: 'adminCount', width: 80, align: 'center' as const },
    {
      title: '添加时间',
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
      render: (status: number) => (
        <Switch checked={status === 1} disabled />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      align: 'center' as const,
      render: (_: any, row: RoleRecord) => (
        <Space size="small">
          <Button type="link" onClick={() => handleSelectMenu(row)}>分配菜单</Button>
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
              placeholder="角色名称"
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
        title={isEdit ? '编辑角色' : '添加角色'}
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
          <Form.Item label="角色名称" name="name" rules={FORM_RULES.name}>
            <Input allowClear />
          </Form.Item>
          <Form.Item label="描述" name="description" rules={FORM_RULES.description}>
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
