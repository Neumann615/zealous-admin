import type { PmsProductCategory } from '@/types/productCate'
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Popconfirm,
  Space,
  Switch,
  Table,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useControlTab } from '@zealous-admin/layout/index'
import {
  getProductCategoryListAPI,
  productCategoryDeleteByIdAPI,
  productCategoryUpdateNavStatusAPI,
  productCategoryUpdateShowStatusAPI,
} from '@/apis/productCate'
import { useAppMessage } from '@/hooks/useAppMessage'

export default function ProductCate() {
  const { message } = useAppMessage()
  const { openTab } = useControlTab()

  // 当前列表页父分类ID
  const [parentId, setParentId] = useState(0)
  // 列表查询参数
  const [listQuery, setListQuery] = useState({
    pageNum: 1,
    pageSize: 10,
  })
  // 列表数据
  const [list, setList] = useState<PmsProductCategory[]>([])
  // 总条数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(true)

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getProductCategoryListAPI(parentId, listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取商品分类列表失败:', error)
    }
  }

  // 监听 parentId 和 listQuery 变化自动刷新
  useEffect(() => {
    getList()
  }, [parentId, listQuery])

  // 添加商品分类
  const handleAddProductCate = () => {
    openTab({ key: '/mall/pms/addProductCate', label: '添加商品分类' })
  }

  // 处理分页大小变化
  const handleSizeChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: 1, pageSize: val }))
  }

  // 处理当前页变化
  const handleCurrentChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: val }))
  }

  // 处理导航状态变化
  const handleNavStatusChange = async (row: PmsProductCategory) => {
    try {
      await productCategoryUpdateNavStatusAPI({
        ids: [row.id!].join(','),
        navStatus: row.navStatus,
      })
      message.success('修改成功', 1)
    }
    catch (error) {
      console.error('更新导航状态失败:', error)
    }
  }

  // 处理显示状态变化
  const handleShowStatusChange = async (row: PmsProductCategory) => {
    try {
      await productCategoryUpdateShowStatusAPI({
        ids: [row.id!].join(','),
        showStatus: row.showStatus,
      })
      message.success('修改成功', 1)
    }
    catch (error) {
      console.error('更新显示状态失败:', error)
    }
  }

  // 查看下级分类
  const handleShowNextLevel = (row: PmsProductCategory) => {
    setParentId(row.id!)
    setListQuery(prev => ({ ...prev, pageNum: 1 }))
  }

  // 返回上级
  const handleBackToParent = () => {
    setParentId(0)
    setListQuery({ pageNum: 1, pageSize: 10 })
  }

  // 更新分类
  const handleUpdate = (row: PmsProductCategory) => {
    openTab({ key: `/mall/pms/updateProductCate?id=${row.id}`, label: '编辑商品分类' })
  }

  // 删除分类
  const handleDelete = async (row: PmsProductCategory) => {
    try {
      await productCategoryDeleteByIdAPI(row.id!)
      message.success('删除成功', 1)
      getList()
    }
    catch (error) {
      console.error('删除分类失败:', error)
    }
  }

  // 分类级别过滤器
  const levelFilter = (value: number) => {
    if (value === 0)
      return '一级'
    else if (value === 1)
      return '二级'
    return ''
  }

  // 禁用下级按钮
  const disableNextLevel = (value: number) => {
    return value !== 0
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
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
    },
    {
      title: '级别',
      key: 'level',
      width: 100,
      align: 'center',
      render: (_: any, record: PmsProductCategory) => levelFilter(record.level || 0),
    },
    {
      title: '商品数量',
      dataIndex: 'productCount',
      key: 'productCount',
      width: 100,
      align: 'center',
    },
    {
      title: '数量单位',
      dataIndex: 'productUnit',
      key: 'productUnit',
      width: 100,
      align: 'center',
    },
    {
      title: '导航栏',
      key: 'navStatus',
      width: 100,
      align: 'center',
      render: (_: any, record: PmsProductCategory) => (
        <Switch
          checked={record.navStatus === 1}
          onChange={checked =>
            handleNavStatusChange({ ...record, navStatus: checked ? 1 : 0 })}
        />
      ),
    },
    {
      title: '是否显示',
      key: 'showStatus',
      width: 100,
      align: 'center',
      render: (_: any, record: PmsProductCategory) => (
        <Switch
          checked={record.showStatus === 1}
          onChange={checked =>
            handleShowStatusChange({ ...record, showStatus: checked ? 1 : 0 })}
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 100,
      align: 'center',
    },
    {
      title: '设置',
      key: 'settings',
      width: 200,
      align: 'center',
      render: (_: any, record: PmsProductCategory) => (
        <Space>
          <Button
            size="small"
            disabled={disableNextLevel(record.level || 0)}
            onClick={() => handleShowNextLevel(record)}
            icon={<DownOutlined />}
          >
            查看下级
          </Button>
          <Button size="small" icon={<ReloadOutlined />}>
            转移商品
          </Button>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      align: 'center',
      render: (_: any, record: PmsProductCategory) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleUpdate(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该分类?"
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

  return (
    <div className="app-container">
      <Card
        className="operate-container"
        title="数据列表"
        extra={(
          <Space>
            {parentId > 0 && (
              <Button onClick={handleBackToParent}>返回上级</Button>
            )}
            <Button type="primary" onClick={handleAddProductCate} icon={<PlusOutlined />}>
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
