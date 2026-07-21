import type { TableColumnsType } from 'antd'
import type { Menu, MenuNode } from '@/types/menu'
import { PlusOutlined } from '@ant-design/icons'
import { ZaIcon, ZaIconPicker } from '@zealous-admin/components/index'
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
  TreeSelect,
} from 'antd'
import { useEffect, useState } from 'react'
import {
  deleteMenuByIdAPI,
  getMenuByIdAPI,
  getMenuTreeListAPI,
  menuCreateAPI,
  updateMenu,
} from '@/apis/menu'
import { useAppMessage } from '@/hooks/useAppMessage'

export default function SystemMenu() {
  const { message, modal } = useAppMessage()
  const [form] = Form.useForm()

  const [treeData, setTreeData] = useState<MenuNode[]>([])
  const [listLoading, setListLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editMenuId, setEditMenuId] = useState<number>()
  const [selectMenuList, setSelectMenuList] = useState<Menu[]>([])

  const defaultMenu: Menu = {
    title: '',
    parentId: 0,
    name: '',
    icon: '',
    hidden: 0,
    sort: 0,
    activeIcon: '',
  }

  const fetchTree = async () => {
    setListLoading(true)
    try {
      const res = await getMenuTreeListAPI()
      setTreeData(res.data)
    }
    catch { /* ignore */ }
    finally { setListLoading(false) }
  }

  const getSelectMenuList = async () => {
    const res = await getMenuTreeListAPI()
    const convertToTree = (menus: any[]): any[] => menus.map(menu => ({
      value: menu.id,
      label: menu.title,
      children: menu.children?.length ? convertToTree(menu.children) : undefined,
    }))
    setSelectMenuList([
      { value: 0, label: '无上级菜单' } as any,
      ...convertToTree(res.data),
    ])
  }

  useEffect(() => {
    fetchTree()
  }, [])

  const handleAdd = () => {
    setDialogOpen(true)
    setIsEdit(false)
    setEditMenuId(undefined)
    getSelectMenuList()
    form.resetFields()
    form.setFieldsValue(defaultMenu)
  }

  const handleUpdate = async (row: Menu) => {
    setDialogOpen(true)
    setIsEdit(true)
    setEditMenuId(row.id)
    await getSelectMenuList()
    const res = await getMenuByIdAPI(row.id!)
    form.setFieldsValue(res.data)
  }

  const handleDelete = (row: Menu) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该菜单?',
      onOk: async () => {
        await deleteMenuByIdAPI(row.id!)
        message.success('删除成功')
        fetchTree()
      },
    })
  }

  const handleHiddenChange = async (row: Menu, checked: boolean) => {
    await updateMenu(row.id!, { ...row, hidden: checked ? 0 : 1 })
    message.success('修改成功')
    fetchTree()
  }

  const findNodeLevel = (td: any[], targetId: number, currentLevel = 0): number => {
    for (const node of td) {
      if (node.value === targetId)
        return currentLevel
      if (node.children?.length) {
        const found = findNodeLevel(node.children, targetId, currentLevel + 1)
        if (found !== -1)
          return found
      }
    }
    return -1
  }

  const handleDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        const values = form.getFieldsValue()
        const level = values.parentId === 0 ? 0 : findNodeLevel(selectMenuList, values.parentId, 0) + 1
        const submitData = { ...values, level }
        if (isEdit) {
          await updateMenu(editMenuId!, submitData)
          message.success('修改成功！')
        }
        else {
          await menuCreateAPI(submitData)
          message.success('添加成功！')
        }
        setDialogOpen(false)
        fetchTree()
      },
    })
  }

  const columns: TableColumnsType<MenuNode> = [
    {
      title: '菜单名称',
      dataIndex: 'title',
      key: 'title',
      width: 240,
    },
    {
      title: '路由路径',
      dataIndex: 'path',
      key: 'path',
      width: 200,
      render: (path: string) => path || '-',
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 70,
      align: 'center' as const,
      render: (icon: string) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {icon ? <ZaIcon value={icon} /> : '-'}
        </div>
      ),
    },
    {
      title: '激活图标',
      dataIndex: 'activeIcon',
      key: 'activeIcon',
      width: 70,
      align: 'center' as const,
      render: (icon: string) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {icon ? <ZaIcon value={icon} /> : '-'}
        </div>
      ),
    },
    {
      title: '显示',
      dataIndex: 'hidden',
      key: 'hidden',
      width: 80,
      align: 'center' as const,
      render: (hidden: number, row: Menu) => (
        <Switch
          size="small"
          checked={hidden === 0}
          onChange={checked => handleHiddenChange(row, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      align: 'center' as const,
      render: (_: any, row: Menu) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleAdd()}>添加子级</Button>
          <Button type="link" size="small" onClick={() => handleUpdate(row)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card>
        <Button style={{ marginBottom: 8 }} type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加主导航</Button>
        <Table
          columns={columns}
          dataSource={treeData}
          loading={listLoading}
          bordered
          pagination={false}
          rowKey="id"
          expandable={{
            defaultExpandedRowKeys: [1, 23],
          }}
        />
      </Card>

      <Modal
        title={isEdit ? '编辑菜单' : '添加菜单'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleDialogConfirm}
        width={600}
      >
        <Form
          form={form}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 14 }}
          initialValues={defaultMenu}
        >
          <Form.Item
            label="菜单名称："
            name="title"
            rules={[
              { required: true, message: '请输入菜单名称' },
              { min: 2, max: 140, message: '长度在 2 到 140 个字符' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="上级菜单：" name="parentId">
            <TreeSelect treeData={selectMenuList} placeholder="请选择上级菜单" treeDefaultExpandAll allowClear />
          </Form.Item>
          <Form.Item
            label="前端名称："
            name="name"
            rules={[
              { required: true, message: '请输入前端名称' },
              { min: 2, max: 140, message: '长度在 2 到 140 个字符' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="路由路径：" name="path" help="相对路径，上级路径会自动拼接">
            <Input placeholder="如 /admin" />
          </Form.Item>
          <Form.Item label="前端图标：" name="icon" rules={[{ required: true, message: '请选择前端图标' }]}>
            <ZaIconPicker placeholder="请选择图标" />
          </Form.Item>
          <Form.Item label="激活图标：" name="activeIcon">
            <ZaIconPicker placeholder="选填，点击时切换的图标" />
          </Form.Item>
          <Form.Item label="是否显示：" name="hidden">
            <Radio.Group>
              <Radio value={0}>是</Radio>
              <Radio value={1}>否</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="排序：" name="sort">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
