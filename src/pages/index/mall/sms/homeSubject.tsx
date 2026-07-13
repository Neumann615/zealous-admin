import type { HomeSubjectQueryParam, SmsHomeRecommendSubject } from '@/types/homeSubject'
import type { CmsSubject } from '@/types/subject'
import { SearchOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import {
  getHomeRecommendSubjectListAPI,
  homeRecommendSubjectCreateAPI,
  homeRecommendSubjectDeleteByIdsAPI,
  homeRecommendSubjectUpdateRecommendStatusAPI,
  homeRecommendSubjectUpdateSortAPI,
} from '@/apis/homeSubject'
import { getSubjectListAPI } from '@/apis/subject'
import { useAppMessage } from '@/hooks/useAppMessage'

export default function Subject() {
  const { message, modal } = useAppMessage()
  // 列表查询参数
  const [listQuery, setListQuery] = useState<HomeSubjectQueryParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 专题推荐列表数据
  const [list, setList] = useState<SmsHomeRecommendSubject[]>([])
  // 总条数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(false)

  // 推荐选项
  const recommendOptions = [
    { label: '未推荐', value: 0 },
    { label: '推荐中', value: 1 },
  ]

  // 批量操作选项
  const operates = [
    { label: '设为推荐', value: 0 },
    { label: '取消推荐', value: 1 },
    { label: '删除', value: 2 },
  ]
  const [operateType, setOperateType] = useState<number>()

  // 表格中被选中的行
  const [selectedRows, setSelectedRows] = useState<SmsHomeRecommendSubject[]>([])

  // 选择专题对话框
  const [selectDialogVisible, setSelectDialogVisible] = useState(false)
  const [dialogData, setDialogData] = useState({
    list: [] as CmsSubject[],
    total: 0,
    multipleSelection: [] as CmsSubject[],
    listQuery: {
      keyword: '',
      pageNum: 1,
      pageSize: 5,
    },
  })

  // 设置排序对话框
  const [sortDialogVisible, setSortDialogVisible] = useState(false)
  const [sortDialogData, setSortDialogData] = useState({ sort: 0, id: 0 })

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getHomeRecommendSubjectListAPI(listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取列表失败:', error)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    getList()
  }, [listQuery])

  // 获取对话框列表
  const getDialogList = async () => {
    try {
      const res = await getSubjectListAPI(dialogData.listQuery)
      setDialogData(prev => ({
        ...prev,
        list: res.data.list,
        total: res.data.total,
      }))
    }
    catch (error) {
      console.error('获取对话框列表失败:', error)
    }
  }

  // 重置搜索
  const handleResetSearch = () => {
    setListQuery({ pageNum: 1, pageSize: 10 })
  }

  // 搜索列表
  const handleSearchList = () => {
    setListQuery({ ...listQuery, pageNum: 1 })
  }

  // 处理表格选中变化
  const handleSelectionChange = (selectedRowKeys: React.Key[], selectedRows: SmsHomeRecommendSubject[]) => {
    setSelectedRows(selectedRows)
  }

  // 处理推荐状态变化
  const handleRecommendStatusChange = async (row: SmsHomeRecommendSubject, checked: boolean) => {
    modal.confirm({
      title: '提示',
      content: '是否要修改推荐状态?',
      onOk: async () => {
        try {
          await homeRecommendSubjectUpdateRecommendStatusAPI({
            ids: String(row.id),
            recommendStatus: checked ? 1 : 0,
          })
          message.success('修改成功!')
          getList()
        }
        catch (error) {
          console.error('修改失败:', error)
        }
      },
    })
  }

  // 处理删除
  const handleDelete = (row: SmsHomeRecommendSubject) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该推荐?',
      onOk: async () => {
        try {
          await homeRecommendSubjectDeleteByIdsAPI({ ids: String(row.id) })
          message.success('删除成功!')
          getList()
        }
        catch (error) {
          console.error('删除操作失败:', error)
        }
      },
    })
  }

  // 处理批量操作
  const handleBatchOperate = async () => {
    if (selectedRows.length < 1) {
      message.warning('请选择一条记录')
      return
    }
    const ids = selectedRows.map(item => String(item.id))
    if (operateType === 0) {
      try {
        await homeRecommendSubjectUpdateRecommendStatusAPI({
          ids: ids.join(','),
          recommendStatus: 1,
        })
        message.success('修改成功!')
        getList()
      }
      catch (error) {
        console.error('修改失败:', error)
      }
    }
    else if (operateType === 1) {
      try {
        await homeRecommendSubjectUpdateRecommendStatusAPI({
          ids: ids.join(','),
          recommendStatus: 0,
        })
        message.success('修改成功!')
        getList()
      }
      catch (error) {
        console.error('修改失败:', error)
      }
    }
    else if (operateType === 2) {
      try {
        await homeRecommendSubjectDeleteByIdsAPI({ ids: ids.join(',') })
        message.success('删除成功!')
        getList()
      }
      catch (error) {
        console.error('删除操作失败:', error)
      }
    }
    else {
      message.warning('请选择批量操作类型')
    }
  }

  // 处理选择专题
  const handleSelectSubject = () => {
    setSelectDialogVisible(true)
    setDialogData(prev => ({
      ...prev,
      listQuery: { ...prev.listQuery, keyword: '' },
    }))
    getDialogList()
  }

  // 处理对话框搜索
  const handleSelectSearch = () => {
    getDialogList()
  }

  // 对话框选中变化
  const handleDialogSelectionChange = (selectedRowKeys: React.Key[], selectedRows: CmsSubject[]) => {
    setDialogData(prev => ({
      ...prev,
      multipleSelection: selectedRows,
    }))
  }

  // 确认选择对话框
  const handleSelectDialogConfirm = async () => {
    if (dialogData.multipleSelection.length < 1) {
      message.warning('请选择一条记录')
      return
    }
    modal.confirm({
      title: '提示',
      content: '是否要进行添加操作?',
      onOk: async () => {
        try {
          const selectSubjects = dialogData.multipleSelection.map(item => ({
            subjectId: item.id!,
            subjectName: item.title!,
          }))
          await homeRecommendSubjectCreateAPI(selectSubjects)
          setSelectDialogVisible(false)
          setDialogData(prev => ({ ...prev, multipleSelection: [] }))
          getList()
          message.success('添加成功!')
        }
        catch (error) {
          console.error('确认操作失败:', error)
        }
      },
    })
  }

  // 编辑排序
  const handleEditSort = (row: SmsHomeRecommendSubject) => {
    setSortDialogVisible(true)
    setSortDialogData({ sort: row.sort || 0, id: row.id! })
  }

  // 更新排序
  const handleUpdateSort = async () => {
    if (!sortDialogData.id)
      return
    modal.confirm({
      title: '提示',
      content: '是否要修改排序?',
      onOk: async () => {
        try {
          await homeRecommendSubjectUpdateSortAPI(sortDialogData)
          setSortDialogVisible(false)
          getList()
          message.success('修改成功!')
        }
        catch (error) {
          console.error('修改排序失败:', error)
        }
      },
    })
  }

  // 格式化推荐状态
  const formatRecommendStatus = (status: number) => {
    return status === 1 ? '推荐中' : '未推荐'
  }

  // 格式化日期时间
  const formatDateTime = (date: string) => {
    return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
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
      width: 120,
      align: 'center' as const,
    },
    {
      title: '专题名称',
      dataIndex: 'subjectName',
      key: 'subjectName',
      align: 'center' as const,
    },
    {
      title: '是否推荐',
      dataIndex: 'recommendStatus',
      key: 'recommendStatus',
      width: 200,
      align: 'center' as const,
      render: (recommendStatus: number, row: SmsHomeRecommendSubject) => (
        <Switch
          checked={recommendStatus === 1}
          onChange={checked => handleRecommendStatusChange(row, checked)}
          checkedChildren="推荐"
          unCheckedChildren="未推荐"
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 160,
      align: 'center' as const,
    },
    {
      title: '状态',
      key: 'status',
      width: 160,
      align: 'center' as const,
      render: (_: any, row: SmsHomeRecommendSubject) => formatRecommendStatus(row.recommendStatus!),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      align: 'center' as const,
      render: (_: any, row: SmsHomeRecommendSubject) => (
        <Space>
          <Button type="link" onClick={() => handleEditSort(row)}>
            设置排序
          </Button>
          <Button type="link" danger onClick={() => handleDelete(row)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  // 专题表格列
  const subjectColumns = [
    {
      title: '专题名称',
      dataIndex: 'title',
      key: 'title',
      align: 'center' as const,
    },
    {
      title: '所属分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 160,
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
            <Form.Item label="专题名称：">
              <Input
                value={listQuery.subjectName}
                onChange={e => setListQuery({ ...listQuery, subjectName: e.target.value })}
                placeholder="专题名称"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="推荐状态：">
              <Select
                value={listQuery.recommendStatus}
                onChange={val => setListQuery({ ...listQuery, recommendStatus: val })}
                placeholder="全部"
                allowClear
                style={{ width: 150 }}
              >
                {recommendOptions.map(item => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card
        title="数据列表"
        extra={(
          <Button type="primary" onClick={handleSelectSubject}>
            选择专题
          </Button>
        )}
      >
        <Table
          columns={columns}
          dataSource={list}
          loading={listLoading}
          bordered
          rowSelection={{
            onChange: handleSelectionChange,
          }}
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

      {/* 批量操作 */}
      <Card style={{ marginTop: 20 }}>
        <Space>
          <Select
            value={operateType}
            onChange={setOperateType}
            placeholder="批量操作"
            style={{ width: 150 }}
          >
            {operates.map(item => (
              <Select.Option key={item.value} value={item.value}>
                {item.label}
              </Select.Option>
            ))}
          </Select>
          <Button type="primary" onClick={handleBatchOperate}>
            确定
          </Button>
        </Space>
      </Card>

      {/* 选择专题对话框 */}
      <Modal
        title="选择专题"
        open={selectDialogVisible}
        onCancel={() => setSelectDialogVisible(false)}
        onOk={handleSelectDialogConfirm}
        width={700}
      >
        <div style={{ marginBottom: 20 }}>
          <Input
            value={dialogData.listQuery.keyword}
            onChange={e => setDialogData(prev => ({
              ...prev,
              listQuery: { ...prev.listQuery, keyword: e.target.value },
            }))}
            placeholder="专题名称搜索"
            style={{ width: 250 }}
            addonAfter={<Button type="text" icon={<SearchOutlined />} onClick={handleSelectSearch} />}
          />
        </div>
        <Table
          columns={subjectColumns}
          dataSource={dialogData.list}
          rowSelection={{
            onChange: handleDialogSelectionChange,
          }}
          pagination={{
            current: dialogData.listQuery.pageNum,
            pageSize: dialogData.listQuery.pageSize,
            total: dialogData.total,
            pageSizeOptions: ['5', '10', '15'],
            showSizeChanger: true,
            showTotal: total => `共 ${total} 条记录`,
          }}
          onChange={(pagination) => {
            setDialogData(prev => ({
              ...prev,
              listQuery: {
                ...prev.listQuery,
                pageNum: pagination.current || 1,
                pageSize: pagination.pageSize || 5,
              },
            }))
            getDialogList()
          }}
          rowKey="id"
        />
      </Modal>

      {/* 设置排序对话框 */}
      <Modal
        title="设置排序"
        open={sortDialogVisible}
        onCancel={() => setSortDialogVisible(false)}
        onOk={handleUpdateSort}
        width={400}
      >
        <Form layout="vertical">
          <Form.Item label="排序：">
            <InputNumber
              value={sortDialogData.sort}
              onChange={val => setSortDialogData(prev => ({ ...prev, sort: val || 0 }))}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
