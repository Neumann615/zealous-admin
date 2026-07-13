import type { PmsProductAttribute } from '@/types/productAttr'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Popconfirm,
  Select,
  Space,
  Table,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useControlTab } from '@zealous-admin/layout/index'
import {
  productAttributeDeleteByIds,
} from '@/apis/productAttr'
import { getProductAttributeCategoryListAPI } from '@/apis/productAttrCate'
import { useAppMessage } from '@/hooks/useAppMessage'

const { Option } = Select

export default function ProductAttr() {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()
  const [searchParams] = useSearchParams()

  // 属性分类ID
  const cid = Number(searchParams.get('cid'))
  // 属性类型
  const type = Number(searchParams.get('type'))
  // 列表查询数据
  const [listQuery, setListQuery] = useState({
    pageNum: 1,
    pageSize: 10,
    type,
  })
  const [list, setList] = useState<PmsProductAttribute[]>([])
  // 列表数据
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(true)

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const response = await getProductAttributeCategoryListAPI(listQuery)
      setListLoading(false)
      setList(response.data.list)
      setTotal(response.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取商品属性列表失败:', error)
    }
  }

  // 组件挂载后执行，监听 cid 和 listQuery 变化
  useEffect(() => {
    getList()
  }, [cid, listQuery])

  // 当前批量操作类型
  const [operateType, setOperateType] = useState<string | undefined>()
  // 批量操作选中条目
  const [multipleSelection, setMultipleSelection] = useState<PmsProductAttribute[]>([])
  // 批量操作类型集合
  const operates = [
    { label: '删除', value: 'deleteProductAttr' },
  ]

  // 添加产品属性
  const addProductAttr = () => {
    openTab({ key: `/mall/pms/addProductAttr?cid=${cid}&type=${type}`, label: '添加属性' })
  }

  // 处理表格选中状态变化
  const handleSelectionChange = (_selectedRowKeys: React.Key[], selectedRows: PmsProductAttribute[]) => {
    setMultipleSelection(selectedRows)
  }

  // 处理批量操作
  const handleBatchOperate = async () => {
    if (multipleSelection.length < 1) {
      message.warning('请选择一条记录')
      return
    }
    if (operateType !== 'deleteProductAttr') {
      message.warning('请选择批量操作类型')
      return
    }
    await handleDeleteProductAttr(multipleSelection.map(item => item.id!))
  }

  // 处理每页条数变化
  const handleSizeChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: 1, pageSize: val }))
  }

  // 处理当前页变化
  const handleCurrentChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: val }))
  }

  // 处理更新操作
  const handleUpdate = (row: PmsProductAttribute) => {
    openTab({ key: `/mall/pms/updateProductAttr?id=${row.id}`, label: '编辑属性' })
  }

  // 处理删除产品属性
  const handleDeleteProductAttr = async (ids: number[]) => {
    try {
      await productAttributeDeleteByIds({ ids: ids.join(',') })
      message.success('删除成功')
      getList()
    }
    catch (error) {
      console.error('删除属性失败:', error)
    }
  }

  // 处理删除操作
  const handleDelete = async (row: PmsProductAttribute) => {
    await handleDeleteProductAttr([row.id!])
  }

  // 属性值的录入方式
  const inputTypeFilter = (value: number) => {
    return value === 1 ? '从列表中选取' : '手工录入'
  }

  // 属性是否可选
  const selectTypeFilter = (value: number) => {
    if (value === 1)
      return '单选'
    else if (value === 2)
      return '多选'
    else return '唯一'
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
      title: '属性名称',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      align: 'center',
    },
    {
      title: '商品类型',
      key: 'cname',
      width: 140,
      align: 'center',
      render: () => searchParams.get('cname') || '-',
    },
    {
      title: '属性是否可选',
      key: 'selectType',
      width: 120,
      align: 'center',
      render: (_: any, record: PmsProductAttribute) =>
        selectTypeFilter(record.selectType || 0),
    },
    {
      title: '属性值的录入方式',
      key: 'inputType',
      width: 150,
      align: 'center',
      render: (_: any, record: PmsProductAttribute) =>
        inputTypeFilter(record.inputType || 0),
    },
    {
      title: '可选值列表',
      dataIndex: 'inputList',
      key: 'inputList',
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
      title: '操作',
      key: 'actions',
      width: 160,
      align: 'center',
      render: (_: any, record: PmsProductAttribute) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleUpdate(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该属性?"
            onConfirm={() => handleDelete(record)}
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
        className="operate-container"
        title="数据列表"
        extra={(
          <>
            <Select
              value={operateType}
              onChange={setOperateType}
              placeholder="批量操作"
              style={{ width: 120, marginRight: 15 }}
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
            <Button type="primary" onClick={addProductAttr} icon={<PlusOutlined />} style={{ marginLeft: 15 }}>
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
