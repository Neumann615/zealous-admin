import type { ColumnsType } from 'antd/es/table'
import type { MetadataItem, MetadataSet } from './contracts/metadata'
import type { MetadataFieldOption } from './runtime/option-set'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useHasPermission } from '@zealous-admin/auth'
import { App, Button, Card, Col, Empty, Form, Input, InputNumber, List, Modal, Radio, Row, Select, Space, Switch, Table, Tree, TreeSelect } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { normalizeOptionSet } from './runtime/option-set'
import {
  changeOptionSetItemStatusAPI,
  changeOptionSetStatusAPI,
  createOptionSetAPI,
  createOptionSetItemAPI,
  createOptionSetItemsAPI,
  deleteOptionSetAPI,
  deleteOptionSetItemAPI,
  getOptionSetByCodeAPI,
  getOptionSetPageAPI,
  updateOptionSetAPI,
  updateOptionSetItemAPI,
} from './services/metadata'

interface SetFormValues {
  code: string
  name: string
  description?: string
  status: 0 | 1
}

interface ItemFormValues {
  parentId?: number
  code: string
  name: string
  shortName?: string
  description?: string
  sortOrder?: number
  status: 0 | 1
}

type PreviewShape = 'flat' | 'tree' | 'path'

const SET_CODE_PATTERN = /^[a-z]\w*$/i
const ITEM_CODE_PATTERN = /^[a-z0-9][\w-]*$/i

const STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

/** 批量导入行格式：编码,名称,简称（简称可空），每行一条编码项 */
function parseBatchItems(text: string): Array<{ code: string, name: string, shortName?: string, sortOrder: number, status: 1 }> {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  return lines.map((line, index) => {
    const parts = line.split(',').map(part => part.trim())
    const [code, name, shortName] = parts
    if (!code || !name)
      throw new Error(`第 ${index + 1} 行需要「编码,名称」两列`)
    if (!ITEM_CODE_PATTERN.test(code))
      throw new Error(`第 ${index + 1} 行编码「${code}」不合法（仅允许字母、数字、中划线与下划线）`)
    if (code.length > 80 || name.length > 80)
      throw new Error(`第 ${index + 1} 行编码或名称超过 80 字符`)
    return { code, name, shortName: shortName || undefined, sortOrder: index, status: 1 as const }
  })
}

function collectDescendantIds(items: MetadataItem[], rootId: number): number[] {
  const childMap = new Map<number, number[]>()
  const walk = (list: MetadataItem[]) => {
    list.forEach((item) => {
      childMap.set(item.id, (item.children ?? []).map(child => child.id))
      walk(item.children ?? [])
    })
  }
  walk(items)

  const ids: number[] = []
  const queue = [...childMap.get(rootId) ?? []]
  while (queue.length) {
    const id = queue.shift()!
    ids.push(id)
    queue.push(...childMap.get(id) ?? [])
  }
  return ids
}

interface MetadataTreeNode {
  key: string | number
  title: string
  disabled?: boolean
  children?: MetadataTreeNode[]
}

function toTreeData(options: MetadataFieldOption[]): MetadataTreeNode[] {
  return options.map(option => ({
    key: option.value,
    title: option.label,
    disabled: option.disabled,
    children: option.children ? toTreeData(option.children) : undefined,
  }))
}

