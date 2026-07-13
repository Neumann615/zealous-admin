import type { ResourceQueryParam, UmsResource } from '@/types/resource'
import { PlusOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useControlTab } from '@zealous-admin/layout/index'
import { useAppMessage } from '@/hooks/useAppMessage'
import {
  getResourceListAPI,
  resourceCreateAPI,
  resourceDeleteByIdAPI,
  resourceUpdateAPI,
} from '@/apis/resource'
import { resourceCategoryListAllAPI } from '@/apis/resourceCategory'

const { TextArea } = Input

export default function Resource() {
  const { message, modal } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()

  // 列表查询参数
  const [listQuery, setListQuery] = useState<ResourceQueryParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 资源列表数据
  const [list, setList] = useState<UmsResource[]>([])
  // 分页总数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(true)

  // 分类筛选选项
  const [categoryOptions, setCategoryOptions] = useState<{ label: string, value: number }[]>([])
  // 默认选择分类ID
  const [defaultCategoryId, setDefaultCategoryId] = useState<number>()

  // 默认资源对象
  const defaultResource: UmsResource = {
    name: '',
    url: '',
    description: '',
    categoryId: 0,
  }
  // 当前操作资源
  const [resource, setResource] = useState<UmsResource>(defaultResource)
  // 编辑弹框是否可见
  const [dialogOpen, setdialogOpen] = useState(false)
  // 是否为编辑状态
  const [isEdit, setIsEdit] = useState(false)

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getResourceListAPI(listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取资源列表失败:', error)
    }
  }

  // 获取分类列表
  const getCateList = async () => {
    try {
      const res = await resourceCategoryListAllAPI()
      const cateList = res.data
      const options = cateList.map(item => ({ label: item.name, value: item.id! }))
      setCategoryOptions(options)
      if (cateList && cateList.length > 0) {
        setDefaultCategoryId(cateList[0]!.id)
      }
    }
    catch (error) {
      console.error('获取资源分类失败:', error)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    getList()
    getCateList()
  }, [listQuery])

  // 重置搜索条件
  const handleResetSearch = () => {
    setListQuery({
      pageNum: 1,
      pageSize: 10,
    })
  }

  // 搜索列表
  const handleSearchList = () => {
    setListQuery({ ...listQuery, pageNum: 1 })
  }

  // 添加资源
  const handleAdd = () => {
    setdialogOpen(true)
    setIsEdit(false)
    setResource({
      ...defaultResource,
      categoryId: defaultCategoryId || 0,
    })
  }

  // 删除资源
  const handleDelete = (row: UmsResource) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该资源?',
      onOk: async () => {
        try {
          await resourceDeleteByIdAPI(row.id!)
          message.success('删除成功!')
          getList()
        }
        catch (error) {
          console.error('删除资源失败:', error)
        }
      },
    })
  }

  // 更新资源
  const handleUpdate = (row: UmsResource) => {
    setdialogOpen(true)
    setIsEdit(true)
    setResource({ ...row })
  }

  // 处理对话框确认
  const handleDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        try {
          if (isEdit) {
            await resourceUpdateAPI(resource.id!, resource)
            message.success('修改成功！')
          }
          else {
            await resourceCreateAPI(resource)
            message.success('添加成功！')
          }
          setdialogOpen(false)
          getList()
        }
        catch (error) {
          console.error('操作失败:', error)
        }
      },
    })
  }

  // 显示资源分类
  const handleShowCategory = () => {
    openTab({ key: '/mall/ums/resourceCategory', label: '资源分类' })
  }

  // 日期格式化
  const formatDateTime = (time: string) => {
    if (!time) {
      return 'N/A'
    }
    return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
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
      width: 100,
      align: 'center' as const,
    },
    {
      title: '资源名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
    },
    {
      title: '资源路径',
      dataIndex: 'url',
      key: 'url',
      align: 'center' as const,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
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
    {
      title: '操作',
      key: 'actions',
      width: 140,
      align: 'center' as const,
      render: (_: any, row: UmsResource) => (
        <Space>
          <Button type="link" onClick={() => handleUpdate(row)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
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
            <Form.Item label="资源名称：">
              <Input
                value={listQuery.nameKeyword}
                onChange={e => setListQuery({ ...listQuery, nameKeyword: e.target.value })}
                placeholder="资源名称"
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>
            <Form.Item label="资源路径：">
              <Input
                value={listQuery.urlKeyword}
                onChange={e => setListQuery({ ...listQuery, urlKeyword: e.target.value })}
                placeholder="资源路径"
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>
            <Form.Item label="资源分类：">
              <Select
                value={listQuery.categoryId}
                onChange={value => setListQuery({ ...listQuery, categoryId: value })}
                placeholder="全部"
                style={{ width: 150 }}
                allowClear
              >
                {categoryOptions.map(item => (
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
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加
            </Button>
            <Button onClick={handleShowCategory}>资源分类</Button>
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
            pageSizeOptions: ['10', '15', '20'],
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          rowKey="id"
        />
      </Card>

      {/* 添加/编辑资源对话框 */}
      <Modal
        title={isEdit ? '编辑资源' : '添加资源'}
        open={dialogOpen}
        onCancel={() => setdialogOpen(false)}
        onOk={handleDialogConfirm}
        width={500}
      >
        <Form labelCol={{ span: 6 }}>
          <Form.Item label="资源名称：">
            <Input
              value={resource.name}
              onChange={e => setResource({ ...resource, name: e.target.value })}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item label="资源路径：">
            <Input
              value={resource.url}
              onChange={e => setResource({ ...resource, url: e.target.value })}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item label="资源分类：">
            <Select
              value={resource.categoryId}
              onChange={value => setResource({ ...resource, categoryId: value })}
              placeholder="全部"
              style={{ width: 250 }}
            >
              {categoryOptions.map(item => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="描述：">
            <TextArea
              value={resource.description}
              onChange={e => setResource({ ...resource, description: e.target.value })}
              rows={5}
              style={{ width: 250 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
