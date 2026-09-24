# 组件清单

内置 38 个组件，按左侧面板分为 5 组。所有组件都通过 `registerComponent(def)` 声明式注册，设计器画布与运行时渲染读的是同一份声明——新增一个组件只需写一个 `ComponentDef`，面板分组、拖拽、配置面板、渲染全部自动跟上。

「值绑定」列的含义：

- **字段** — 挂在 `Form.Item` 上，提交时以 `field` 为 key
- **容器** — 只做布局，子字段各自绑定，提交结构扁平
- **对象** — `nestObject`，子字段收进 `{ [field]: { … } }`
- **数组** — `nestList`，由 `Form.List` 驱动，提交结构 `{ [field]: [{ … }] }`
- **无** — `noFormItem`，纯展示，不参与提交

## 基础组件（main，17 个）

| type | 名称 | 值绑定 | 常用配置 |
|------|------|--------|----------|
| `input` | 输入框 | 字段 | 占位提示、最大长度、可清空、显示字数 |
| `textarea` | 文本域 | 字段 | 占位提示、行数、最大长度、显示字数 |
| `password` | 密码框 | 字段 | 占位提示 |
| `number` | 数字输入 | 字段 | 最小/最大值、步长、小数位 |
| `select` | 下拉选择 | 字段 | 选项、模式（多选/标签）、可搜索、可清空 |
| `radio` | 单选框组 | 字段 | 选项、按钮样式（optionType） |
| `checkbox` | 多选框组 | 字段 | 选项 |
| `switch` | 开关 | 字段 | 开启/关闭文案（`valuePropName: checked`） |
| `rate` | 评分 | 字段 | 星数、半星 |
| `slider` | 滑块 | 字段 | 最小/最大值、步长、双滑块 |
| `color` | 颜色选择 | 字段 | 显示色值 |
| `cascader` | 级联选择 | 字段 | 选项（JSON）、可搜索 |
| `treeSelect` | 树选择 | 字段 | 树数据（JSON）、可搜索、多选 |
| `transfer` | 穿梭框 | 字段 | 数据源（JSON）、可搜索、标题 |
| `date` | 日期选择 | 字段 | 格式、带时间 |
| `dateRange` | 日期范围 | 字段 | 格式、带时间 |
| `time` | 时间选择 | 字段 | 格式 |

## 辅助组件（aide，5 个）

| type | 名称 | 值绑定 | 常用配置 |
|------|------|--------|----------|
| `text` | 文本 | 无 | 内容、类型、加粗、删除线 |
| `paragraph` | 段落 | 无 | 内容、类型 |
| `alert` | 提示块 | 无 | 标题、描述、类型、显示图标、可关闭 |
| `button` | 按钮 | 无 | 文字、类型、危险态、撑满一行 |
| `link` | 链接 | 无 | 文字、地址、打开方式 |

## 布局组件（layout，9 个）

| type | 名称 | 值绑定 | 常用配置 |
|------|------|--------|----------|
| `row` | 栅格行 | 容器 | 栅格间隔（gutter） |
| `col` | 栅格列 | 容器 | 宽度 span（1-24） |
| `card` | 卡片 | 容器 | 标题、尺寸、边框形态 |
| `divider` | 分割线 | 无 | 文字、虚线、标题位置 |
| `collapse` | 折叠面板 | 容器 | 面板标题、幽灵模式 |
| `tabs` | 标签页 | 容器 | 页签标题 |
| `space` | 间距 | 容器 | 自动换行、间距尺寸 |
| `flex` | 弹性布局 | 容器 | 垂直排列、justify、align |
| `descriptions` | 描述列表 | 容器 | 标题、边框、每行列数 |

`col` 额外声明了 `canvasShellStyle`（把 span 换算成画布外壳的 flex 尺寸）与 `canvasRender`（画布内以 `span: 24` 撑满外壳），运行时才用真实 span——这是画布态与运行态渲染分离的典型用法。

`descriptions` 的子节点由父级渲染 item label，因此子字段的 `Form.Item` 不再重复输出 label。

## 高级组件（advanced，4 个）

| type | 名称 | 值绑定 | 提交值 | 常用配置 |
|------|------|--------|--------|----------|
| `upload` | 上传 | 字段 | antd `fileList` | 按钮文案、展示形态、多选、最大数量、文件类型 |
| `money` | 金额输入 | 字段 | `number` | 币种符号、小数位、千分位、最小/最大值 |
| `icon` | 图标选择器 | 字段 | 图标名字符串 | 占位提示、可清空 |
| `formula` | 计算字段 | 字段 | 只读数字 | 计算公式 |

实现要点：

