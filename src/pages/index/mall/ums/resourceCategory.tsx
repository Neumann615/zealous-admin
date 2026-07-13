import type { UmsResourceCategory } from '@/types/resource'
import { PlusOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useAppMessage } from '@/hooks/useAppMessage'
import {
  resourceCategoryCreateAPI,
  resourceCategoryDeleteByIdAPI,
  resourceCategoryListAllAPI,
  resourceCategoryUpdateAPI,
} from '@/apis/resourceCategory'

export default function ResourceCategory() {
  const { message, modal } = useAppMessage()
  // 资源分类列表数据
  const [list, setList] = useState<UmsResourceCategory[]>([])
  // 加载状态
  const [listLoading, setListLoading] = useState(true)

  // 默认资源分类对象
  const defaultCategory: UmsResourceCategory = {
    name: '',
    sort: 0,
  }
  // 当前操作资源分类
  const [category, setCategory] = useState<UmsResourceCategory>(defaultCategory)
  // 编辑弹框是否可见
  const [dialogOpen, setDialogOpen] = useState(false)
  // 是否为编辑状态
  const [isEdit, setIsEdit] = useState(false)

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await resourceCategoryListAllAPI()
      setListLoading(false)
      setList(res.data)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取资源分类列表失败:', error)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    getList()
  }, [])

  // 添加资源分类
  const handleAdd = () => {
    setDialogOpen(true)
    setIsEdit(false)
    setCategory(defaultCategory)
  }

  // 删除资源分类
  const handleDelete = (row: UmsResourceCategory) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该资源分类?',
      onOk: async () => {
        try {
          await resourceCategoryDeleteByIdAPI(row.id!)
          message.success('删除成功!')
          getList()
        }
        catch (error) {
          console.error('删除资源分类失败:', error)
        }
      },
    })
  }

  // 更新资源分类
  const handleUpdate = (row: UmsResourceCategory) => {
    setDialogOpen(true)
    setIsEdit(true)
    setCategory({ ...row })
  }

  // 处理对话框确认
  const handleDialogConfirm = async () => {
    modal.confirm({
      title: '提示',
      content: '是否要确认?',
      onOk: async () => {
        try {
          if (isEdit) {
            await resourceCategoryUpdateAPI(category.id!, category)
            message.success('修改成功！')
          }
          else {
            await resourceCategoryCreateAPI(category)
            message.success('添加成功！')
          }
          setDialogOpen(false)
          getList()
        }
        catch (error) {
          console.error('操作失败:', error)
        }
      },
    })
  }

  // 日期格式化
  const formatDateTime = (time: string) => {
    if (!time) {
      return 'N/A'
    }
    return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
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
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 100,
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
      render: (_: any, row: UmsResourceCategory) => (
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
        title="数据列表"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加
          </Button>
        )}
      >
        <Table
          columns={columns}
          dataSource={list}
          loading={listLoading}
          bordered
          pagination={false}
          rowKey="id"
        />
      </Card>

      {/* 添加/编辑资源分类对话框 */}
      <Modal
        title={isEdit ? '编辑资源分类' : '添加资源分类'}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={handleDialogConfirm}
        width={500}
      >
        <Form labelCol={{ span: 6 }}>
          <Form.Item label="分类名称：">
            <Input
              value={category.name}
              onChange={e => setCategory({ ...category, name: e.target.value })}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item label="排序：">
            <Input
              type="number"
              value={category.sort}
              onChange={e => setCategory({ ...category, sort: Number(e.target.value) })}
              style={{ width: 250 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
