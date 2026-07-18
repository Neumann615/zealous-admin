import type { PageParam } from '@/types/common'
import type { UmsMenu } from '@/types/menu'
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
  getMenuListByParentIdAPI,
  getMenuTreeListAPI,
  menuCreateAPI,
  menuUpdateHiddenByIdAPI,
  updateMenu,
} from '@/apis/menu'
import { useAppMessage } from '@/hooks/useAppMessage'

export default function Menu() {
  const { message, modal } = useAppMessage()
  const [form] = Form.useForm()
  // 菜单列表查询参数
  const [listQuery, setListQuery] = useState<PageParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 菜单列表数据
  const [list, setList] = useState<UmsMenu[]>([])
  // 父级菜单ID
  const [parentId, setParentId] = useState(0)
  // 分页总数
  const [total, setTotal] = useState(0)
  // 表格加载状态
  const [listLoading, setListLoading] = useState(true)
  // 编辑对话框是否可见
  const [dialogOpen, setDialogOpen] = useState(false)
  // 是否编辑状态
  const [isEdit, setIsEdit] = useState(false)
  // 当前编辑的菜单ID
  const [editMenuId, setEditMenuId] = useState<number>()
  // 上级菜单选项列表
  const [selectMenuList, setSelectMenuList] = useState<UmsMenu[]>([])

  // 默认菜单对象
  const defaultMenu: UmsMenu = {
    title: '',
    parentId: 0,
    name: '',
    icon: '',
    hidden: 0,
    sort: 0,
  }

  // 获取菜单列表
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getMenuListByParentIdAPI(parentId, listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取菜单列表失败:', error)
    }
  }

  // 获取上级菜单选项列表（树形结构）
  const getSelectMenuList = async () => {
    const res = await getMenuTreeListAPI()
    const convertToTree = (menus: any[]): any[] => {
      return menus.map(menu => ({
        value: menu.id,
        label: menu.title,
        children: menu.children && menu.children.length > 0 ? convertToTree(menu.children) : undefined,
      }))
    }
    setSelectMenuList([
      { value: 0, label: '无上级菜单' },
      ...convertToTree(res.data),
    ])
  }

  // 监听 parentId 和 listQuery 变化自动刷新
  useEffect(() => {
    getList()
  }, [parentId, listQuery])

  // 处理添加菜单
  const handleAddMenu = () => {
    setDialogOpen(true)
    setIsEdit(false)
    setEditMenuId(undefined)
    getSelectMenuList()
    form.resetFields()
    form.setFieldsValue(defaultMenu)
  }

  // 处理隐藏状态变化
  const handleHiddenChange = async (row: UmsMenu, checked: boolean) => {
    try {
      await menuUpdateHiddenByIdAPI(row.id!, { hidden: checked ? 0 : 1 })
      message.success('修改成功')
      getList()
    }
    catch (error) {
      console.error('更新显示状态失败:', error)
    }
  }

  // 处理显示下级
  const handleShowNextLevel = (row: UmsMenu) => {
    setParentId(row.id!)
    setListQuery(prev => ({ ...prev, pageNum: 1 }))
  }

  // 返回上级
  const handleBackToParent = () => {
    setParentId(0)
    setListQuery({ pageNum: 1, pageSize: 10 })
  }

  // 处理更新
  const handleUpdate = async (row: UmsMenu) => {
    setDialogOpen(true)
    setIsEdit(true)
    setEditMenuId(row.id)
    await getSelectMenuList()
    // 获取菜单详情并回填表单
    const res = await getMenuByIdAPI(row.id!)
    form.setFieldsValue(res.data)
  }

  // 处理删除
  const handleDelete = (row: UmsMenu) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该菜单',
      onOk: async () => {
        try {
          await deleteMenuByIdAPI(row.id!)
          message.success('删除成功')
          getList()
        }
        catch (error) {
          console.error('删除菜单失败:', error)
        }
      },
    })
  }

  // 在树形数据中查找节点的level
  const findNodeLevel = (treeData: any[], targetId: number, currentLevel: number = 0): number => {
    for (const node of treeData) {
      if (node.value === targetId) {
        return currentLevel
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeLevel(node.children, targetId, currentLevel + 1)
        if (found !== -1)
          return found
      }
    }
    return -1
  }

  // 处理对话框确认
  const handleDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        try {
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
          getList()
        }
        catch (error) {
          console.error('操作失败:', error)
        }
      },
    })
  }

  // 级别过滤器
  const levelFilter = (value: number) => {
    if (value === 0) {
      return '一级'
    }
    else if (value === 1) {
      return '二级'
    }
    else if (value === 2) {
      return '三级'
    }
    else if (value === 3) {
      return '四级'
    }
    else if (value === 4) {
      return '五级'
    }
    else if (value === 5) {
      return '六级'
    }
    else if (value === 6) {
      return '七级'
    }
    else if (value === 7) {
      return '八级'
    }
    else if (value === 8) {
      return '九级'
    }
    else if (value === 9) {
      return '十级'
    }
    return `${value + 1}级`
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
      title: '菜单名称',
      dataIndex: 'title',
      key: 'title',
      align: 'center' as const,
    },
    {
      title: '菜单级数',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      align: 'center' as const,
      render: (level: number) => levelFilter(level),
    },
    {
      title: '前端名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
    },
    {
      title: '前端图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 100,
      align: 'center' as const,
      render: (icon: string) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {icon ? <ZaIcon value={icon} /> : '-'}
        </div>
      ),
    },
    {
      title: '是否显示',
      dataIndex: 'hidden',
      key: 'hidden',
      width: 100,
      align: 'center' as const,
      render: (hidden: number, row: UmsMenu) => (
        <Switch
          checked={hidden === 0}
          onChange={checked => handleHiddenChange(row, checked)}
          checkedChildren="显示"
          unCheckedChildren="隐藏"
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '设置',
      key: 'settings',
      width: 120,
      align: 'center' as const,
      render: (_: any, row: UmsMenu) => (
        <Button
          type="link"
          onClick={() => handleShowNextLevel(row)}
        >
          查看下级
        </Button>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      align: 'center' as const,
      render: (_: any, row: UmsMenu) => (
        <Space>
          <Button type="link" onClick={() => handleUpdate(row)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card
        title="数据列表"
        extra={(
          <Space>
            {parentId > 0 && (
              <Button onClick={handleBackToParent}>返回上级</Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMenu}>
              添加
            </Button>
          </Space>
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
            pageSizeOptions: ['10', '15', '20'],
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          rowKey="id"
        />
      </Card>

      {/* 添加/编辑菜单对话框 */}
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
            <TreeSelect
              treeData={selectMenuList}
              placeholder="请选择上级菜单"
              treeDefaultExpandAll
              allowClear
            />
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
          <Form.Item
            label="前端图标："
            name="icon"
            rules={[
              { required: true, message: '请选择前端图标' },
            ]}
          >
            <ZaIconPicker placeholder="请选择图标" />
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
