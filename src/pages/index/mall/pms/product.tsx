import type { PmsProduct, ProductQueryParam } from '@/types/product'
import type { PmsProductAttribute } from '@/types/productAttr'
import type { PmsSkuStock } from '@/types/skuStock'
import {
  PlusOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Cascader,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Table,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useControlTab } from '@zealous-admin/layout/index'
import { getBrandListAPI } from '@/apis/brand'
import {
  getProductListAPI,
  productUpdateDeleteStatusAPI,
  productUpdateNewStatusAPI,
  productUpdatePublishStatusAPI,
  productUpdateRecommendStatusAPI,
} from '@/apis/product'
import { getProductAttributeListAPI } from '@/apis/productAttr'
import { getProductCategoryListWithChildrenAPI } from '@/apis/productCate'
import { getSkuListByPidAPI, skuUpdateByPidAPI } from '@/apis/skuStock'
import { useAppMessage } from '@/hooks/useAppMessage'

const { Search } = Input
const { Option } = Select

export default function Product() {
  const { message, modal } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()

  // 列表查询参数
  const [listQuery, setListQuery] = useState<ProductQueryParam>({
    pageNum: 1,
    pageSize: 10,
  })
  // 列表数据
  const [list, setList] = useState<PmsProduct[]>([])
  // 总条数
  const [total, setTotal] = useState(0)
  // 加载状态
  const [listLoading, setListLoading] = useState(true)

  // 获取列表数据
  const getList = async () => {
    setListLoading(true)
    try {
      const response = await getProductListAPI(listQuery)
      setListLoading(false)
      setList(response.data.list)
      setTotal(response.data.total)
    }
    catch (error) {
      setListLoading(false)
      console.error('获取商品列表失败:', error)
    }
  }

  // 筛选搜索中的品牌数据
  const [brandOptions, setBrandOptions] = useState<
    { label: string, value: string }[]
  >([])

  // 获取品牌列表数据
  const getBrandList = async () => {
    const res = await getBrandListAPI({ pageNum: 1, pageSize: 100 })
    setBrandOptions(
      res.data.list.map((item: any) => ({
        label: item.name,
        value: item.id!.toString(),
      })),
    )
  }

  // 筛选搜索中的商品分类数据
  const [productCateOptions, setProductCateOptions] = useState<
    {
      label: string
      value: number
      children?: { label: string, value: number }[]
    }[]
  >([])

  // 获取商品分类列表数据
  const getProductCateList = async () => {
    const res = await getProductCategoryListWithChildrenAPI()
    const cateList = res.data
    setProductCateOptions(
      cateList.map((item: any) => ({
        label: item.name,
        value: item.id!,
        children: item.children?.map((it: any) => ({
          label: it.name,
          value: it.id!,
        })),
      })),
    )
  }

  // 监听分类选择改变
  const handleCateChange = (value: number[]) => {
    if (value && value.length === 2) {
      setListQuery(prev => ({ ...prev, productCategoryId: value[1] }))
    }
    else {
      setListQuery(prev => ({ ...prev, productCategoryId: undefined }))
    }
  }

  // 组件挂载后执行
  useEffect(() => {
    getList()
    getBrandList()
    getProductCateList()
  }, [])

  // 批量操作类型
  const [operates] = useState([
    { label: '商品上架', value: 'publishOn' },
    { label: '商品下架', value: 'publishOff' },
    { label: '设为推荐', value: 'recommendOn' },
    { label: '取消推荐', value: 'recommendOff' },
    { label: '设为新品', value: 'newOn' },
    { label: '取消新品', value: 'newOff' },
    { label: '移入回收站', value: 'recycle' },
  ])

  // 当前批量操作
  const [operateType, setOperateType] = useState<string | undefined>()
  // 当前选中的条目
  const [multipleSelection, setMultipleSelection] = useState<PmsProduct[]>([])

  // SKU库存弹框数据
  const [skuInfo, setSkuInfo] = useState({
    dialogVisible: false,
    productId: 0,
    productSn: '',
    productAttributeCategoryId: 0,
    stockList: [] as PmsSkuStock[],
    productAttr: [] as PmsProductAttribute[],
    keyword: undefined as string | undefined,
  })

  // 从PmsSkuStock的spData中获取规格对应的值
  const getProductSkuSp = (row: PmsSkuStock, index: number) => {
    try {
      const spData = JSON.parse(row.spData!)
      if (spData && index < spData.length) {
        return spData[index].value
      }
    }
    catch (e) {
      console.error('解析spData失败:', e)
    }
    return ''
  }

  // 显示SKU编辑对话框
  const handleShowSkuEditDialog = async (row: PmsProduct) => {
    setSkuInfo({
      dialogVisible: true,
      productId: row.id!,
      productSn: row.productSn,
      productAttributeCategoryId: row.productAttributeCategoryId!,
      stockList: [],
      productAttr: [],
      keyword: undefined,
    })
    const resp = await getSkuListByPidAPI(row.id!, { keyword: undefined })
    setSkuInfo(prev => ({ ...prev, stockList: resp.data }))
    if (row.productAttributeCategoryId) {
      const res2 = await getProductAttributeListAPI(
        row.productAttributeCategoryId,
        {
          pageNum: 1,
          pageSize: 10,
          type: 0,
        },
      )
      setSkuInfo(prev => ({ ...prev, productAttr: res2.data.list }))
    }
  }

  // 搜索SKU
  const handleSearchEditSku = async () => {
    const response = await getSkuListByPidAPI(skuInfo.productId, {
      keyword: skuInfo.keyword,
    })
    setSkuInfo(prev => ({ ...prev, stockList: response.data }))
  }

  // 确认编辑SKU
  const handleEditSkuConfirm = async () => {
    if (!skuInfo.stockList || skuInfo.stockList.length <= 0) {
      message.warning('暂无sku信息', 1)
      return
    }
    try {
      await skuUpdateByPidAPI(skuInfo.productId, skuInfo.stockList)
      message.success('修改成功', 1)
      setSkuInfo(prev => ({ ...prev, dialogVisible: false }))
    }
    catch (error) {
      console.error('修改SKU失败:', error)
    }
  }

  // 搜索列表
  const handleSearchList = () => {
    setListQuery(prev => ({ ...prev, pageNum: 1 }))
    getList()
  }

  // 添加商品
  const handleAddProduct = () => {
    openTab({ key: '/mall/pms/addProduct', label: '添加商品' })
  }

  // 更新上架状态
  const updatePublishStatus = async (status: number, ids: number[]) => {
    try {
      await productUpdatePublishStatusAPI({
        ids: ids.join(','),
        publishStatus: status,
      })
      message.success('操作成功', 1)
    }
    catch (error) {
      console.error('更新上架状态失败:', error)
    }
  }

  // 更新推荐状态
  const updateRecommendStatus = async (status: number, ids: number[]) => {
    try {
      await productUpdateRecommendStatusAPI({
        ids: ids.join(','),
        recommandStatus: status,
      })
      message.success('操作成功', 1)
    }
    catch (error) {
      console.error('更新推荐状态失败:', error)
    }
  }

  // 更新新品状态
  const updateNewStatus = async (status: number, ids: number[]) => {
    try {
      await productUpdateNewStatusAPI({
        ids: ids.join(','),
        newStatus: status,
      })
      message.success('操作成功', 1)
    }
    catch (error) {
      console.error('更新新品状态失败:', error)
    }
  }

  // 更新删除状态
  const updateDeleteStatus = async (status: number, ids: number[]) => {
    try {
      await productUpdateDeleteStatusAPI({
        ids: ids.join(','),
        deleteStatus: status,
      })
      message.success('操作成功', 1)
    }
    catch (error) {
      console.error('更新删除状态失败:', error)
    }
  }

  // 批量操作
  const handleBatchOperate = async () => {
    if (!operateType) {
      message.warning('请选择操作类型', 1)
      return
    }
    if (!multipleSelection || multipleSelection.length < 1) {
      message.warning('请选择要操作的商品', 1)
      return
    }
    const ids = multipleSelection.map(item => item.id!)
    switch (operateType) {
      case 'publishOn':
        await updatePublishStatus(1, ids)
        break
      case 'publishOff':
        await updatePublishStatus(0, ids)
        break
      case 'recommendOn':
        await updateRecommendStatus(1, ids)
        break
      case 'recommendOff':
        await updateRecommendStatus(0, ids)
        break
      case 'newOn':
        await updateNewStatus(1, ids)
        break
      case 'newOff':
        await updateNewStatus(0, ids)
        break
      case 'recycle':
        await updateDeleteStatus(1, ids)
        break
      default:
        break
    }
    getList()
  }

  // 每页大小变化
  const handleSizeChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: 1, pageSize: val }))
    getList()
  }

  // 当前页变化
  const handleCurrentChange = (val: number) => {
    setListQuery(prev => ({ ...prev, pageNum: val }))
    getList()
  }

  // 处理选中变化
  const handleSelectionChange = (_selectedRowKeys: React.Key[], selectedRows: PmsProduct[]) => {
    setMultipleSelection(selectedRows)
  }

  // 处理上架状态变化
  const handlePublishStatusChange = async (row: PmsProduct) => {
    await updatePublishStatus(row.publishStatus!, [row.id!])
  }

  // 处理新品状态变化
  const handleNewStatusChange = async (row: PmsProduct) => {
    await updateNewStatus(row.newStatus!, [row.id!])
  }

  // 处理推荐状态变化
  const handleRecommendStatusChange = async (row: PmsProduct) => {
    await updateRecommendStatus(row.recommandStatus!, [row.id!])
  }

  // 查看商品详情
  const handleViewProduct = (row: PmsProduct) => {
    openTab({ key: `/mall/pms/productDetail?id=${row.id}`, label: '商品详情' })
  }

  // 编辑商品
  const handleEditProduct = (row: PmsProduct) => {
    openTab({ key: `/mall/pms/updateProduct?id=${row.id}`, label: '编辑商品' })
  }

  // 删除单个商品
  const handleDeleteProduct = (row: PmsProduct) => {
    modal.confirm({
      title: '提示',
      content: '是否要删除该商品?',
      onOk: async () => {
        await updateDeleteStatus(1, [row.id!])
        getList()
        message.success('删除成功')
      },
    })
  }

  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '商品图片',
      key: 'pic',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: PmsProduct) =>
        record.pic ? <img src={record.pic} alt="" style={{ height: 60 }} /> : '-',
    },
    {
      title: '商品名称',
      key: 'name',
      ellipsis: true,
      render: (_: any, record: PmsProduct) => (
        <div>
          <div>{record.name}</div>
          <div style={{ color: '#999', fontSize: 12 }}>品牌：{record.brandName || '-'}</div>
        </div>
      ),
    },
    {
      title: '价格/货号',
      key: 'priceSn',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: PmsProduct) => (
        <div>
          <div>¥{record.price ?? '-'}</div>
          <div style={{ color: '#999', fontSize: 12 }}>{record.productSn}</div>
        </div>
      ),
    },
    {
      title: '商品分类',
      dataIndex: 'productCategoryName',
      key: 'productCategoryName',
      width: 120,
      align: 'center' as const,
      ellipsis: true,
    },
    {
      title: '标签',
      key: 'tags',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: PmsProduct) => (
        <div style={{ lineHeight: '26px' }}>
          <div>
            上架：
            <Switch
              size="small"
              checked={record.publishStatus === 1}
              onChange={checked =>
                handlePublishStatusChange({ ...record, publishStatus: checked ? 1 : 0 })}
            />
          </div>
          <div>
            新品：
            <Switch
              size="small"
              checked={record.newStatus === 1}
              onChange={checked =>
                handleNewStatusChange({ ...record, newStatus: checked ? 1 : 0 })}
            />
          </div>
          <div>
            推荐：
            <Switch
              size="small"
              checked={record.recommandStatus === 1}
              onChange={checked =>
                handleRecommendStatusChange({ ...record, recommandStatus: checked ? 1 : 0 })}
            />
          </div>
        </div>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 70,
      align: 'center' as const,
    },
    {
      title: 'SKU库存',
      key: 'sku',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: PmsProduct) => (
        <Button
          type="primary"
          shape="circle"
          icon={<ShoppingCartOutlined />}
          onClick={() => handleShowSkuEditDialog(record)}
        />
      ),
    },
    {
      title: '销量',
      dataIndex: 'sale',
      key: 'sale',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '审核状态',
      key: 'verifyStatus',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: PmsProduct) => (
        <div>
          <div>{record.verifyStatus === 1 ? '审核通过' : '未审核'}</div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: PmsProduct) => (
        <div>
          <div>
            <Button size="small" type="link" onClick={() => handleViewProduct(record)}>
              查看
            </Button>
            <Button size="small" type="link" onClick={() => handleEditProduct(record)}>
              编辑
            </Button>
          </div>
          <div>
            <Button size="small" type="link" onClick={() => handleShowSkuEditDialog(record)}>
              SKU
            </Button>
            <Button size="small" type="link" danger onClick={() => handleDeleteProduct(record)}>
              删除
            </Button>
          </div>
        </div>
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
          <>
            <Button
              onClick={() => setListQuery({ pageNum: 1, pageSize: 10 })}
              style={{ marginRight: 15 }}
            >
              重置
            </Button>
            <Button type="primary" onClick={handleSearchList}>
              查询搜索
            </Button>
          </>
        )}
      >
        <Form layout="inline">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px' }}>
            <Form.Item label="商品名称：">
              <Input
                value={listQuery.nameKeyword}
                onChange={e =>
                  setListQuery(prev => ({
                    ...prev,
                    nameKeyword: e.target.value,
                  }))}
                placeholder="商品名称"
                allowClear
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="商品编号：">
              <Input
                value={listQuery.productSn}
                onChange={e =>
                  setListQuery(prev => ({ ...prev, productSn: e.target.value }))}
                placeholder="商品编号"
                allowClear
                style={{ width: 150 }}
              />
            </Form.Item>
            <Form.Item label="品牌：">
              <Select
                value={listQuery.brandId}
                onChange={value =>
                  setListQuery(prev => ({ ...prev, brandId: value }))}
                placeholder="全部"
                allowClear
                style={{ width: 150 }}
              >
                {brandOptions.map(item => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="商品分类：">
              <Cascader
                options={productCateOptions}
                placeholder="请选择分类"
                onChange={handleCateChange}
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
              执行
            </Button>
            <Button
              type="primary"
              onClick={handleAddProduct}
              icon={<PlusOutlined />}
              style={{ marginLeft: 15 }}
            >
              添加商品
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

      {/* SKU编辑对话框 */}
      <Modal
        title={`SKU库存管理 - ${skuInfo.productSn}`}
        open={skuInfo.dialogVisible}
        onCancel={() =>
          setSkuInfo(prev => ({ ...prev, dialogVisible: false }))}
        footer={[
          <Button
            key="back"
            onClick={() =>
              setSkuInfo(prev => ({ ...prev, dialogVisible: false }))}
          >
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleEditSkuConfirm}>
            确定
          </Button>,
        ]}
        width="80%"
      >
        <Form layout="inline" style={{ marginBottom: 15 }}>
          <Form.Item label="搜索SKU：">
            <Input
              value={skuInfo.keyword}
              onChange={e =>
                setSkuInfo(prev => ({ ...prev, keyword: e.target.value }))}
              placeholder="搜索SKU"
              allowClear
              style={{ width: 200 }}
            />
            <Button
              type="primary"
              onClick={handleSearchEditSku}
              style={{ marginLeft: 10 }}
            >
              搜索
            </Button>
          </Form.Item>
        </Form>
        <Table
          dataSource={skuInfo.stockList}
          bordered
          pagination={false}
          rowKey="id"
        >
          <Table.Column title="SKU编号" dataIndex="skuCode" key="skuCode" />
          <Table.Column title="价格" dataIndex="price" key="price" />
          <Table.Column title="库存" dataIndex="stock" key="stock" />
          <Table.Column
            title="规格1"
            key="sp1"
            render={(_: any, record: PmsSkuStock) => getProductSkuSp(record, 0)}
          />
          <Table.Column
            title="规格2"
            key="sp2"
            render={(_: any, record: PmsSkuStock) => getProductSkuSp(record, 1)}
          />
        </Table>
      </Modal>
    </div>
  )
};
