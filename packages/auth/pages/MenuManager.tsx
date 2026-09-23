import type { MenuNode, MenuRecord } from '@zealous-admin/auth'
import type { TableColumnsType } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createMenu, deleteMenu, getMenuDetail, getMenuTree, getPageKeys, updateMenu, updateMenuStatus, useHasPermission } from '@zealous-admin/auth'
import { ZaIcon, ZaIconPicker } from '@zealous-admin/components/index'
import { useAppMessage } from '@zealous-admin/layout/index'
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
  Tag,
  TreeSelect,
} from 'antd'
import { createStyles } from 'antd-style'
import { useEffect, useState } from 'react'

// ============================================================
// 样式
// ============================================================
const useStyles = createStyles(({ token, css }) => ({
  toolbar: css`
    margin-bottom: ${token.marginSM}px;
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
  title: [
    { required: true, message: '请输入菜单名称' },
    { min: 2, max: 140, message: '长度在 2 到 140 个字符' },
  ],
  name: [
    { required: true, message: '请输入前端名称' },
    { min: 2, max: 140, message: '长度在 2 到 140 个字符' },
  ],
  permission: [
    { required: true, message: '请输入权限标识' },
    { pattern: /^[\w-]+(:[\w-]+)+$/, message: '形如 system:user:add' },
  ],
  // icon 不做必填校验
}

/** 节点类型：0 目录（只分组）/ 1 菜单（对应页面）/ 2 按钮（只承载权限标识） */
const MENU_TYPE_META: Record<number, { label: string, color: string }> = {
  0: { label: '目录', color: 'blue' },
  1: { label: '菜单', color: 'green' },
  2: { label: '按钮', color: 'orange' },
}

// ============================================================
// 组件
// ============================================================
export default function SystemMenu() {
  const { message, modal } = useAppMessage()
  const hasPermission = useHasPermission()
  const { styles } = useStyles()
  const [form] = Form.useForm()

  const [treeData, setTreeData] = useState<MenuNode[]>([])
  const [listLoading, setListLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editMenuId, setEditMenuId] = useState<number>()
  const [selectMenuList, setSelectMenuList] = useState<MenuRecord[]>([])

  // 按钮节点没有路由，前端名称 / 图标 / 页面组件 / 显示开关都不适用
  const nodeType = Form.useWatch('type', form) ?? 1
  const isButton = nodeType === 2
  const pageOptions = getPageKeys().map(key => ({ value: key, label: key }))

  const fetchTree = async () => {
    setListLoading(true)
    try {
      const res = await getMenuTree()
      setTreeData(res)
    }
    catch { /* ignore */ }
    finally { setListLoading(false) }
  }

  const getSelectMenuList = async () => {
    const res = await getMenuTree()
    const convertToTree = (menus: any[]): any[] => menus.map(menu => ({
      value: menu.id,
      label: menu.title,
      children: menu.children?.length ? convertToTree(menu.children) : undefined,
    }))
    setSelectMenuList([
      { value: 0, label: '无上级菜单' } as any,
      ...convertToTree(res),
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
    form.setFieldsValue({ parentId: 0, hidden: 0, sort: 0, type: 1 })
  }

  const handleUpdate = async (row: MenuRecord) => {
    setDialogOpen(true)
    setIsEdit(true)
    setEditMenuId(row.id)
    await getSelectMenuList()
    const res = await getMenuDetail(row.id!)
    form.setFieldsValue({ ...res, type: res.type ?? 1 })
  }

  const handleDelete = (row: MenuRecord) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该菜单?',
      onOk: async () => {
        await deleteMenu(row.id!)
        message.success('删除成功')
        fetchTree()
      },
    })
  }

  const handleHiddenChange = async (row: MenuRecord, checked: boolean) => {
    await updateMenuStatus(row.id!, checked ? 0 : 1)
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
    const values = await form.validateFields()
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        const level = values.parentId === 0 ? 0 : findNodeLevel(selectMenuList, values.parentId, 0) + 1
        // 按钮节点清空前端名称，后端算出的 path 为空串，路由表里不会出现它
        const submitData = values.type === 2
          ? { ...values, level, name: '', hidden: 1 }
          : { ...values, level }
        if (isEdit) {
          await updateMenu(editMenuId!, submitData)
          message.success('修改成功！')
        }
        else {
          await createMenu(submitData)
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
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      align: 'center' as const,
      render: (type: number) => {
        const meta = MENU_TYPE_META[type ?? 1] ?? MENU_TYPE_META[1]
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '前端名称',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      render: (name: string) => name || '-',
    },
    {
      title: '路由路径',
      dataIndex: 'path',
      key: 'path',
      width: 200,
      render: (path: string, row: MenuNode) => {
        // 按钮节点没有路由；目录也可能挂着真实页面（如 /demo/breadcrumb/nested），按有无 path 如实展示
        return row.type === 2 ? '-' : (path || '-')
      },
    },
    {
      title: '页面组件',
      dataIndex: 'component',
      key: 'component',
      width: 180,
      render: (component: string | null, row: MenuNode) => {
        if (row.type === 2 || !row.path)
          return '-'
        return component || '按路径回落'
      },
    },
    {
      title: '权限标识',
      dataIndex: 'permission',
      key: 'permission',
      width: 200,
      render: (permission: string | null) => permission || '-',
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
      render: (hidden: number, row: MenuRecord) => (
        row.type === 2
          ? '-'
          : (
              <Switch
                size="small"
                checked={hidden === 0}
                disabled={!hasPermission('system:menu:edit')}
                onChange={checked => handleHiddenChange(row, checked)}
              />
            )
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      align: 'center' as const,
      render: (_: any, row: MenuRecord) => (
        <Space size="small">
          {hasPermission('system:menu:edit') && <Button type="link" size="small" onClick={() => handleUpdate(row)}>编辑</Button>}
          {hasPermission('system:menu:delete') && <Button type="link" size="small" danger onClick={() => handleDelete(row)}>删除</Button>}
        </Space>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card>
        <div className={styles.toolbar}>
          {hasPermission('system:menu:add') && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加导航</Button>}
        </div>
        <div className={styles.tableWrapper}>
          <Table
            columns={columns}
            dataSource={treeData}
            loading={listLoading}
            pagination={false}
            rowKey="id"
            expandable={{
              defaultExpandedRowKeys: [1, 23],
            }}
          />
        </div>
      </Card>

      <Modal
        title={isEdit ? '编辑菜单' : '添加菜单'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleDialogConfirm}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 16 }}
          preserve={false}
        >
          <Form.Item label="节点类型" name="type" tooltip="目录只做分组，菜单对应一个页面，按钮只承载权限标识">
            <Radio.Group>
              <Radio value={0}>目录</Radio>
              <Radio value={1}>菜单</Radio>
              <Radio value={2}>按钮</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="菜单名称" name="title" rules={FORM_RULES.title}>
            <Input allowClear />
          </Form.Item>
          <Form.Item label="上级菜单" name="parentId">
            <TreeSelect treeData={selectMenuList} placeholder="请选择上级菜单" treeDefaultExpandAll allowClear />
          </Form.Item>
          {!isButton && (
            <>
              <Form.Item label="前端名称" name="name" rules={FORM_RULES.name} tooltip="用于拼接路由路径，需与页面文件约定一致">
                <Input allowClear />
              </Form.Item>
              <Form.Item label="页面组件" name="component" extra="留空则按路由路径回落到 src/pages/index 下的同名文件">
                <Select allowClear showSearch placeholder="请选择页面组件" options={pageOptions} />
              </Form.Item>
              <Form.Item label="前端图标" name="icon">
                <ZaIconPicker placeholder="请选择图标" />
              </Form.Item>
              <Form.Item label="激活图标" name="activeIcon">
                <ZaIconPicker placeholder="选填，点击时切换的图标" />
              </Form.Item>
              <Form.Item label="是否显示" name="hidden">
                <Radio.Group>
                  <Radio value={0}>是</Radio>
                  <Radio value={1}>否</Radio>
                </Radio.Group>
              </Form.Item>
            </>
          )}
          <Form.Item
            label="权限标识"
            name="permission"
            rules={isButton ? FORM_RULES.permission : []}
            extra="服务端接口鉴权与前端按钮显隐都认这个标识"
          >
            <Input allowClear placeholder={isButton ? '必填，形如 system:user:add' : '选填，形如 system:user:list'} />
          </Form.Item>
          <Form.Item label="排序" name="sort">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
