import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  DownSquareOutlined,
} from '@ant-design/icons'
import { Checkbox, Radio, Select } from 'antd'
import { registerComponent } from '../registry'
import { fieldSchema } from './helpers'

const DEFAULT_OPTIONS = [
  { label: '选项1', value: '1' },
  { label: '选项2', value: '2' },
]

registerComponent({
  type: 'select',
  title: '下拉选择',
  menu: 'main',
  icon: <DownSquareOutlined />,
  optionProp: 'options',
  defaultSchema: () => fieldSchema('select', '下拉选择', { options: DEFAULT_OPTIONS }),
  render: schema => <Select style={{ width: '100%' }} {...schema.props} />,
  configForm: [
    { field: 'props.options', label: '选项', type: 'options' },
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
    {
      field: 'props.mode',
      label: '模式',
      type: 'select',
      options: [
        { label: '单选', value: undefined },
        { label: '多选', value: 'multiple' },
        { label: '标签', value: 'tags' },
      ],
    },
    { field: 'props.allowClear', label: '可清空', type: 'switch' },
    { field: 'props.showSearch', label: '可搜索', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'radio',
  title: '单选框组',
  menu: 'main',
  icon: <CheckCircleOutlined />,
  optionProp: 'options',
  defaultSchema: () => fieldSchema('radio', '单选框组', { options: DEFAULT_OPTIONS }),
  render: schema => <Radio.Group {...schema.props} />,
  configForm: [
    { field: 'props.options', label: '选项', type: 'options' },
    {
      field: 'props.optionType',
      label: '样式',
      type: 'select',
      options: [
        { label: '默认', value: 'default' },
        { label: '按钮', value: 'button' },
      ],
    },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'checkbox',
  title: '多选框组',
  menu: 'main',
  icon: <CheckSquareOutlined />,
  optionProp: 'options',
  defaultSchema: () => fieldSchema('checkbox', '多选框组', { options: DEFAULT_OPTIONS }),
  render: schema => <Checkbox.Group {...schema.props} />,
  configForm: [
    { field: 'props.options', label: '选项', type: 'options' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})
