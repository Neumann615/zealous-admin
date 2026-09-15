import type { FormRecord } from '@/apis/form'
import { DatabaseOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SendOutlined, StopOutlined } from '@ant-design/icons'
import { useAppMessage, useControlTab } from '@zealous-admin/layout/index'
import { Button, Card, Input, Modal, Space, Table, Tag } from 'antd'
import { createStyles } from 'antd-style'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { createFormAPI, deleteFormAPI, getFormListAPI, updateFormAPI } from '@/apis/form'

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

export default function FormListPage() {
  const { message, modal } = useAppMessage()
  const { openTab } = useControlTab()
  const { styles } = useStyles()

  const [list, setList] = useState<FormRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [pageNum, setPageNum] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const load = async (page = pageNum, kw = keyword) => {
    setLoading(true)
    try {
      const res = await getFormListAPI({ pageNum: page, pageSize: 10, keyword: kw })
      setList(res.data.list)
      setTotal(res.data.total)
      setPageNum(page)
    }
    catch { /* ignore */ }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) {
      message.warning('请输入表单名称')
      return
    }
    const res = await createFormAPI({ name: name.trim(), description })
    message.success('创建成功')
    setCreateOpen(false)
    setName('')
    setDescription('')
    openTab({ key: `/form/design?id=${res.data.id}`, label: `设计-${name.trim()}` })
  }

  const handleToggleStatus = async (row: FormRecord) => {
    const next = row.status === 1 ? 0 : 1
    try {
      await updateFormAPI({ id: row.id, status: next })
      message.success(next === 1 ? '已发布' : '已下线')
      load()
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
  }

  const handleDelete = (row: FormRecord) => {
    modal.confirm({
      title: '提示',
      content: `确认删除表单「${row.name}」?`,
      onOk: async () => {
        await deleteFormAPI(row.id)
        message.success('删除成功!')
        load()
      },
    })
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' as const },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '数据量', dataIndex: 'dataCount', key: 'dataCount', width: 90, align: 'center' as const },
    { title: '版本', dataIndex: 'version', key: 'version', width: 70, align: 'center' as const },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center' as const,
      render: (s: number) => (s === 1 ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 170,
      align: 'center' as const,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : 'N/A'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 340,
      align: 'center' as const,
      render: (_: any, row: FormRecord) => (
        <Space size="small">
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openTab({ key: `/form/design?id=${row.id}`, label: `设计-${row.name}` })}>设计</Button>
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => openTab({ key: `/form/render?id=${row.id}`, label: `渲染-${row.name}` })}>渲染</Button>
          <Button size="small" type="link" icon={<DatabaseOutlined />} onClick={() => openTab({ key: `/form/data?id=${row.id}`, label: `数据-${row.name}` })}>数据</Button>
          <Button size="small" type="link" icon={row.status === 1 ? <StopOutlined /> : <SendOutlined />} onClick={() => handleToggleStatus(row)}>
            {row.status === 1 ? '下线' : '发布'}
          </Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card>
        <div className={styles.toolbar}>
          <Input.Search
            placeholder="搜索名称"
            allowClear
            onSearch={(v) => {
              setKeyword(v)
              load(1, v)
            }}
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建表单</Button>
        </div>
        <div className={styles.tableWrapper}>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={list}
            columns={columns}
            pagination={{
              current: pageNum,
              total,
              pageSize: 10,
              showTotal: t => `共 ${t} 条记录`,
              onChange: p => load(p),
            }}
          />
        </div>

        <Modal title="新建表单" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)} okText="创建" destroyOnClose>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input placeholder="表单名称" value={name} onChange={e => setName(e.target.value)} />
            <Input.TextArea placeholder="描述（可选）" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </Space>
        </Modal>
      </Card>
    </div>
  )
}
