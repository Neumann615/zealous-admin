import {
  ColumnWidthOutlined,
  CreditCardOutlined,
  FolderOutlined,
  LayoutOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
  SplitCellsOutlined,
  TableOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Card, Col, Collapse, Descriptions, Divider, Flex, Row, Space, Tabs } from 'antd'
import { shellStyleFromCol } from '../../renderer/colProps'
import { registerComponent } from '../registry'
import { bareSchema } from './helpers'

registerComponent({
  type: 'row',
  title: '栅格行',
  menu: 'layout',
  icon: <ColumnWidthOutlined />,
  isContainer: true,
  defaultSchema: () => bareSchema('row', { gutter: 16 }, [
    bareSchema('col', { span: 12 }, []),
    bareSchema('col', { span: 12 }, []),
  ]),
  render: (schema, children) => <Row {...schema.props}>{children}</Row>,
  configForm: [
    { field: 'props.gutter', label: '栅格间隔', type: 'number', props: { min: 0, max: 48 } },
  ],
})

registerComponent({
  type: 'col',
  title: '栅格列',
  menu: 'layout',
  icon: <LayoutOutlined />,
  isContainer: true,
  defaultSchema: () => bareSchema('col', { span: 12 }, []),
  render: (schema, children) => <Col {...schema.props}>{children}</Col>,
  // 画布中 Col 被 CanvasItem 外壳（.item）包裹，外壳才是 Row 的 flex item：
  // span 换算成外壳的 flex 尺寸（与字段级 col 共用同一份换算），Col 自身在画布内恒为 span:24 占满外壳
  canvasShellStyle: schema => shellStyleFromCol({ span: schema.props.span ?? 24 }),
  canvasRender: (schema, children) => {
    const { span, ...rest } = schema.props
    return <Col span={24} {...rest}>{children}</Col>
  },
  configForm: [
    { field: 'props.span', label: '宽度（1-24）', type: 'number', props: { min: 1, max: 24 } },
  ],
})

registerComponent({
  type: 'card',
  title: '卡片',
  menu: 'layout',
  icon: <CreditCardOutlined />,
  isContainer: true,
  defaultSchema: () => bareSchema('card', { title: '卡片标题', size: 'small' }, []),
  render: (schema, children) => <Card {...schema.props}>{children}</Card>,
  configForm: [
    { field: 'props.title', label: '标题', type: 'input' },
    {
      field: 'props.size',
      label: '尺寸',
      type: 'select',
      options: [
        { label: '默认', value: 'default' },
        { label: '小', value: 'small' },
      ],
    },
    // antd 6 中 bordered 已 deprecated，迁移为 variant
    {
      field: 'props.variant',
      label: '边框',
      type: 'select',
      options: [
        { label: '有边框', value: 'outlined' },
        { label: '无边框', value: 'borderless' },
      ],
    },
  ],
})

registerComponent({
  type: 'divider',
  title: '分割线',
  menu: 'layout',
  icon: <MenuUnfoldOutlined />,
  noFormItem: true,
  defaultSchema: () => bareSchema('divider', { text: '' }),
  render: (schema) => {
    // text 是自定义键，不能透传给 Divider（非法 DOM 属性）
    const { text, ...rest } = schema.props
    return <Divider {...rest}>{text || null}</Divider>
  },
  configForm: [
    { field: 'props.text', label: '文字', type: 'input' },
    { field: 'props.dashed', label: '虚线', type: 'switch' },
    // antd 6 的 orientation 语义已改为 horizontal/vertical，文字位置用 titlePlacement
    {
      field: 'props.titlePlacement',
      label: '文字位置',
      type: 'select',
      options: [
        { label: '左', value: 'left' },
        { label: '中', value: 'center' },
        { label: '右', value: 'right' },
      ],
    },
  ],
})

