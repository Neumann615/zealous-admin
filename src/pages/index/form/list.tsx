import type { FormCategoryRecord, FormRecord } from '@/apis/form'
import { AppstoreOutlined, DatabaseOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SendOutlined, StopOutlined } from '@ant-design/icons'
import { useHasPermission } from '@zealous-admin/auth'
import { useAppMessage, useControlTab } from '@zealous-admin/layout/index'
import { Button, Card, Input, InputNumber, Modal, Select, Space, Table, Tag, TreeSelect } from 'antd'
import { createStyles } from 'antd-style'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import {
  createFormAPI,
  createFormCategoryAPI,
  createFormDraftAPI,
  deleteFormAPI,
  deleteFormCategoryAPI,
  getFormCategoryTreeAPI,
  getFormListAPI,
  publishFormAPI,
  retireFormAPI,
  reviveFormAPI,
  updateFormAPI,
  updateFormCategoryAPI,
  updateFormCategoryStatusAPI,
} from '@/apis/form'

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
  filters: css`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: ${token.marginSM}px;
  `,
}))

function enabledCategoryTree(nodes: FormCategoryRecord[]): FormCategoryRecord[] {
  return nodes
    .filter(node => node.status === 1)
    .map(node => ({ ...node, children: enabledCategoryTree(node.children ?? []) }))
}

function parentCategoryOptions(nodes: FormCategoryRecord[], excludedId?: number): FormCategoryRecord[] {
  return nodes
    .filter(node => node.id !== excludedId)
    .map(node => ({ ...node, children: [] }))
}

