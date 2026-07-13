import type { OmsCompanyAddress } from '@/types/companyAddress'
import type {
  OmsOrderReturnApply,
  OmsOrderReturnApplyResult,
  OmsUpdateStatusParam,
} from '@/types/returnApply'
import { LeftOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Image,
  Input,
  Row,
  Select,
  Table,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useControlTab } from '@zealous-admin/layout/index'
import { getCompanyAddressListAPI } from '@/apis/companyAddress'
import { getReturnApplyByIdAPI, returnApplyUpdateStatusAPI } from '@/apis/returnApply'
import { useAppMessage } from '@/hooks/useAppMessage'

const { Option } = Select

// 默认状态修改参数
const defaultUpdateStatusParam: OmsUpdateStatusParam = {
  id: 0,
  companyAddressId: 0,
  handleMan: 'admin',
  handleNote: '',
  receiveMan: 'admin',
  receiveNote: '',
  returnAmount: 0,
  status: 0,
}

export default function ReturnApplyDetail() {
  const { message, modal } = useAppMessage()
  const navigate = useNavigate()
  const { openTab } = useControlTab()
  const [searchParams] = useSearchParams()

  // 当前退货申请ID
  const id = Number(searchParams.get('id'))
  // 当前退货申请
  const [orderReturnApply, setOrderReturnApply] = useState<OmsOrderReturnApplyResult | null>(null)
  // 凭证图片
  const [proofPics, setProofPics] = useState<string[]>([])
  // 退货商品列表
  const [productList, setProductList] = useState<OmsOrderReturnApply[]>([])
  // 公司收货地址列表
  const [companyAddressList, setCompanyAddressList] = useState<OmsCompanyAddress[]>([])
  // 修改退货申请状态参数
  const [updateStatusParam, setUpdateStatusParam] = useState<OmsUpdateStatusParam>({ ...defaultUpdateStatusParam })

  // 获取详情
  const getDetail = async () => {
    if (!id)
      return
    try {
      const res = await getReturnApplyByIdAPI(id)
      const data = res.data
      setOrderReturnApply(data)
      setProductList([data])
      if (data.proofPics) {
        setProofPics(data.proofPics.split(','))
      }
      // 退货中和完成
      if (data.status === 1 || data.status === 2) {
        setUpdateStatusParam(prev => ({
          ...prev,
          returnAmount: data.returnAmount,
          companyAddressId: data.companyAddressId,
        }))
      }
    }
    catch (error) {
      console.error('获取详情失败:', error)
    }
  }

  // 获取公司地址列表
  const getCompanyAddressList = async () => {
    try {
      const res = await getCompanyAddressListAPI()
      const data = res.data
      setCompanyAddressList(data)
      // 获取默认收货地址
      const defaultAddress = data.find(item => item.receiveStatus === 1)
      if (defaultAddress) {
        setUpdateStatusParam(prev => ({ ...prev, companyAddressId: defaultAddress.id || 0 }))
      }
    }
    catch (error) {
      console.error('获取公司地址列表失败:', error)
    }
  }

  // 组件挂载
  useEffect(() => {
    if (id) {
      getDetail()
      getCompanyAddressList()
    }
  }, [id])

  // 格式化日期
  const formatDateTime = (dateTime: string) => {
    return dateTime ? dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss') : '-'
  }

  // 计算总金额
  const getTotalAmount = () => {
    if (!orderReturnApply)
      return 0
    return orderReturnApply.productRealPrice * orderReturnApply.productCount
  }

  // 获取当前收货地址
  const getCurrentAddress = () => {
    if (!companyAddressList.length)
      return undefined
    return companyAddressList.find(item => item.id === updateStatusParam.companyAddressId)
  }

  // 格式化状态
  const formatStatus = (status: number) => {
    if (status === 0) {
      return '待处理'
    }
    else if (status === 1) {
      return '退货中'
    }
    else if (status === 2) {
      return '已完成'
    }
    else {
      return '已拒绝'
    }
  }

  // 格式化地区
  const formatRegion = (address: OmsCompanyAddress | undefined) => {
    if (!address)
      return ''
    let str = address.province
    if (address.city) {
      str += `  ${address.city}`
    }
    str += `  ${address.region}`
    return str
  }

  // 查看订单详情
  const handleViewOrder = () => {
    if (orderReturnApply) {
      openTab({ key: `/mall/oms/orderDetail?id=${orderReturnApply.orderId}`, label: '订单详情' })
    }
  }

  // 更新状态
  const handleUpdateStatus = async (status: number) => {
    modal.confirm({
      title: '提示',
      content: '是否要进行此操作?',
      onOk: async () => {
        try {
          await returnApplyUpdateStatusAPI(id, { ...updateStatusParam, status })
          message.success('操作成功!', 1)
          navigate(-1)
        }
        catch (error) {
          console.error('操作失败:', error)
        }
      },
    })
  }

  const currentAddress = getCurrentAddress()

  if (!orderReturnApply)
    return null

  // 商品列
  const productColumns = [
    {
      title: '商品图片',
      dataIndex: 'productPic',
      key: 'productPic',
      width: 160,
      render: (pic: string) => <img style={{ height: 80 }} src={pic} alt="商品" />,
    },
    {
      title: '商品名称',
      key: 'productName',
      render: (_: any, row: OmsOrderReturnApply) => (
        <>
          <div>{row.productName}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            品牌：
            {row.productBrand}
          </div>
        </>
      ),
    },
    {
      title: '价格/货号',
      key: 'price',
      width: 180,
      render: (_: any, row: OmsOrderReturnApply) => (
        <>
          <div>
            价格：￥
            {row.productRealPrice}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            货号：NO.
            {row.productId}
          </div>
        </>
      ),
    },
    {
      title: '属性',
      dataIndex: 'productAttr',
      key: 'productAttr',
      width: 180,
    },
    {
      title: '数量',
      dataIndex: 'productCount',
      key: 'productCount',
      width: 100,
    },
    {
      title: '小计',
      key: 'subtotal',
      width: 100,
      render: () => `￥${getTotalAmount()}`,
    },
  ]

  // 表单布局样式
  const formBorderStyle = {
    borderRight: '1px solid #DCDFE6',
    borderBottom: '1px solid #DCDFE6',
    padding: 10,
  }
  const formLeftBgStyle = {
    background: '#F2F6FC',
  }
  const formContainerBorderStyle = {
    borderLeft: '1px solid #DCDFE6',
    borderTop: '1px solid #DCDFE6',
    marginTop: 15,
  }

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      width: 1080,
      padding: '35px 35px 15px 35px',
      margin: '20px auto',
    }}
    >
      <Card
        title="退货商品"
        extra={(
          <Button type="primary" icon={<LeftOutlined />} onClick={() => navigate(-1)}>
            返回
          </Button>
        )}
      >
        <Table
          columns={productColumns}
          dataSource={productList}
          bordered
          pagination={false}
          rowKey="id"
        />
        <div style={{ float: 'right', marginTop: 15, marginBottom: 15 }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>合计：</span>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#f5222d' }}>
            ￥
            {getTotalAmount()}
          </span>
        </div>
      </Card>

      <Card title="服务单信息" style={{ marginTop: 15 }}>
        <div style={formContainerBorderStyle}>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>服务单号</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{orderReturnApply.id}</Col>
          </Row>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>申请状态</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{formatStatus(orderReturnApply.status)}</Col>
          </Row>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14, height: 50, lineHeight: '30px' }}>订单编号</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14, height: 50 }}>
              {orderReturnApply.orderSn}
              <Button type="text" size="small" onClick={handleViewOrder}>查看</Button>
            </Col>
          </Row>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>申请时间</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{formatDateTime(orderReturnApply.createTime)}</Col>
          </Row>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>用户账号</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{orderReturnApply.memberUsername}</Col>
          </Row>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>联系人</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{orderReturnApply.returnName}</Col>
          </Row>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>联系电话</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{orderReturnApply.returnPhone}</Col>
          </Row>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>退货原因</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{orderReturnApply.reason}</Col>
          </Row>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>问题描述</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{orderReturnApply.description}</Col>
          </Row>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14, height: 100, lineHeight: '80px' }}>凭证图片</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14, height: 100 }}>
              {proofPics.map((item, index) => (
                <Image
                  key={index}
                  width={80}
                  height={80}
                  src={item}
                  style={{ marginRight: 10 }}
                />
              ))}
            </Col>
          </Row>
        </div>

        <div style={formContainerBorderStyle}>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>订单金额</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>
              ￥
              {getTotalAmount()}
            </Col>
          </Row>
          <Row>
            <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14, height: 52, lineHeight: '32px' }}>确认退款金额</Col>
            <Col span={18} style={{ ...formBorderStyle, fontSize: 14, height: 52 }}>
              ￥
              <Input
                size="small"
                value={updateStatusParam.returnAmount}
                onChange={e => setUpdateStatusParam(prev => ({ ...prev, returnAmount: Number(e.target.value) }))}
                disabled={orderReturnApply.status !== 0}
                style={{ width: 200, marginLeft: 10 }}
              />
            </Col>
          </Row>
          {orderReturnApply.status !== 3 && (
            <>
              <Row>
                <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14, height: 52, lineHeight: '32px' }}>选择收货点</Col>
                <Col span={18} style={{ ...formBorderStyle, fontSize: 14, height: 52 }}>
                  <Select
                    size="small"
                    value={updateStatusParam.companyAddressId}
                    onChange={value => setUpdateStatusParam(prev => ({ ...prev, companyAddressId: value }))}
                    disabled={orderReturnApply.status !== 0}
                    style={{ width: 200 }}
                  >
                    {companyAddressList.map(address => (
                      <Option key={address.id} value={address.id}>
                        {address.addressName}
                      </Option>
                    ))}
                  </Select>
                </Col>
              </Row>
              <Row>
                <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>收货人姓名</Col>
                <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{currentAddress?.name}</Col>
              </Row>
              <Row>
                <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>所在区域</Col>
                <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{formatRegion(currentAddress)}</Col>
              </Row>
              <Row>
                <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>详细地址</Col>
                <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{currentAddress?.detailAddress}</Col>
              </Row>
              <Row>
                <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>联系电话</Col>
                <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{currentAddress?.phone}</Col>
              </Row>
            </>
          )}
        </div>

        {orderReturnApply.status !== 0 && (
          <div style={formContainerBorderStyle}>
            <Row>
              <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>处理人员</Col>
              <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{orderReturnApply.handleMan}</Col>
            </Row>
            <Row>
              <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>处理时间</Col>
              <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{formatDateTime(orderReturnApply.handleTime)}</Col>
            </Row>
            <Row>
              <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>处理备注</Col>
              <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{orderReturnApply.handleNote}</Col>
            </Row>
          </div>
        )}

        {orderReturnApply.status === 2 && (
          <div style={formContainerBorderStyle}>
            <Row>
              <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>收货人员</Col>
              <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{orderReturnApply.receiveMan}</Col>
            </Row>
            <Row>
              <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>收货时间</Col>
              <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{formatDateTime(orderReturnApply.receiveTime)}</Col>
            </Row>
            <Row>
              <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14 }}>收货备注</Col>
              <Col span={18} style={{ ...formBorderStyle, fontSize: 14 }}>{orderReturnApply.receiveNote}</Col>
            </Row>
          </div>
        )}

        {orderReturnApply.status === 0 && (
          <div style={formContainerBorderStyle}>
            <Row>
              <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14, height: 52, lineHeight: '32px' }}>处理备注</Col>
              <Col span={18} style={{ ...formBorderStyle, fontSize: 14, height: 52 }}>
                <Input
                  size="small"
                  value={updateStatusParam.handleNote}
                  onChange={e => setUpdateStatusParam(prev => ({ ...prev, handleNote: e.target.value }))}
                  style={{ width: 200, marginLeft: 10 }}
                />
              </Col>
            </Row>
          </div>
        )}

        {orderReturnApply.status === 1 && (
          <div style={formContainerBorderStyle}>
            <Row>
              <Col span={6} style={{ ...formBorderStyle, ...formLeftBgStyle, fontSize: 14, height: 52, lineHeight: '32px' }}>收货备注</Col>
              <Col span={18} style={{ ...formBorderStyle, fontSize: 14, height: 52 }}>
                <Input
                  size="small"
                  value={updateStatusParam.receiveNote}
                  onChange={e => setUpdateStatusParam(prev => ({ ...prev, receiveNote: e.target.value }))}
                  style={{ width: 200, marginLeft: 10 }}
                />
              </Col>
            </Row>
          </div>
        )}

        {orderReturnApply.status === 0 && (
          <div style={{ marginTop: 15, textAlign: 'center' }}>
            <Button type="primary" size="small" onClick={() => handleUpdateStatus(1)} style={{ marginRight: 10 }}>
              确认退货
            </Button>
            <Button type="danger" size="small" onClick={() => handleUpdateStatus(3)}>
              拒绝退货
            </Button>
          </div>
        )}

        {orderReturnApply.status === 1 && (
          <div style={{ marginTop: 15, textAlign: 'center' }}>
            <Button type="primary" size="small" onClick={() => handleUpdateStatus(2)}>
              确认收货
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
