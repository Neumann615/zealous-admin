import {
  ApartmentOutlined,
  BgColorsOutlined,
  ControlOutlined,
  NodeIndexOutlined,
  SlidersOutlined,
  StarOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { Cascader, ColorPicker, Rate, Slider, Switch, Transfer, TreeSelect } from 'antd'
import { registerComponent } from '../registry'
import { fieldSchema } from './helpers'

registerComponent({
  type: 'switch',
  title: '开关',
  menu: 'main',
  icon: <ControlOutlined />,
  formItemProps: { valuePropName: 'checked' },
  defaultSchema: () => fieldSchema('switch', '开关'),
  render: schema => <Switch {...schema.props} />,
  configForm: [
    { field: 'props.checkedChildren', label: '开启文案', type: 'input' },
    { field: 'props.unCheckedChildren', label: '关闭文案', type: 'input' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'rate',
  title: '评分',
  menu: 'main',
  icon: <StarOutlined />,
  defaultSchema: () => fieldSchema('rate', '评分', { count: 5 }),
  render: schema => <Rate {...schema.props} />,
  configForm: [
    { field: 'props.count', label: '星数', type: 'number', props: { min: 1, max: 10 } },
    { field: 'props.allowHalf', label: '半星', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'slider',
  title: '滑块',
  menu: 'main',
  icon: <SlidersOutlined />,
  defaultSchema: () => fieldSchema('slider', '滑块', { min: 0, max: 100 }),
  render: schema => <Slider {...schema.props} />,
  configForm: [
    { field: 'props.min', label: '最小值', type: 'number' },
    { field: 'props.max', label: '最大值', type: 'number' },
    { field: 'props.step', label: '步长', type: 'number', props: { min: 1 } },
    { field: 'props.range', label: '双滑块', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'color',
  title: '颜色选择',
  menu: 'main',
  icon: <BgColorsOutlined />,
  defaultSchema: () => fieldSchema('color', '颜色'),
  render: schema => <ColorPicker {...schema.props} />,
  configForm: [
    { field: 'props.showText', label: '显示色值', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'cascader',
  title: '级联选择',
  menu: 'main',
  icon: <ApartmentOutlined />,
  optionProp: 'options',
  defaultSchema: () => fieldSchema('cascader', '级联选择', {
    options: [
      { label: '选项1', value: '1', children: [{ label: '子选项1', value: '1-1' }] },
      { label: '选项2', value: '2' },
    ],
  }),
  render: schema => <Cascader style={{ width: '100%' }} {...schema.props} />,
  configForm: [
    { field: 'props.options', label: '选项（JSON）', type: 'json' },
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
    { field: 'props.showSearch', label: '可搜索', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'treeSelect',
  title: '树选择',
  menu: 'main',
  icon: <NodeIndexOutlined />,
  defaultSchema: () => fieldSchema('treeSelect', '树选择', {
    treeData: [
      { title: '节点1', value: '1', children: [{ title: '子节点1', value: '1-1' }] },
      { title: '节点2', value: '2' },
    ],
  }),
  render: schema => <TreeSelect style={{ width: '100%' }} {...schema.props} />,
  configForm: [
    { field: 'props.treeData', label: '树数据（JSON）', type: 'json' },
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
    { field: 'props.multiple', label: '多选', type: 'switch' },
    { field: 'props.treeCheckable', label: '勾选框', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'transfer',
  title: '穿梭框',
  menu: 'main',
  icon: <SwapOutlined />,
  defaultSchema: () => fieldSchema('transfer', '穿梭框', {
    dataSource: [
      { key: '1', title: '项目1' },
      { key: '2', title: '项目2' },
      { key: '3', title: '项目3' },
    ],
  }),
  render: (schema) => {
    const { value, onChange, dataSource, titles, ...rest } = schema.props
    return (
      <Transfer
        dataSource={dataSource}
        titles={titles}
        targetKeys={value ?? []}
        onChange={keys => onChange?.(keys)}
        render={item => item.title ?? ''}
        {...rest}
      />
    )
  },
  configForm: [
    { field: 'props.dataSource', label: '数据源（JSON）', type: 'json' },
    { field: 'props.titles', label: '标题（JSON，如 ["源","目标"]）', type: 'json' },
    { field: 'props.showSearch', label: '可搜索', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})