export default function FormListPage() {
  const { message, modal } = useAppMessage()
  const hasPermission = useHasPermission()
  const { openTab } = useControlTab()
  const { styles } = useStyles()

  const [list, setList] = useState<FormRecord[]>([])
  const [categories, setCategories] = useState<FormCategoryRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | undefined>()
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [pageNum, setPageNum] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [createCategoryId, setCreateCategoryId] = useState<number | undefined>()
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [categoryEditOpen, setCategoryEditOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<FormCategoryRecord | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryParentId, setCategoryParentId] = useState<number | undefined>()
  const [categorySortOrder, setCategorySortOrder] = useState(0)
  const [assignForm, setAssignForm] = useState<FormRecord | null>(null)
  const [assignCategoryId, setAssignCategoryId] = useState<number | undefined>()

  const loadCategories = async () => {
    try {
      const res = await getFormCategoryTreeAPI()
      setCategories(res.data)
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
  }

  const load = async (
    page = pageNum,
    nextKeyword = keyword,
    nextStatus = status,
    nextCategoryId = categoryId,
  ) => {
    setLoading(true)
    try {
      const res = await getFormListAPI({
        pageNum: page,
        pageSize: 10,
        keyword: nextKeyword,
        status: nextStatus,
        categoryId: nextCategoryId,
      })
      setList(res.data.list)
      setTotal(res.data.total)
      setPageNum(page)
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
    load(1)
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) {
      message.warning('请输入表单名称')
      return
    }
    const res = await createFormAPI({ name: name.trim(), description, categoryId: createCategoryId ?? null })
    message.success('创建成功')
    setCreateOpen(false)
    setName('')
    setDescription('')
    setCreateCategoryId(undefined)
    openTab({ key: `/form/design?id=${res.data.id}`, label: `设计-${name.trim()}` })
  }

  const openDesign = async (row: FormRecord) => {
    if (row.status === 1 && !row.hasDraft)
      await createFormDraftAPI(row.id)
    openTab({ key: `/form/design?id=${row.id}`, label: `设计-${row.name}` })
  }

  const handleToggleStatus = async (row: FormRecord) => {
    try {
      if (row.status === 0) {
        await publishFormAPI(row.id)
        message.success('发布成功')
      }
      else if (row.status === 1) {
        await retireFormAPI(row.id)
        message.success('已退役')
      }
      else {
        await reviveFormAPI(row.id)
        message.success('已恢复')
      }
      load()
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
  }

  const handleDelete = (row: FormRecord) => {
    modal.confirm({
      title: '提示',
      content: row.status === 1 && row.hasDraft
        ? `确认放弃表单「${row.name}」的未发布草稿?`
        : `确认删除草稿表单「${row.name}」?`,
      onOk: async () => {
        await deleteFormAPI(row.id)
        message.success('删除成功!')
        load()
      },
    })
  }

  const openCategoryCreate = (parentId?: number) => {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryParentId(parentId)
    setCategorySortOrder(0)
    setCategoryEditOpen(true)
  }

  const openCategoryEdit = (row: FormCategoryRecord) => {
    setEditingCategory(row)
    setCategoryName(row.name)
    setCategoryParentId(row.parentId ?? undefined)
    setCategorySortOrder(row.sortOrder)
    setCategoryEditOpen(true)
  }

  const handleCategorySave = async () => {
    if (!categoryName.trim()) {
      message.warning('请输入分类名称')
      return
    }
    const data = {
      parentId: categoryParentId ?? null,
      name: categoryName.trim(),
      sortOrder: categorySortOrder,
    }
    if (editingCategory)
      await updateFormCategoryAPI(editingCategory.id, data)
    else
      await createFormCategoryAPI(data)
    message.success('保存成功')
    setCategoryEditOpen(false)
    await loadCategories()
    await load()
  }

  const handleCategoryStatus = async (row: FormCategoryRecord) => {
    await updateFormCategoryStatusAPI(row.id, row.status === 1 ? 0 : 1)
    message.success(row.status === 1 ? '已停用' : '已启用')
    await loadCategories()
  }

  const handleCategoryDelete = (row: FormCategoryRecord) => {
    modal.confirm({
      title: '提示',
      content: `确认删除分类「${row.name}」?`,
      onOk: async () => {
        await deleteFormCategoryAPI(row.id)
        message.success('删除成功')
        await loadCategories()
        await load()
      },
    })
  }

  const handleAssignCategory = async () => {
    if (!assignForm)
      return
    await updateFormAPI({ id: assignForm.id, categoryId: assignCategoryId ?? null })
    message.success('分类已更新')
    setAssignForm(null)
    await load()
  }

  const enabledCategories = enabledCategoryTree(categories)
  const parentOptions = parentCategoryOptions(enabledCategories, editingCategory?.id)

  const categoryColumns = [
    { title: '分类名称', dataIndex: 'name', key: 'name' },
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 80, align: 'center' as const },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center' as const,
      render: (value: number) => (value === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      align: 'center' as const,
      render: (_: any, row: FormCategoryRecord) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openCategoryEdit(row)}>编辑</Button>
          {row.parentId === null && row.status === 1 && <Button size="small" type="link" onClick={() => openCategoryCreate(row.id)}>添加子类</Button>}
          <Button size="small" type="link" onClick={() => handleCategoryStatus(row)}>{row.status === 1 ? '停用' : '启用'}</Button>
          <Button size="small" type="link" danger onClick={() => handleCategoryDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ]

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' as const },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: 'FormKey', dataIndex: 'formKey', key: 'formKey', width: 160, ellipsis: true },
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 140,
      ellipsis: true,
      render: (value: string | null) => value || <span style={{ opacity: 0.45 }}>未分类</span>,
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '数据量', dataIndex: 'dataCount', key: 'dataCount', width: 90, align: 'center' as const },
    { title: '版本', dataIndex: 'version', key: 'version', width: 70, align: 'center' as const },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center' as const,
      render: (value: number) => (value === 1
        ? <Tag color="green">已发布</Tag>
        : value === 2 ? <Tag color="default">已退役</Tag> : <Tag>草稿</Tag>),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 170,
      align: 'center' as const,
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : 'N/A'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 390,
      align: 'center' as const,
      render: (_: any, row: FormRecord) => (
        <Space size="small">
          {hasPermission('form:form:edit') && row.status !== 2 && <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openDesign(row)}>设计</Button>}
          {hasPermission('form:form:edit') && (
            <Button
              size="small"
              type="link"
              icon={<AppstoreOutlined />}
              onClick={() => {
                setAssignForm(row)
                setAssignCategoryId(row.categoryId ?? undefined)
              }}
            >
              分类
            </Button>
          )}
          {hasPermission('form:form:list') && row.status === 1 && <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => openTab({ key: `/form/render?id=${row.id}`, label: `渲染-${row.name}` })}>渲染</Button>}
          {hasPermission('form:data:list') && <Button size="small" type="link" icon={<DatabaseOutlined />} onClick={() => openTab({ key: `/form/data?id=${row.id}`, label: `数据-${row.name}` })}>数据</Button>}
          {hasPermission('form:form:edit') && (
            <Button size="small" type="link" icon={row.status === 1 ? <StopOutlined /> : <SendOutlined />} onClick={() => handleToggleStatus(row)}>
              {row.status === 1 ? '退役' : row.status === 2 ? '恢复' : '发布'}
            </Button>
          )}
          {hasPermission('form:form:delete') && (row.status === 0 || row.hasDraft) && <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)}>{row.status === 1 ? '放弃草稿' : '删除'}</Button>}
        </Space>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <Input.Search
              placeholder="搜索名称 / FormKey"
              allowClear
              onSearch={(value) => {
                setKeyword(value)
                load(1, value)
              }}
              style={{ width: 240 }}
            />
            <Select
              placeholder="状态"
              allowClear
              value={status}
              options={[
                { label: '草稿', value: 0 },
                { label: '已发布', value: 1 },
                { label: '已退役', value: 2 },
              ]}
              onChange={(value) => {
                setStatus(value)
                load(1, keyword, value)
              }}
              style={{ width: 120 }}
            />
            <TreeSelect
              placeholder="分类"
              allowClear
              treeDefaultExpandAll
              value={categoryId}
              treeData={enabledCategories}
              fieldNames={{ label: 'name', value: 'id', children: 'children' }}
              onChange={(value) => {
                setCategoryId(value)
                load(1, keyword, status, value)
              }}
              style={{ width: 180 }}
            />
          </div>
          <Space>
            {hasPermission('form:form:edit') && <Button icon={<AppstoreOutlined />} onClick={() => setCategoryManagerOpen(true)}>分类管理</Button>}
            {hasPermission('form:form:add') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建表单</Button>}
          </Space>
        </div>
        <div className={styles.tableWrapper}>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={list}
            columns={columns}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: pageNum,
              total,
              pageSize: 10,
              showTotal: value => `共 ${value} 条记录`,
              onChange: page => load(page),
            }}
          />
        </div>

        <Modal title="新建表单" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)} okText="创建" destroyOnClose>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input placeholder="表单名称" value={name} onChange={event => setName(event.target.value)} />
            <TreeSelect
              placeholder="选择分类（可选）"
              allowClear
              treeDefaultExpandAll
              value={createCategoryId}
              treeData={enabledCategories}
              fieldNames={{ label: 'name', value: 'id', children: 'children' }}
              onChange={setCreateCategoryId}
              style={{ width: '100%' }}
            />
            <Input.TextArea placeholder="描述（可选）" rows={3} value={description} onChange={event => setDescription(event.target.value)} />
          </Space>
        </Modal>

        <Modal
          title={assignForm ? `修改分类：${assignForm.name}` : '修改分类'}
          open={!!assignForm}
          onOk={handleAssignCategory}
          onCancel={() => setAssignForm(null)}
          okText="保存"
          destroyOnClose
        >
          <TreeSelect
            placeholder="选择分类"
            allowClear
            treeDefaultExpandAll
            value={assignCategoryId}
            treeData={enabledCategories}
            fieldNames={{ label: 'name', value: 'id', children: 'children' }}
            onChange={setAssignCategoryId}
            style={{ width: '100%' }}
          />
        </Modal>

        <Modal
          title="表单分类管理"
          open={categoryManagerOpen}
          footer={null}
          onCancel={() => setCategoryManagerOpen(false)}
          width={760}
        >
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCategoryCreate()}>新建一级分类</Button>
          </Space>
          <Table
            rowKey="id"
            size="small"
            dataSource={categories}
            columns={categoryColumns}
            pagination={false}
            defaultExpandAllRows
          />
        </Modal>

        <Modal
          title={editingCategory ? `编辑分类：${editingCategory.name}` : '新建分类'}
          open={categoryEditOpen}
          onOk={handleCategorySave}
          onCancel={() => setCategoryEditOpen(false)}
          okText="保存"
          destroyOnClose
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <TreeSelect
              placeholder="一级分类（留空为根分类）"
              allowClear
              treeDefaultExpandAll
              value={categoryParentId}
              treeData={parentOptions}
              fieldNames={{ label: 'name', value: 'id', children: 'children' }}
              onChange={setCategoryParentId}
              style={{ width: '100%' }}
            />
            <Input placeholder="分类名称" value={categoryName} onChange={event => setCategoryName(event.target.value)} />
            <InputNumber placeholder="排序" min={0} precision={0} value={categorySortOrder} onChange={value => setCategorySortOrder(Number(value ?? 0))} style={{ width: '100%' }} />
          </Space>
        </Modal>
      </Card>
    </div>
  )
}
