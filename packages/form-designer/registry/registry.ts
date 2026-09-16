import type { CSSProperties, ReactNode } from 'react'
import type { FieldSchema } from '../types/schema'

export type MenuGroup = 'main' | 'aide' | 'layout' | 'advanced' | 'subform'

/** 右侧属性面板单项配置 */
export interface ConfigMeta {
  /** 写入路径，如 'label'、'props.placeholder'、'formItem.tooltip' */
  field: string
  label: string
  type: 'input' | 'textarea' | 'number' | 'switch' | 'select' | 'options' | 'json'
  /** type 为 select 时的选项 */
  options?: { label: string, value: any }[]
  /** 透传给配置控件的额外 props */
  props?: Record<string, any>
}

/** 数组容器渲染上下文：由 ListField 用 Form.List 驱动 */
export interface ListRenderCtx {
  /** 当前各行（key 供 React 使用，name 为名路径索引） */
  rows: { key: number, name: number }[]
  /** 整行内容（卡片式数组用） */
  renderRow: (rowName: number) => ReactNode
  /** 行内单个子字段（表格式数组用：列由 schema.children 生成） */
  renderCell: (rowName: number, child: FieldSchema) => ReactNode
  add: () => void
  remove: (rowName: number) => void
}

export interface ComponentDef {
  type: string
  title: string
  menu: MenuGroup
  /** 左侧面板图标（antd 图标节点） */
  icon: ReactNode
  /** 容器类：通过 children 嵌套 */
  isContainer?: boolean
  /** 容器类：值绑定为嵌套对象（提交结构 { field: { 子字段… } }） */
  nestObject?: boolean
  /** 容器类：值绑定为数组（Form.List，提交结构 [{ 子字段… }]），需同时提供 renderList */
  nestList?: boolean
  /** 辅助类：无 field、不进 Form.Item 绑定 */
  noFormItem?: boolean
  /** Form.Item 额外属性，如开关的 valuePropName: 'checked' */
  formItemProps?: Record<string, any>
  /**
   * 选项类能力的声明：数据来源（`field.dataSource`）取数后写进哪个 props 键。
   * 目前只实现 `'options'`（下拉 / 单选 / 多选的选项列表），面板仅对 `optionProp === 'options'`
   * 的组件显示「数据来源」分组；`'treeData'`（treeSelect）/ `'dataSource'`（transfer）等树形数据
   * 尚未实现，不声明 = 组件不吃选项，面板不显示该分组。
   */
  optionProp?: 'options' | 'treeData' | 'dataSource'
  defaultSchema: () => FieldSchema
  /** children 为已渲染好的子节点（容器类使用） */
  render: (schema: FieldSchema, children?: ReactNode) => ReactNode
  /** 数组容器（nestList）的运行时渲染，渲染器负责 Form.List 与行名路径 */
  renderList?: (schema: FieldSchema, ctx: ListRenderCtx) => ReactNode
  /** 画布模式：CanvasItem 外壳需要镜像的布局样式（如 col 的 span 转 flex 尺寸） */
  canvasShellStyle?: (schema: FieldSchema) => CSSProperties
  /** 画布模式：替代 render 的渲染（如 col 在画布内渲染 span:24 占满外壳） */
  canvasRender?: (schema: FieldSchema, children?: ReactNode) => ReactNode
  configForm: ConfigMeta[]
}

const registry = new Map<string, ComponentDef>()

export function registerComponent(def: ComponentDef): void {
  registry.set(def.type, def)
}

export function getComponent(type: string): ComponentDef | undefined {
  return registry.get(type)
}

const GROUP_TITLES: Record<MenuGroup, string> = {
  main: '基础组件',
  aide: '辅助组件',
  layout: '布局组件',
  advanced: '高级组件',
  subform: '子表单',
}

export function getMenus(): { name: MenuGroup, title: string, list: ComponentDef[] }[] {
  const all = [...registry.values()]
  return (Object.keys(GROUP_TITLES) as MenuGroup[])
    .map(name => ({ name, title: GROUP_TITLES[name], list: all.filter(d => d.menu === name) }))
    .filter(g => g.list.length > 0)
}