export function MetadataManager() {
  const { message, modal } = App.useApp()
  const hasPermission = useHasPermission()
  const [setForm] = Form.useForm<SetFormValues>()
  const [itemForm] = Form.useForm<ItemFormValues>()

  const [listQuery, setListQuery] = useState({
    keyword: '',
    status: undefined as 0 | 1 | undefined,
    pageNum: 1,
    pageSize: 10,
  })
  const [sets, setSets] = useState<MetadataSet[]>([])
  const [total, setTotal] = useState(0)
  const [setsLoading, setSetsLoading] = useState(false)
  const [selectedSet, setSelectedSet] = useState<MetadataSet>()

  const [items, setItems] = useState<MetadataItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [collapsedItemKeys, setCollapsedItemKeys] = useState<number[]>([])

  const [setModalOpen, setSetModalOpen] = useState(false)
  const [editingSet, setEditingSet] = useState<MetadataSet>()
  const [setSaving, setSetSaving] = useState(false)

  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MetadataItem>()
  const [itemParentId, setItemParentId] = useState<number>()
  const [itemSaving, setItemSaving] = useState(false)

  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchText, setBatchText] = useState('')
  const [batchSaving, setBatchSaving] = useState(false)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewShape, setPreviewShape] = useState<PreviewShape>('flat')

  const loadSets = async (query = listQuery) => {
    setSetsLoading(true)
    try {
      const result = await getOptionSetPageAPI(query)
      setSets(result.list)
      setTotal(result.total)
      setSelectedSet((current) => {
        if (current && result.list.some(item => item.id === current.id))
          return result.list.find(item => item.id === current.id)
        return result.list[0]
      })
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '编码集加载失败')
    }
    finally {
      setSetsLoading(false)
    }
  }

  const loadItems = async (set?: MetadataSet) => {
    if (!set) {
      setItems([])
      return
    }
    setItemsLoading(true)
    try {
      const result = await getOptionSetByCodeAPI(set.code, {
        includeDisabled: true,
        signal: undefined,
      })
      setItems(result.items)
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '编码项加载失败')
    }
    finally {
      setItemsLoading(false)
    }
  }

  useEffect(() => {
    void loadSets()
  }, [listQuery])

  useEffect(() => {
    void loadItems(selectedSet)
  }, [selectedSet])

  const setColumns: ColumnsType<MetadataSet> = [
    {
      title: '编码集',
      dataIndex: 'name',
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs opacity-60">{row.code}</div>
        </div>
      ),
    },
    { title: '条目', dataIndex: 'itemCount', width: 72, align: 'center' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 84,
      align: 'center',
      render: (_, row) => (
        <Switch
          checked={row.status === 1}
          disabled={!hasPermission('metadata:set:edit')}
          onChange={checked => changeSetStatus(row, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 94,
      align: 'center',
      render: (_, row) => (
        <Space size={0}>
          {hasPermission('metadata:set:edit') && (
            <Button
              type="link"
              size="small"
              onClick={(event) => {
                event.stopPropagation()
                openSetModal(row)
              }}
            >
              编辑
            </Button>
          )}
          {hasPermission('metadata:set:delete') && (
            <Button
              type="link"
              size="small"
              danger
              onClick={(event) => {
                event.stopPropagation()
                deleteSet(row)
              }}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const itemColumns: ColumnsType<MetadataItem> = [
    { title: '名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code', width: 150 },
    { title: '简称', dataIndex: 'shortName', width: 120, render: value => value || '-' },
    { title: '排序', dataIndex: 'sortOrder', width: 80, align: 'center' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      align: 'center',
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.status === 1}
          disabled={!hasPermission('metadata:item:edit')}
          onChange={checked => changeItemStatus(row, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      align: 'center',
      render: (_, row) => (
        <Space size={0}>
          {hasPermission('metadata:item:add') && <Button type="link" size="small" onClick={() => openItemModal(undefined, row)}>新增子项</Button>}
          {hasPermission('metadata:item:edit') && <Button type="link" size="small" onClick={() => openItemModal(row)}>编辑</Button>}
          {hasPermission('metadata:item:delete') && <Button type="link" size="small" danger onClick={() => deleteItem(row)}>删除</Button>}
        </Space>
      ),
    },
  ]

  const itemOptions = useMemo(() => normalizeOptionSet(
    { set: selectedSet ?? { id: 0, code: '', name: '', status: 1 }, items },
    { shape: previewShape },
  ), [items, previewShape, selectedSet])

  const allItemIds = useMemo(() => {
    const ids: number[] = []
    const walk = (list: MetadataItem[]) => {
      list.forEach((item) => {
        ids.push(item.id)
        walk(item.children ?? [])
      })
    }
    walk(items)
    return ids
  }, [items])

  const expandedItemKeys = useMemo(
    () => allItemIds.filter(id => !collapsedItemKeys.includes(id)),
    [allItemIds, collapsedItemKeys],
  )

  const parentTreeData = useMemo(() => {
    const excludedIds = editingItem
      ? new Set([editingItem.id, ...collectDescendantIds(items, editingItem.id)])
      : new Set<number>()

    const build = (list: MetadataItem[]): any[] => list
      .filter(item => !excludedIds.has(item.id))
      .map(item => ({
        value: item.id,
        title: item.name,
        children: item.children ? build(item.children) : undefined,
      }))

    return build(items)
  }, [editingItem, items])

  const refresh = async () => {
    await loadSets()
    if (selectedSet)
      await loadItems(selectedSet)
  }

  const openSetModal = (row?: MetadataSet) => {
    setEditingSet(row)
    setForm.resetFields()
    setForm.setFieldsValue(row
      ? {
          code: row.code,
          name: row.name,
          description: row.description ?? undefined,
          status: row.status === 1 ? 1 : 0,
        }
      : { status: 1 })
    setSetModalOpen(true)
  }

  const saveSet = async () => {
    const values = await setForm.validateFields()
    setSetSaving(true)
    try {
      if (editingSet)
        await updateOptionSetAPI(editingSet.id, values)
      else
        await createOptionSetAPI(values)
      message.success(editingSet ? '编码集已更新' : '编码集已创建')
      setSetModalOpen(false)
      await loadSets()
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    }
    finally {
      setSetSaving(false)
    }
  }

  const changeSetStatus = async (row: MetadataSet, checked: boolean) => {
    try {
      await changeOptionSetStatusAPI(row.id, checked ? 1 : 0)
      message.success('状态已更新')
      await loadSets()
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '状态更新失败')
    }
  }

  const deleteSet = (row: MetadataSet) => {
    modal.confirm({
      title: '删除编码集',
      content: `将删除「${row.name}」及其全部编码项，确定继续吗？`,
      okType: 'danger',
      onOk: async () => {
        await deleteOptionSetAPI(row.id)
        message.success('编码集已删除')
        if (selectedSet?.id === row.id)
          setSelectedSet(undefined)
        await loadSets()
      },
    })
  }

  const openItemModal = (row?: MetadataItem, parent?: MetadataItem) => {
    setEditingItem(row)
    setItemParentId(row?.parentId ?? parent?.id)
    itemForm.resetFields()
    itemForm.setFieldsValue(row
      ? {
          parentId: row.parentId ?? undefined,
          code: row.code,
          name: row.name,
          shortName: row.shortName ?? undefined,
          description: row.description ?? undefined,
          sortOrder: row.sortOrder,
          status: row.status === 1 ? 1 : 0,
        }
      : { parentId: parent?.id, status: 1, sortOrder: 0 })
    setItemModalOpen(true)
  }

  const saveItem = async () => {
    if (!selectedSet)
      return
    const values = await itemForm.validateFields()
    setItemSaving(true)
    try {
      if (editingItem)
        await updateOptionSetItemAPI(editingItem.id, values)
      else
        await createOptionSetItemAPI({ ...values, setCode: selectedSet.code })
      message.success(editingItem ? '编码项已更新' : '编码项已创建')
      setItemModalOpen(false)
      await loadItems(selectedSet)
      await loadSets()
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    }
    finally {
      setItemSaving(false)
    }
  }

  const deleteItem = (row: MetadataItem) => {
    modal.confirm({
      title: '删除编码项',
      content: '将同时删除它的全部子级，确定继续吗？',
      okType: 'danger',
      onOk: async () => {
        await deleteOptionSetItemAPI(row.id)
        message.success('编码项已删除')
        await loadItems(selectedSet)
        await loadSets()
      },
    })
  }

  const changeItemStatus = async (row: MetadataItem, checked: boolean) => {
    try {
      await changeOptionSetItemStatusAPI(row.id, checked ? 1 : 0)
      message.success('状态已更新')
      await loadItems(selectedSet)
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '状态更新失败')
    }
  }

  const openBatchModal = () => {
    setBatchText('')
    setBatchModalOpen(true)
  }

  const saveBatchItems = async () => {
    if (!selectedSet)
      return
    let parsed: ReturnType<typeof parseBatchItems>
    try {
      parsed = parseBatchItems(batchText)
    }
    catch (error) {
      message.warning(error instanceof Error ? error.message : '批量导入内容不合法')
      return
    }
    if (!parsed.length) {
      message.warning('请先输入要导入的编码项')
      return
    }
    setBatchSaving(true)
    try {
      await createOptionSetItemsAPI(selectedSet.code, parsed)
      message.success(`已导入 ${parsed.length} 条编码项`)
      setBatchModalOpen(false)
      await loadItems(selectedSet)
      await loadSets()
    }
    catch (error) {
      message.error(error instanceof Error ? error.message : '批量导入失败')
    }
    finally {
      setBatchSaving(false)
    }
  }

  return (
    <Card
      title="元数据管理"
      extra={(
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openSetModal()}>新增编码集</Button>
        </Space>
      )}
    >
      <Row gutter={16}>
        <Col span={7}>
          <Space orientation="vertical" className="w-full" size={12}>
            <Space.Compact className="w-full">
              <Input
                allowClear
                placeholder="搜索编码或名称"
                value={listQuery.keyword}
                onChange={event => setListQuery(previous => ({
                  ...previous,
                  keyword: event.target.value,
                  pageNum: 1,
                }))}
              />
              <Select
                allowClear
                className="w-28"
                placeholder="状态"
                value={listQuery.status}
                options={STATUS_OPTIONS}
                onChange={status => setListQuery(previous => ({ ...previous, status, pageNum: 1 }))}
              />
            </Space.Compact>
            <Table
              rowKey="id"
              size="small"
              loading={setsLoading}
              columns={setColumns}
              dataSource={sets}
              pagination={{
                current: listQuery.pageNum,
                pageSize: listQuery.pageSize,
                total,
                size: 'small',
                showSizeChanger: false,
                onChange: (pageNum, pageSize) => setListQuery(previous => ({ ...previous, pageNum, pageSize })),
              }}
              rowClassName={row => row.id === selectedSet?.id ? 'ant-table-row-selected' : ''}
              onRow={row => ({ onClick: () => setSelectedSet(row) })}
            />
          </Space>
        </Col>

        <Col span={17}>
          {selectedSet
            ? (
                <Card
                  size="small"
                  title={`编码项：${selectedSet.name}`}
                  extra={(
                    <Space>
                      <Button disabled={selectedSet.status !== 1} onClick={() => setPreviewOpen(true)}>预览</Button>
                      {hasPermission('metadata:item:add') && <Button type="primary" disabled={selectedSet.status !== 1} onClick={() => openItemModal()}>新增编码项</Button>}
                      {hasPermission('metadata:item:add') && <Button disabled={selectedSet.status !== 1} onClick={openBatchModal}>批量导入</Button>}
                    </Space>
                  )}
                >
                  <Table
                    rowKey="id"
                    size="small"
                    loading={itemsLoading}
                    columns={itemColumns}
                    dataSource={items}
                    pagination={false}
                    expandable={{
                      expandedRowKeys: expandedItemKeys,
                      onExpandedRowsChange: (keys) => {
                        const nextKeys = keys.map(Number)
                        setCollapsedItemKeys(allItemIds.filter(id => !nextKeys.includes(id)))
                      },
                    }}
                    scroll={{ y: 480 }}
                  />
                </Card>
              )
            : (
                <Card size="small">
                  <Empty description="请选择左侧编码集" />
                </Card>
              )}
        </Col>
      </Row>

      <Modal
        title={editingSet ? '编辑编码集' : '新增编码集'}
        open={setModalOpen}
        confirmLoading={setSaving}
        onOk={() => void saveSet()}
        onCancel={() => setSetModalOpen(false)}
        destroyOnHidden
      >
        <Form form={setForm} layout="vertical">
          <Form.Item name="code" label="编码" rules={[{ required: true }, { max: 50 }, { pattern: SET_CODE_PATTERN, message: '仅允许字母、数字与下划线，且以字母开头' }]}>
            <Input disabled={!!editingSet} placeholder="如 GENDER" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }, { max: 50 }]}>
            <Input placeholder="如 性别" />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ max: 200 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Radio.Group options={STATUS_OPTIONS} optionType="button" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`批量导入编码项：${selectedSet?.name ?? ''}`}
        open={batchModalOpen}
        confirmLoading={batchSaving}
        onOk={() => void saveBatchItems()}
        onCancel={() => setBatchModalOpen(false)}
        okText="导入"
        destroyOnHidden
      >
        <div className="mb-2 text-xs opacity-70">每行一条，格式：编码,名称,简称（简称可省略），导入后自动按行序追加排序。</div>
        <Input.TextArea
          rows={10}
          value={batchText}
          onChange={event => setBatchText(event.target.value)}
          placeholder={'male,男\nfemale,女\nunknown,未知,其他'}
        />
      </Modal>

      <Modal
        title={editingItem ? '编辑编码项' : '新增编码项'}
        open={itemModalOpen}
        confirmLoading={itemSaving}
        onOk={() => void saveItem()}
        onCancel={() => setItemModalOpen(false)}
        destroyOnHidden
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="parentId" label="父级编码项">
            <TreeSelect
              allowClear
              treeDefaultExpandAll
              treeData={parentTreeData}
              value={itemParentId}
              onChange={value => setItemParentId(value)}
              placeholder="留空表示一级编码项"
            />
          </Form.Item>
          <Form.Item name="code" label="编码" rules={[{ required: true }, { max: 80 }, { pattern: ITEM_CODE_PATTERN, message: '仅允许字母、数字、中划线与下划线' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }, { max: 80 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="shortName" label="简称" rules={[{ max: 40 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} precision={0} />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ max: 200 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Radio.Group options={STATUS_OPTIONS} optionType="button" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`编码项预览：${selectedSet?.name ?? ''}`}
        open={previewOpen}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        width={620}
      >
        <Radio.Group
          className="mb-4"
          optionType="button"
          value={previewShape}
          onChange={event => setPreviewShape(event.target.value)}
          options={[
            { label: '平铺', value: 'flat' },
            { label: '层级路径', value: 'path' },
            { label: '树结构', value: 'tree' },
          ]}
        />
        {previewShape === 'tree'
          ? <Tree blockNode selectable={false} defaultExpandAll treeData={toTreeData(itemOptions)} />
          : (
              <List
                size="small"
                dataSource={itemOptions}
                renderItem={item => (
                  <List.Item>
                    <span>{item.label}</span>
                    <span className="opacity-60">{item.value}</span>
                  </List.Item>
                )}
              />
            )}
      </Modal>
    </Card>
  )
}