registerComponent({
  type: 'collapse',
  title: '折叠面板',
  menu: 'layout',
  icon: <FolderOutlined />,
  isContainer: true,
  defaultSchema: () => bareSchema('collapse', { panelTitle: '折叠面板' }, []),
  render: (schema, children) => {
    // panelTitle 是自定义键，其余 props（ghost 等）透传给 Collapse
    const { panelTitle, ...rest } = schema.props
    return (
      <Collapse
        {...rest}
        items={[{ key: '1', label: panelTitle || '折叠面板', children }]}
        defaultActiveKey={['1']}
      />
    )
  },
  configForm: [
    { field: 'props.panelTitle', label: '面板标题', type: 'input' },
    { field: 'props.ghost', label: '幽灵模式', type: 'switch' },
  ],
})

registerComponent({
  type: 'tabs',
  title: '标签页',
  menu: 'layout',
  icon: <ProfileOutlined />,
  isContainer: true,
  defaultSchema: () => bareSchema('tabs', { tabTitle: '标签页' }, []),
  render: (schema, children) => {
    // tabTitle 是自定义键，其余 props 透传给 Tabs
    const { tabTitle, ...rest } = schema.props
    return <Tabs {...rest} items={[{ key: '1', label: tabTitle || '标签页', children }]} />
  },
  configForm: [
    { field: 'props.tabTitle', label: '页签标题', type: 'input' },
  ],
})

registerComponent({
  type: 'space',
  title: '间距',
  menu: 'layout',
  icon: <SplitCellsOutlined />,
  isContainer: true,
  defaultSchema: () => bareSchema('space', { wrap: true }, []),
  render: (schema, children) => <Space {...schema.props}>{children}</Space>,
  configForm: [
    { field: 'props.wrap', label: '自动换行', type: 'switch' },
    {
      field: 'props.size',
      label: '间距',
      type: 'select',
      options: [
        { label: '小', value: 'small' },
        { label: '中', value: 'middle' },
        { label: '大', value: 'large' },
      ],
    },
  ],
})

registerComponent({
  type: 'flex',
  title: '弹性布局',
  menu: 'layout',
  icon: <TableOutlined />,
  isContainer: true,
  defaultSchema: () => bareSchema('flex', { gap: 'small', wrap: 'wrap' }, []),
  render: (schema, children) => <Flex {...schema.props}>{children}</Flex>,
  configForm: [
    { field: 'props.vertical', label: '垂直排列', type: 'switch' },
    {
      field: 'props.justify',
      label: '主轴对齐',
      type: 'select',
      options: [
        { label: '起点', value: 'flex-start' },
        { label: '居中', value: 'center' },
        { label: '两端', value: 'space-between' },
        { label: '终点', value: 'flex-end' },
      ],
    },
    {
      field: 'props.align',
      label: '交叉轴对齐',
      type: 'select',
      options: [
        { label: '起点', value: 'flex-start' },
        { label: '居中', value: 'center' },
        { label: '终点', value: 'flex-end' },
        { label: '拉伸', value: 'stretch' },
      ],
    },
  ],
})

registerComponent({
  type: 'descriptions',
  title: '描述列表',
  menu: 'layout',
  icon: <UnorderedListOutlined />,
  isContainer: true,
  defaultSchema: () => bareSchema('descriptions', { title: '描述列表', bordered: true, column: 2 }, []),
  render: (schema, children) => {
    // 运行时 children 是与 schema.children 顺序对齐的数组，按 items 一一映射；
    // 画布模式 children 是 CanvasItem 传入的单个 React 节点（含 DropGap），无法拆分到各 item，
    // 退化为单个 item 整体呈现——空态时落点在 item 内可插入，非空时 items 映射失真属计划约定的已知限制。
    const items = Array.isArray(children)
      ? (schema.children ?? []).map((c, i) => ({
          key: c.id,
          label: c.label || c.field || `字段${i + 1}`,
          children: children[i],
        }))
      : [{ key: 'canvas', children }]
    return (
      <Descriptions
        title={schema.props.title}
        bordered={schema.props.bordered}
        column={schema.props.column}
        items={items}
      />
    )
  },
  configForm: [
    { field: 'props.title', label: '标题', type: 'input' },
    { field: 'props.bordered', label: '边框', type: 'switch' },
    { field: 'props.column', label: '每行列数', type: 'number', props: { min: 1, max: 4 } },
  ],
})
