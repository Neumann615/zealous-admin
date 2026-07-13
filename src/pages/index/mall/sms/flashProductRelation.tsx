import type { FlashProductQueryParam, SmsFlashPromotionProductRelation } from '@/types/flash'
import type { PmsProduct, ProductQueryParam } from '@/types/product'
import { PlusOutlined } from '@ant-design/icons'
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
  Table,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  flashProductRelationCreateAPI,
  flashProductRelationDeleteByIdAPI,
  flashProductRelationUpdateByIdAPI,
  getFlashProductRelationListAPI,
} from '@/apis/flashProductRelation'
import { getProductListAPI } from '@/apis/product'
import { useAppMessage } from '@/hooks/useAppMessage'

const { Option } = Select

export default function FlashProductRelation() {
  const { message, modal } = useAppMessage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 秒杀商品关系列表数据
  const [listQuery, setListQuery] = useState<FlashProductQueryParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 秒杀商品列数据
  const [list, setList] = useState<SmsFlashPromotionProductRelation[]>([])
  // 总条数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(false)

  // 编辑对话框
  const [editDialogVisible, setEditDialogVisible] = useState(false)
  const [flashProductRelation, setFlashProductRelation] = useState<SmsFlashPromotionProductRelation>()

  // 选择商品对话框
  const [selectDialogVisible, setSelectDialogVisible] = useState(false)
  const [dialogData, setDialogData] = useState<{
    list: PmsProduct[]
    total: number
    multipleSelection: PmsProduct[]
    listQuery: ProductQueryParam
  }>({
    list: [],
    total: 0,
    multipleSelection: [],
    listQuery: {
      keyword: '',
      pageNum: 1,
      pageSize: 5,
    },
  })

  const [form] = Form.useForm()

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const res = await getFlashProductRelationListAPI(listQuery)
      setListLoading(false)
      setList(res.data.list)
      setTotal(res.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取秒杀商品列表失败:', error)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    const flashPromotionId = Number(searchParams.get('flashPromotionId'))
    const flashPromotionSessionId = Number(searchParams.get('flashPromotionSessionId'))
    setListQuery(prev => ({
      ...prev,
      flashPromotionId,
      flashPromotionSessionId,
    }))
  }, [searchParams])

  useEffect(() => {
    if (listQuery.flashPromotionId) {
      getList()
    }
  }, [listQuery])

  // 获取对话框商品列表数据
  const getDialogList = async () => {
    try {
      const res = await getProductListAPI(dialogData.listQuery)
      setDialogData(prev => ({
        ...prev,
        list: res.data.list,
        total: res.data.total,
      }))
    }
    catch (error) {
      console.error('获取商品列表失败:', error)
    }
  }

  // 选择商品
  const handleSelectProduct = () => {
    setSelectDialogVisible(true)
    getDialogList()
  }

  // 编辑秒杀商品
  const handleUpdate = (row: SmsFlashPromotionProductRelation) => {
    setEditDialogVisible(true)
    setFlashProductRelation(row)
    form.setFieldsValue({
      flashPromotionPrice: row.flashPromotionPrice,
      flashPromotionCount: row.flashPromotionCount,
      flashPromotionLimit: row.flashPromotionLimit,
      sort: row.sort,
    })
  }

  // 删除秒杀商品
  const handleDelete = (row: SmsFlashPromotionProductRelation) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该商品?',
      onOk: async () => {
        try {
          await flashProductRelationDeleteByIdAPI(row.id!)
          message.success('删除成功!')
          getList()
        }
        catch (error) {
          console.error('删除秒杀商品失败:', error)
        }
      },
    })
  }

  // 选择搜索
  const handleSelectSearch = () => {
    getDialogList()
  }

  // 对话框选中项改变
  const handleDialogSelectionChange = (selectedRowKeys: React.Key[], selectedRows: PmsProduct[]) => {
    setDialogData(prev => ({
      ...prev,
      multipleSelection: selectedRows,
    }))
  }

  // 对话框分页变化
  const handleDialogTableChange = (pagination: { current?: number, pageSize?: number }) => {
    setDialogData(prev => ({
      ...prev,
      listQuery: {
        ...prev.listQuery,
        pageNum: pagination.current || 1,
        pageSize: pagination.pageSize || 5,
      },
    }))
    getDialogList()
  }

  // 选择对话框确认
  const handleSelectDialogConfirm = async () => {
    if (dialogData.multipleSelection.length < 1) {
      message.warning('请选择一条记录')
      return
    }
    const selectProducts = dialogData.multipleSelection.map((item) => {
      return {
        productId: item.id!,
        flashPromotionId: listQuery.flashPromotionId!,
        flashPromotionSessionId: listQuery.flashPromotionSessionId!,
      }
    })
    modal.confirm({
      title: '提示',
      content: '是否要进行添加操作?',
      onOk: async () => {
        try {
          await flashProductRelationCreateAPI(selectProducts)
          setSelectDialogVisible(false)
          setDialogData(prev => ({ ...prev, multipleSelection: [] }))
          getList()
          message.success('添加成功!')
        }
        catch (error) {
          console.error('添加秒杀商品失败:', error)
        }
      },
    })
  }

  // 编辑对话框确认
  const handleEditDialogConfirm = async () => {
    try {
      const values = await form.validateFields()
      await flashProductRelationUpdateByIdAPI(flashProductRelation!.id!, {
        ...flashProductRelation!,
        ...values,
      })
      message.success('修改成功！')
      setEditDialogVisible(false)
      getList()
    }
    catch (error) {
      console.error('更新秒杀商品失败:', error)
    }
  }

  // 分页变化
  const handleTableChange = (pagination: { current?: number, pageSize?: number }) => {
    setListQuery(prev => ({
      ...prev,
      pageNum: pagination.current || 1,
      pageSize: pagination.pageSize || 10,
    }))
  }

  // 商品表格列
  const productColumns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
    },
    {
      title: '货号',
      dataIndex: 'productSn',
      key: 'productSn',
      width: 160,
      align: 'center' as const,
      render: (productSn: string) => `NO.${productSn}`,
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      align: 'center' as const,
      render: (price: number) => `￥${price}`,
    },
  ]

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
      title: '商品名称',
      key: 'name',
      align: 'center' as const,
      render: (_: any, row: SmsFlashPromotionProductRelation) => row.product?.name,
    },
    {
      title: '货号',
      key: 'productSn',
      width: 140,
      align: 'center' as const,
      render: (_: any, row: SmsFlashPromotionProductRelation) => `NO.${row.product?.productSn}`,
    },
    {
      title: '商品价格',
      key: 'price',
      width: 100,
      align: 'center' as const,
      render: (_: any, row: SmsFlashPromotionProductRelation) => `￥${row.product?.price}`,
    },
    {
      title: '剩余数量',
      key: 'stock',
      width: 100,
      align: 'center' as const,
      render: (_: any, row: SmsFlashPromotionProductRelation) => row.product?.stock,
    },
    {
      title: '秒杀价格',
      dataIndex: 'flashPromotionPrice',
      key: 'flashPromotionPrice',
      width: 100,
      align: 'center' as const,
      render: (price: number) => price ? `￥${price}` : '-',
    },
    {
      title: '秒杀数量',
      dataIndex: 'flashPromotionCount',
      key: 'flashPromotionCount',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '限购数量',
      dataIndex: 'flashPromotionLimit',
      key: 'flashPromotionLimit',
      width: 100,
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
      title: '操作',
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: (_: any, row: SmsFlashPromotionProductRelation) => (
        <Space>
          <Button type="link" onClick={() => handleUpdate(row)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(row)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="app-container">
      <Card
        title="数据列表"
        extra={(
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleSelectProduct}>
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
          }}
          onChange={handleTableChange}
          rowKey="id"
        />
      </Card>

      {/* 选择商品对话框 */}
      <Modal
        title="选择商品"
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
            placeholder="商品名称搜索"
            style={{ width: 250 }}
            addonAfter={<Button type="text" onClick={handleSelectSearch}>搜索</Button>}
          />
        </div>
        <Table
          columns={productColumns}
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
          onChange={handleDialogTableChange}
          rowKey="id"
        />
      </Modal>

      {/* 编辑秒杀商品信息对话框 */}
      <Modal
        title="编辑秒杀商品信息"
        open={editDialogVisible}
        onCancel={() => setEditDialogVisible(false)}
        onOk={handleEditDialogConfirm}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="商品名称：">
            <span>{flashProductRelation?.product?.name}</span>
          </Form.Item>
          <Form.Item label="货号：">
            <span>
              NO.
              {flashProductRelation?.product?.productSn}
            </span>
          </Form.Item>
          <Form.Item label="商品价格：">
            <span>
              ￥
              {flashProductRelation?.product?.price}
            </span>
          </Form.Item>
          <Form.Item
            name="flashPromotionPrice"
            label="秒杀价格："
            rules={[{ required: true, message: '请输入秒杀价格' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} addonBefore="￥" />
          </Form.Item>
          <Form.Item label="剩余数量：">
            <span>{flashProductRelation?.product?.stock}</span>
          </Form.Item>
          <Form.Item
            name="flashPromotionCount"
            label="秒杀数量："
            rules={[{ required: true, message: '请输入秒杀数量' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="flashPromotionLimit"
            label="限购数量："
            rules={[{ required: true, message: '请输入限购数量' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="sort"
            label="排序："
            rules={[{ required: true, message: '请输入排序' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
