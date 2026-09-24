import type { FormSchema } from '@zealous-admin/form-designer/index'
import type { FormDataRecord, FormRecord, FormVersionRecord } from '@/apis/form'
import { DeleteOutlined, DownloadOutlined, EyeOutlined, ReloadOutlined, RollbackOutlined, StopOutlined } from '@ant-design/icons'
import { useHasPermission } from '@zealous-admin/auth'
import { FormRenderer, parseSchema } from '@zealous-admin/form-designer/index'
import { useAppMessage } from '@zealous-admin/layout/index'
import { createDownloadUrl } from '@zealous-admin/utils/index'
import { Button, Card, Drawer, Empty, Input, Select, Space, Spin, Table, Tag, Tooltip } from 'antd'
import { createStyles } from 'antd-style'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { deleteFormDataAPI, getFormDataListAPI, getFormDetailAPI, renderFormAPI, updateFormDataStatusAPI } from '@/apis/form'

const PAGE_SIZE = 10
const EXPORT_PAGE_SIZE = 100
const CELL_MAX = 40

interface Row extends FormDataRecord {
  /** data 字段解析后的填写值，脏数据为 null */
  values: Record<string, any> | null
}

const useStyles = createStyles(({ token, css }) => ({
  toolbar: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${token.marginMD}px;
    flex-wrap: wrap;
    gap: ${token.marginSM}px;
  `,
  desc: css`
    margin-bottom: ${token.marginSM}px;
    color: ${token.colorTextTertiary};
  `,
  tableWrapper: css`
    .ant-table-thead > tr > th {
      background: ${token.colorFillAlter};
      font-weight: 600;
    }
  `,
  raw: css`
    margin: 0;
    padding: ${token.paddingSM}px;
    background: ${token.colorFillTertiary};
    border-radius: ${token.borderRadius}px;
    max-height: 420px;
    overflow: auto;
  `,
}))

/** 单元格取值转文本：对象/数组退化为 JSON */
function stringifyCell(value: any): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

/** CSV 单元格转义，并阻止常见公式注入 */
function csvCell(value: any): string {
  let text = stringifyCell(value)
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`
  }
  return `"${text.replace(/"/g, '""')}"`
}

function versionStatusName(status: number) {
  if (status === 1) {
    return '已发布'
  }
  return status === 2 ? '已退役' : '草稿'
}

export default function FormDataPage() {
  const { message, modal } = useAppMessage()
  const hasPermission = useHasPermission()
  const { styles } = useStyles()
  const [searchParams] = useSearchParams()
  const formId = Number(searchParams.get('id'))

  const [form, setForm] = useState<FormRecord | null>(null)
  const [versions, setVersions] = useState<FormVersionRecord[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<number>()
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [list, setList] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pageNum, setPageNum] = useState(1)
  const [submitter, setSubmitter] = useState('')
  const [detail, setDetail] = useState<Row | null>(null)
  const [detailSchema, setDetailSchema] = useState<FormSchema | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const toRows = (records: FormDataRecord[]): Row[] => records.map((item) => {
    let values: Record<string, any> | null = null
    try {
      values = JSON.parse(item.data)
    }
    catch { /* 脏数据保持 null，展示时退化为原始 JSON */ }
    return { ...item, values }
  })

  const load = async (page = pageNum, kw = submitter, versionId = selectedVersionId) => {
    if (!formId) {
      return
    }
    setLoading(true)
    try {
      const res = await getFormDataListAPI({ formId, versionId, pageNum: page, pageSize: PAGE_SIZE, submitter: kw })
      setList(toRows(res.data.list))
      setTotal(res.data.total)
      setPageNum(page)
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
    finally {
      setLoading(false)
    }
  }

  // 数据页默认使用当前发布版；切换版本后再按对应 Schema 生成动态列
  useEffect(() => {
    if (!formId) {
      return
    }
    getFormDetailAPI(formId)
      .then((res) => {
        setForm(res.data)
        setVersions(res.data.versions ?? [])
        setSelectedVersionId(res.data.currentVersionId ?? res.data.versionId)
      })
      .catch(() => { /* 失败提示由 http 拦截器统一弹出 */ })
  }, [formId])

  useEffect(() => {
    if (selectedVersionId === undefined)
      return
    load(1, '', selectedVersionId)
    getFormDetailAPI(formId, selectedVersionId)
      .then((res) => {
        try {
          setSchema(parseSchema(res.data.schema))
        }
        catch (e: any) {
          setSchema(null)
          message.warning(`表单结构解析失败，已退化为原始数据展示（${e?.message}）`)
        }
      })
      .catch(() => setSchema(null))
  }, [formId, selectedVersionId])

  const fields = useMemo(
    () => (schema?.children ?? [])
      .filter(node => !!node.field)
      .map(node => ({ field: node.field as string, label: node.label || (node.field as string) })),
    [schema],
  )

  const fieldColumns = useMemo(() => fields.map(item => ({
    title: item.label,
    dataIndex: ['values', item.field],
    key: item.field,
    ellipsis: true,
    render: (value: any) => {
      const text = stringifyCell(value)
      if (!text) {
        return <span style={{ opacity: 0.45 }}>-</span>
      }
      return text.length > CELL_MAX
        ? <Tooltip title={text}>{`${text.slice(0, CELL_MAX)}…`}</Tooltip>
        : text
    },
  })), [fields])

  const handleToggleStatus = async (row: Row) => {
    const next = row.status === 1 ? 0 : 1
    try {
      await updateFormDataStatusAPI({ id: row.id, status: next })
      message.success(next === 1 ? '已恢复' : '已作废')
      load()
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
  }

  const handleDelete = (row: Row) => {
    modal.confirm({
      title: '提示',
      content: `确认删除数据 #${row.id}?`,
      onOk: async () => {
        await deleteFormDataAPI(row.id)
        message.success('删除成功!')
        load()
      },
    })
  }

  const openDetail = async (row: Row) => {
    setDetail(row)
    setDetailSchema(null)
    setDetailLoading(true)
    try {
      const res = await renderFormAPI({ formId, dataId: row.id })
      setDetailSchema(parseSchema(res.data.renderContract.schema))
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
    finally {
      setDetailLoading(false)
    }
  }

  // 按当前筛选条件导出全量 CSV；接口单页上限 100，需分页聚合
  const handleExport = async () => {
    setExporting(true)
    try {
      const firstRes = await getFormDataListAPI({
        formId,
        versionId: selectedVersionId,
        pageNum: 1,
        pageSize: EXPORT_PAGE_SIZE,
        submitter,
      })
      const rows = toRows(firstRes.data.list)
      const pageCount = Math.ceil(firstRes.data.total / EXPORT_PAGE_SIZE)
      for (let page = 2; page <= pageCount; page += 1) {
        const res = await getFormDataListAPI({
          formId,
          versionId: selectedVersionId,
          pageNum: page,
          pageSize: EXPORT_PAGE_SIZE,
          submitter,
        })
        rows.push(...toRows(res.data.list))
      }
      if (!rows.length) {
        message.warning('暂无数据可导出')
        return
      }
      const header = fields.length
        ? [...fields.map(item => item.label), '提交人', '提交时间']
        : ['原始数据', '提交人', '提交时间']
      const lines = rows.map((row) => {
        const cells = fields.length
          ? [...fields.map(item => stringifyCell(row.values?.[item.field])), row.submitter, row.createTime]
          : [stringifyCell(row.values ?? row.data), row.submitter, row.createTime]
        return cells.map(csvCell).join(',')
      })
      const csv = `\uFEFF${[header.map(csvCell).join(','), ...lines].join('\r\n')}`
      const selectedVersion = versions.find(item => item.id === selectedVersionId)
      const versionLabel = selectedVersion ? `-v${selectedVersion.schemaVersion}` : ''
      const filename = `${form?.name || 'form'}${versionLabel}-数据-${dayjs().format('YYYYMMDDHHmm')}.csv`
      createDownloadUrl(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename)
      message.success(`已导出 ${rows.length} 条`)
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
    finally {
      setExporting(false)
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' as const },
    ...(fieldColumns.length
      ? fieldColumns
      : [{
          title: '原始数据',
          key: 'raw',
          ellipsis: true,
          render: (_: any, row: Row) => {
            const text = stringifyCell(row.values ?? row.data)
            return text.length > CELL_MAX
              ? <Tooltip title={text}>{`${text.slice(0, CELL_MAX)}…`}</Tooltip>
              : text
          },
        }]),
    {
      title: '提交人',
      dataIndex: 'submitter',
      key: 'submitter',
      width: 120,
      align: 'center' as const,
      render: (v: string) => v || '-',
    },
    { title: '表单版本', dataIndex: 'formVersion', key: 'formVersion', width: 90, align: 'center' as const },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center' as const,
      render: (s: number) => (s === 1 ? <Tag color="green">有效</Tag> : <Tag>已作废</Tag>),
    },
    {
      title: '提交时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 170,
      align: 'center' as const,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : 'N/A'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      align: 'center' as const,
      render: (_: any, row: Row) => (
        <Space size="small">
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => openDetail(row)}>查看</Button>
          {hasPermission('form:data:edit') && (
            <Button
              size="small"
              type="link"
              icon={row.status === 1 ? <StopOutlined /> : <RollbackOutlined />}
              onClick={() => handleToggleStatus(row)}
            >
              {row.status === 1 ? '作废' : '恢复'}
            </Button>
          )}
          {hasPermission('form:data:delete') && <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)}>删除</Button>}
        </Space>
      ),
    },
  ]

  if (!formId) {
    return <Empty description="缺少表单 id" />
  }

  return (
    <div className="app-container">
      <Card title={form ? `表单数据：${form.name}` : '表单数据'}>
        {form?.description && <div className={styles.desc}>{form.description}</div>}
        <div className={styles.toolbar}>
          <Space wrap>
            <Select
              value={selectedVersionId}
              placeholder="选择表单版本"
              style={{ minWidth: 180 }}
              options={versions.map(item => ({
                value: item.id,
                label: `v${item.schemaVersion}（${versionStatusName(item.status)}）`,
              }))}
              onChange={(value) => {
                setSubmitter('')
                setSelectedVersionId(value)
              }}
            />
            <Input.Search
              placeholder="搜索提交人"
              allowClear
              onSearch={(v) => {
                setSubmitter(v)
                load(1, v)
              }}
              style={{ width: 220 }}
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
            <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>导出 CSV</Button>
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
              pageSize: PAGE_SIZE,
              showTotal: t => `共 ${t} 条记录`,
              onChange: p => load(p),
            }}
          />
        </div>
      </Card>

      <Drawer
        title={detail ? `提交详情 #${detail.id}` : '提交详情'}
        width={720}
        open={!!detail}
        onClose={() => {
          setDetail(null)
          setDetailSchema(null)
        }}
      >
        {detailLoading && <Spin />}
        {detail && !detailLoading && (
          <>
            <Space style={{ marginBottom: 16 }} wrap>
              <Tag>
                提交人：
                {detail.submitter || '-'}
              </Tag>
              <Tag>
                表单版本：v
                {detail.formVersion}
              </Tag>
              <Tag>
                提交时间：
                {detail.createTime}
              </Tag>
              {detail.status === 0 && <Tag color="red">已作废</Tag>}
            </Space>
            {detailSchema
              ? (
                  <FormRenderer
                    key={detail.id}
                    schema={{ ...detailSchema, form: { ...detailSchema.form, disabled: true } }}
                    initialValues={detail.values || {}}
                    showActions={false}
                  />
                )
              : <pre className={styles.raw}>{JSON.stringify(detail.values ?? detail.data, null, 2)}</pre>}
          </>
        )}
      </Drawer>
    </div>
  )
}