- `upload` 通过 `formItemProps: { valuePropName: 'fileList', getValueFromEvent }` 让 `Upload` 受控；宿主可用 `registerFormFileTransport` 注入授权上传 / 下载实现，提交值收敛为 `objectId + 文件元数据`。`buttonText` 是自定义键，其余 props 透传给 antd `Upload`。
- `money` 基于 `InputNumber`，自定义键 `thousands` 换算成 `formatter` / `parser` 实现千分位。
- `icon` 直接复用 `@zealous-admin/components` 的 `ZaIconPicker`（value/onChange 受控，`Form.Item` 注入即可用）。
- `formula` 使用安全算术 DSL，不支持任意 JavaScript；表达式和运行结果见 [FieldSchema · `computed`](/form-designer/schema#fieldschema)。

## 子表单（subform，3 个）

| type | 名称 | 值绑定 | 常用配置 |
|------|------|--------|----------|
| `subForm` | 子表单 | 对象 | 卡片尺寸 |
| `tableForm` | 表格子表单 | 数组 | 添加按钮文案 |
| `stepForm` | 分步表单 | 容器 | 步骤标题 |

实现要点：

- `subForm` = `isContainer + nestObject`，运行时渲染 Card 外壳（标题取 `label`），内部子字段的名路径挂在自身 `field` 下。
- `tableForm` = `isContainer + nestList`。画布态走 `render`（卡片壳承载子字段与拖拽落点，因为设计期没有数据行）；运行时走 `renderList`，用 antd `Table` 行内编辑——列由 `schema.children` 生成（列头取子字段 label），底部「添加一行」，行尾「删除」。列头已呈现字段名，单元格的 `Form.Item` 不再输出 label。
- `stepForm` 是视觉容器：`Steps` 头 + 子字段内容区，数据结构扁平。与 `tabs` / `collapse` 的单页签简化保持一致，多步骤拆分留作后续配置增强。

## ComponentDef

```ts
interface ComponentDef {
  type: string
  title: string
  menu: MenuGroup // 'main' | 'aide' | 'layout' | 'advanced' | 'subform'
  /** 左侧面板图标（antd 图标节点） */
  icon: ReactNode
  /** 容器类：通过 children 嵌套 */
  isContainer?: boolean
  /** 容器类：值绑定为嵌套对象（提交 { field: { 子字段… } }） */
  nestObject?: boolean
  /** 容器类：值绑定为数组（Form.List，提交 [{ 子字段… }]），需同时提供 renderList */
  nestList?: boolean
  /** 辅助类：无 field、不进 Form.Item 绑定 */
  noFormItem?: boolean
  /** Form.Item 额外属性，如开关的 valuePropName: 'checked' */
  formItemProps?: Record<string, any>
  defaultSchema: () => FieldSchema
  /** children 为已渲染好的子节点（容器类使用） */
  render: (schema: FieldSchema, children?: ReactNode) => ReactNode
  /** 数组容器（nestList）的运行时渲染，渲染器负责 Form.List 与行名路径 */
  renderList?: (schema: FieldSchema, ctx: ListRenderCtx) => ReactNode
  /** 画布态：CanvasItem 外壳需要镜像的布局样式 */
  canvasShellStyle?: (schema: FieldSchema) => CSSProperties
  /** 画布态：替代 render 的渲染 */
  canvasRender?: (schema: FieldSchema, children?: ReactNode) => ReactNode
  configForm: ConfigMeta[]
}
```

`renderList` 的上下文由 `ListField` 用 `Form.List` 驱动：

```ts
interface ListRenderCtx {
  /** 当前各行（key 供 React 使用，name 为名路径索引） */
  rows: { key: number, name: number }[]
  /** 整行内容（卡片式数组用） */
  renderRow: (rowName: number) => ReactNode
  /** 行内单个子字段（表格式数组用：列由 schema.children 生成） */
  renderCell: (rowName: number, child: FieldSchema) => ReactNode
  add: () => void
  remove: (rowName: number) => void
}
```

## 注册自定义组件

在 `registry/components/` 下新建文件，`import` 即完成注册（记得在 `registry/components/index.ts` 追加一行 import）：

```tsx
import { HighlightOutlined } from '@ant-design/icons'
import { Input } from 'antd'
import { registerComponent } from '../registry'
import { fieldSchema } from './helpers'

registerComponent({
  type: 'phone',
  title: '手机号',
  menu: 'main',
  icon: <HighlightOutlined />,
  defaultSchema: () => fieldSchema('phone', '手机号', { placeholder: '请输入手机号' }),
  render: schema => <Input {...schema.props} maxLength={11} />,
  configForm: [
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})
```

外部扩展也可以在自己的入口调用 `registerComponent`——注册表是一个模块级 `Map`，同 `type` 后注册覆盖先注册。

### 默认 schema 辅助函数

| 函数 | 用途 |
|------|------|
| `fieldSchema(type, label, props)` | 值绑定字段，自动生成 `id` 与 `field` |
| `bareSchema(type, props, children)` | 布局容器 / 辅助组件，无 `field` |
| `groupSchema(type, label, props, children)` | 值绑定容器（`nestObject` / `nestList`），带 `field` 与子字段 |

## 配置面板 meta

`configForm` 里每一项是一个 `ConfigMeta`，`field` 支持点分路径（如 `props.placeholder`、`formItem.tooltip`）：

```ts
interface ConfigMeta {
  field: string
  label: string
  type: 'input' | 'textarea' | 'number' | 'switch' | 'select' | 'options' | 'json'
  /** type 为 select 时的选项 */
  options?: { label: string, value: any }[]
  /** 透传给配置控件的额外 props */
  props?: Record<string, any>
}
```

| type | 控件 | 备注 |
|------|------|------|
| `input` / `textarea` | 文本框 | 连续输入合并为一条撤销历史 |
| `number` | 数字输入 | — |
| `switch` | 开关 | — |
| `select` | 下拉 | 需配 `options`，支持清空 |
| `options` | 选项列表编辑器 | 用于 select / radio / checkbox 的 label-value 列表 |
| `json` | JSON 文本域 | 失焦时解析，非法 JSON 标红且不写回 |

## 相关文档

- [Schema 结构与名路径](/form-designer/schema)
- [设计器与渲染器](/form-designer/designer)
