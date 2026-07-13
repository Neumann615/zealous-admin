import type { PageParam } from '@/types/common'
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
  getProductAttributeListAPI,
  productAttributeDeleteByIds,
} from '@/apis/productAttr'
import { useAppMessage } from '@/hooks/useAppMessage'

const { Option } = Select

export default () => {
  const { message } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()
  const [searchParams] = useSearchParams()

  // 从 URL 获取参数
  const cid = Number(searchParams.get('cid')) || 0
  const cname = searchParams.get('cname') || ''
  const type = Number(searchParams.get('type')) || 0

  // 列表查询参数
  const [listQuery, setListQuery] = useState<PageParam & { type: number }>({
    pageNum: 1,
    pageSize: 10,
    type,
  })
  // 列表数据
  const [list, setList] = useState<PmsProductAttribute[]>([])
  // 总条数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(true)
  // 选中的行
  const [multipleSelection, setMultipleSelection] = useState<PmsProductAttribute[]>([])

  // 获取列表数据
  const getList = async () => {
    if (!cid)
      return
    setListLoading(true)
    try {
      const response = await getProductAttributeListAPI(cid, listQuery)
      setListLoading(false)
      setList(response.data.list)
      setTotal(response.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取商品属性列表失败:', error)
    }
  }

  useEffect(() => {
    getList()
  }, [cid, listQuery])

  // 添加属性
  const handleAddAttr = () => {
    openTab({ key: `/mall/pms/addProductAttr?cid=${cid}&cname=${cname}&type=${type}`, label: '添加属性' })
  }

  // 编辑属性
  const handleUpdate = (row: PmsProductAttribute) => {
    openTab({ key: `/mall/pms/updateProductAttr?id=${row.id}&cid=${cid}&cname=${cname}&type=${type}`, label: '编辑属性' })
  }

  // 删除属性
  const handleDelete = async (row: PmsProductAttribute) => {
    try {
      await productAttributeDeleteByIds({ ids: row.id!.toString() })
      message.success('删除成功')
      getList()
    }
    catch (error) {
      console.error('删除属性失败:', error)
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (multipleSelection.length === 0) {
      message.warning('请选择要删除的属性')
      return
    }
    try {
      const ids = multipleSelection.map(item => item.id).join(',')
      await productAttributeDeleteByIds({ ids })
      message.success('删除成功')
      getList()
    }
    catch (error) {
      console.error('批量删除失败:', error)
    }
  }

  // 处理选中变化
  const handleSelectionChange = (_selectedRowKeys: React.Key[], selectedRows: PmsProductAttribute[]) => {
    setMultipleSelection(selectedRows)
  }

  // 处理分页变化
  const handleSizeChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: 1, pageSize: val }))
  }

  const handleCurrentChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: val }))
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
      title: type === 0 ? '属性名称' : '参数名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
    },
    ...(type === 0
      ? [
          {
            title: '商品类型',
            dataIndex: 'productAttributeCategoryName',
            key: 'productAttributeCategoryName',
            align: 'center',
          },
          {
            title: '属性是否可选',
            key: 'selectType',
            width: 120,
            align: 'center',
            render: (_: any, record: PmsProductAttribute) => {
              const selectTypeMap: Record<number, string> = {
                0: '唯一',
                1: '单选',
                2: '多选',
              }
              return selectTypeMap[record.selectType || 0] || '唯一'
            },
          },
          {
            title: '属性值的类型',
            key: 'inputType',
            width: 120,
            align: 'center',
            render: (_: any, record: PmsProductAttribute) => {
              return record.inputType === 1 ? '从列表选择' : '手工录入'
            },
          },
          {
            title: '属性值',
            dataIndex: 'inputList',
            key: 'inputList',
            align: 'center',
          },
        ]
      : [
          {
            title: '商品类型',
            dataIndex: 'productAttributeCategoryName',
            key: 'productAttributeCategoryName',
            align: 'center',
          },
          {
            title: '参数值',
            dataIndex: 'inputList',
            key: 'inputList',
            align: 'center',
          },
        ]),
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
          <Popconfirm title="确定删除该属性?" onConfirm={() => handleDelete(record)}>
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
        title={`${cname} - ${type === 0 ? '属性列表' : '参数列表'}`}
        extra={(
          <Space>
            <Button danger onClick={handleBatchDelete}>
              批量删除
            </Button>
            <Button type="primary" onClick={handleAddAttr} icon={<PlusOutlined />}>
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
