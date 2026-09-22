import { CalculatorOutlined, MoneyCollectOutlined, SmileOutlined, UploadOutlined } from '@ant-design/icons'
import { ZaIconPicker } from '@zealous-admin/components/index'
import { Button, Input, InputNumber, Upload } from 'antd'
import { registerComponent } from '../registry'
import { fieldSchema } from './helpers'

/** Upload 的 onChange 参数为 { file, fileList }，归一化成 fileList 才能受控 */
function normFileList(e: any) {
  return Array.isArray(e) ? e : e?.fileList
}

registerComponent({
  type: 'upload',
  title: '上传',
  menu: 'advanced',
  icon: <UploadOutlined />,
  defaultSchema: () => fieldSchema('upload', '上传', { listType: 'text', buttonText: '点击上传', maxCount: 1 }),
  // 本期只做前端收集（beforeUpload 返回 false，不落服务端）；上传地址与鉴权后续按需扩展
  formItemProps: { valuePropName: 'fileList', getValueFromEvent: normFileList },
  render: (schema) => {
    // buttonText 是自定义键，其余（listType/multiple/maxCount/accept 等）透传给 Upload
    const { buttonText, ...rest } = schema.props
    return (
      <Upload {...rest} beforeUpload={() => false}>
        <Button icon={<UploadOutlined />}>{buttonText || '点击上传'}</Button>
      </Upload>
    )
  },
  configForm: [
    { field: 'props.buttonText', label: '按钮文案', type: 'input' },
    {
      field: 'props.listType',
      label: '展示形态',
      type: 'select',
      options: [
        { label: '文字列表', value: 'text' },
        { label: '图片列表', value: 'picture' },
        { label: '图片卡片', value: 'picture-card' },
      ],
    },
    { field: 'props.multiple', label: '多选', type: 'switch' },
    { field: 'props.maxCount', label: '最大数量', type: 'number', props: { min: 1 } },
    { field: 'props.accept', label: '文件类型', type: 'input', props: { placeholder: '如 .png,.jpg' } },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'money',
  title: '金额输入',
  menu: 'advanced',
  icon: <MoneyCollectOutlined />,
  defaultSchema: () => fieldSchema('money', '金额', { prefix: '¥', precision: 2, thousands: true, min: 0 }),
  render: (schema) => {
    // thousands 是自定义键，换算成 InputNumber 的 formatter/parser
    const { thousands, ...rest } = schema.props
    return (
      <InputNumber
        {...rest}
        style={{ width: '100%' }}
        formatter={thousands ? (value?: string | number) => `${value ?? ''}`.replace(/\B(?=(?:\d{3})+(?!\d))/g, ',') : undefined}
        parser={thousands ? (value?: string) => (value ?? '').replace(/,/g, '') : undefined}
      />
    )
  },
  configForm: [
    { field: 'props.prefix', label: '币种符号', type: 'input' },
    { field: 'props.precision', label: '小数位', type: 'number', props: { min: 0, max: 8 } },
    { field: 'props.thousands', label: '千分位', type: 'switch' },
    { field: 'props.min', label: '最小值', type: 'number' },
    { field: 'props.max', label: '最大值', type: 'number' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'icon',
  title: '图标选择器',
  menu: 'advanced',
  icon: <SmileOutlined />,
  defaultSchema: () => fieldSchema('icon', '图标', { placeholder: '点击选择图标', clearable: true }),
  // 复用 components 包的 ZaIconPicker（value/onChange 受控，Form.Item 直接注入）
  render: schema => <ZaIconPicker {...schema.props} />,
  configForm: [
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
    { field: 'props.clearable', label: '可清空', type: 'switch' },
  ],
})

registerComponent({
  type: 'formula',
  title: '计算字段',
  menu: 'advanced',
  icon: <CalculatorOutlined />,
  defaultSchema: () => fieldSchema('formula', '计算字段'),
  render: schema => <Input readOnly {...schema.props} />,
  configForm: [
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
  ],
})
