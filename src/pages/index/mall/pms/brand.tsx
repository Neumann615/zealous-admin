import type { PmsBrand } from '@/types/brand'
import type { PageParam } from '@/types/common'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useControlTab } from '@zealous-admin/layout/index'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  brandDeleteByIdAPI,
  brandUpdateFactoryStatusAPI,
  brandUpdateShowStatusAPI,
  getBrandListAPI,
} from '@/apis/brand'
import { useAppMessage } from '@/hooks/useAppMessage'

const { Search } = Input
const { Option } = Select

export default function Brand() {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()

  // 品牌列表查询参数
  const [listQuery, setListQuery] = useState<PageParam>({
    keyword: '',
    pageNum: 1,
    pageSize: 10,
  })
  // 品牌列表数据
  const [list, setList] = useState<PmsBrand[]>([])
  // 表格中被选中的行
  const [multipleSelection, setMultipleSelection] = useState<PmsBrand[]>([])
  // 表格数据加载进度条
  const [listLoading, setListLoading] = useState(true)
  // 分页组件参数
  const [total, setTotal] = useState(0)

  // 获取品牌列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getBrandListAPI(listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取品牌列表失败:', error)
    }
  }

  // 组件挂载后初始化列表信息
  useEffect(() => {
    getList()
  }, [])

  // 处理品牌搜索
  const handleSearchBrand = () => {
    setListQuery(prev => ({ ...prev, pageNum: 1 }))
    getList()
  }

  // 处理添加品牌
  const handleAddBrand = () => {
    openTab({ key: '/mall/pms/addBrand', label: '添加品牌' })
  }

  // 处理编辑品牌操作
  const handleUpdateBrand = (row: PmsBrand) => {
    openTab({ key: `/mall/pms/updateBrand?id=${row.id}`, label: '编辑品牌' })
  }

  // 处理删除品牌操作
  const handleDeleteBrand = async (row: PmsBrand) => {
    try {
      await brandDeleteByIdAPI(row.id!)
      message.success('删除成功')
      getList()
    }
    catch (error) {
      console.error('删除品牌失败:', error)
    }
  }

  // 处理表格选中状态变化
  const handleSelectionChange = (_selectedRowKeys: React.Key[], selectedRows: PmsBrand[]) => {
    setMultipleSelection(selectedRows)
  }

  // 处理厂商状态变化
  const handleFactoryStatusChange = async (row: PmsBrand) => {
    try {
      await brandUpdateFactoryStatusAPI({
        ids: row.id!.toString(),
        factoryStatus: row.factoryStatus,
      })
      message.success('修改成功')
    }
    catch (error) {
      console.error('更新厂商状态失败:', error)
    }
  }

  // 处理显示状态变化
  const handleShowStatusChange = async (row: PmsBrand) => {
    try {
      await brandUpdateShowStatusAPI({
        ids: row.id!.toString(),
        showStatus: row.showStatus,
      })
      message.success('修改成功')
    }
    catch (error) {
      console.error('更新显示状态失败:', error)
    }
  }

  // 处理每页条数变化
  const handleSizeChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: 1, pageSize: val }))
    getList()
  }

  // 处理当前页变化
  const handleCurrentChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: val }))
    getList()
  }

  // 批量操作类型
  const operates = [
    { label: '显示品牌', value: 'showBrand' },
    { label: '隐藏品牌', value: 'hideBrand' },
  ]

  // 底部多选批量操作类型
  const [operateType, setOperateType] = useState<string | undefined>()

  // 处理批量操作
  const handleBatchOperate = async () => {
    if (!multipleSelection || multipleSelection.length < 1) {
      message.warning('请选择一条记录')
      return
    }
    let showStatus = 0
    if (operateType === 'showBrand') {
      showStatus = 1
    }
    else if (operateType === 'hideBrand') {
      showStatus = 0
    }
    else {
      message.warning('请选择批量操作类型')
      return
    }
    const idsArr = multipleSelection.map(item => item.id)
    try {
      await brandUpdateShowStatusAPI({
        ids: idsArr.join(','),
        showStatus,
      })
      getList()
      message.success('修改成功')
    }
    catch (error) {
      console.error('批量操作失败:', error)
    }
  }

  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      align: 'center',
    },
    {
      title: '品牌名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
    },
    {
      title: '品牌首字母',
      dataIndex: 'firstLetter',
      key: 'firstLetter',
      width: 120,
      align: 'center',
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 100,
      align: 'center',
    },
    {
      title: '品牌制造商',
      key: 'factoryStatus',
      width: 120,
      align: 'center',
      render: (_: any, record: PmsBrand) => (
        <Switch
          checked={record.factoryStatus === 1}
          onChange={checked =>
            handleFactoryStatusChange({
              ...record,
              factoryStatus: checked ? 1 : 0,
            })}
        />
      ),
    },
    {
      title: '是否显示',
      key: 'showStatus',
      width: 100,
      align: 'center',
      render: (_: any, record: PmsBrand) => (
        <Switch
          checked={record.showStatus === 1}
          onChange={checked =>
            handleShowStatusChange({ ...record, showStatus: checked ? 1 : 0 })}
        />
      ),
    },
    {
      title: '相关',
      key: 'related',
      width: 220,
      align: 'center',
      render: (_: any, record: PmsBrand) => (
        <>
          <span>商品：</span>
          <Button type="text" size="small">
            {record.productCount || 0}
          </Button>
          <span> 评价：</span>
          <Button type="text" size="small">
            {record.commentCount || 0}
          </Button>
        </>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      align: 'center',
      render: (_: any, record: PmsBrand) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleUpdateBrand(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该品牌?"
            onConfirm={() => handleDeleteBrand(record)}
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const rowSelection = {
    selectedRowKeys: multipleSelection.map(item => item.id),
    onChange: handleSelectionChange,
  }

  return (
    <div className="app-container">
      <Card
        className="filter-container"
        title="筛选搜索"
        extra={(
          <Button type="primary" onClick={handleSearchBrand}>
            查询结果
          </Button>
        )}
      >
        <Form layout="inline">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px' }}>
            <Form.Item label="输入搜索：">
              <Input
                value={listQuery.keyword}
                onChange={e =>
                  setListQuery(prev => ({ ...prev, keyword: e.target.value }))}
                placeholder="品牌名称/关键字"
                style={{ width: 200 }}
              />
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card
        className="operate-container"
        title="数据列表"
        extra={(
          <>
            <Select
              value={operateType}
              onChange={setOperateType}
              placeholder="批量操作"
              style={{ width: 150, marginRight: 15 }}
            >
              {operates.map(item => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
            <Button type="primary" onClick={handleBatchOperate}>
              确定
            </Button>
            <Button
              type="primary"
              onClick={handleAddBrand}
              icon={<PlusOutlined />}
              style={{ marginLeft: 15 }}
            >
              添加
            </Button>
          </>
        )}
      >
        <Table
          columns={columns}
          dataSource={list}
          loading={listLoading}
          bordered
          rowSelection={rowSelection}
          pagination={{
            current: listQuery.pageNum,
            pageSize: listQuery.pageSize,
            total,
            pageSizeOptions: ['5', '10', '15'],
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条记录`,
            onChange: (pagination) => {
              handleSizeChange(pagination.pageSize!)
              handleCurrentChange(pagination.current!)
            },
          }}
          rowKey="id"
        />
      </Card>
    </div>
  )
}
