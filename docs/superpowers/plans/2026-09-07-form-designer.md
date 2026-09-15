# FormDesigner（React + antd 6 表单设计器）P1–P4 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**状态：** T1–T12（P1–P4）已于 2026-09-07 全部实现并提交（`9379e01`→`7b85b3e`），复选框于 2026-09-11 统一回填。后续 P5（高级组件 + 子表单）见 `docs/superpowers/plans/2026-09-10-form-designer-p5.md`，实现偏差汇总见规格 `docs/superpowers/specs/2026-09-07-form-designer-design.md` §12。
**目标：** 在 zealous-admin 中新建 `packages/form-designer` 包，实现三栏可视化表单设计器（注册表 + 单一渲染器），并完成后端存取与演示页闭环。

**架构：** 声明式组件注册表（每个组件一个定义：defaultSchema + render + configForm）；Zustand 管理 schema 树与撤销重做快照；`@dnd-kit/react` 拖拽（间隙落点 DropGap 方案）；渲染器 `FormRenderer` 同时服务画布、预览与业务运行时。

**技术栈：** React 19 + antd 6 + antd-style + Zustand + `@dnd-kit/react@0.5.0`（运行时零新增依赖）；Vitest（devDependency，纯逻辑单测）。

**与规格的偏差说明：**
- 项目原无 Vitest 设施 → 新增 devDependency `vitest`（仅开发依赖），`utils/` 与 `designer/store.ts` 的纯逻辑走 TDD；UI 交互仍为 `pnpm lint` + 分阶段手动验收。
- CLAUDE.md 称后端为 Hono + Drizzle + MySQL，**实际现状是 Express + node:sqlite**（`service/src/db/index.ts`，`za_*` 表，路由在 `service/src/routes/`）。本计划按现状编写。
- 菜单由后端 `za_menu` 表 + `za_role_menu_relation` 角色绑定驱动，需随 P4 做幂等迁移插入。
- 设计/渲染页通过 query 参数（`/form/design?id=1`）而非动态路由段传 id，避免引入动态路由配置。

---

## 全局约定（所有任务共用）

**包导入路径：** 代码中通过 alias 引用：`@zealous-admin/form-designer/index`。包内相对导入不带扩展名以外的后缀（与 packages/components 一致，用 `.ts`/`.tsx` 相对路径）。

**ConfigMeta.type 取值：** `'input' | 'textarea' | 'number' | 'switch' | 'select' | 'options' | 'json'`。

**MenuGroup 取值：** `'main'`（基础组件）| `'aide'`（辅助组件）| `'layout'`（布局组件）。

**提交规范：** 遵循仓库现有 Conventional Commits 中文风格（如 `feat: xxx`）。

---

## 文件结构总览

```
packages/form-designer/
  package.json                      # T1
  index.ts                          # T1（随任务逐步补导出）
  types/schema.ts                   # T1
  utils/uniqueId.ts                 # T1
  utils/schemaTree.ts               # T1
  utils/path.ts                     # T1
  registry/registry.ts              # T2
  registry/components/index.ts      # T8 汇总（T8/T9/T10 修改）
  registry/components/basicInput.tsx    # T8
  registry/components/selectFamily.tsx  # T8
  registry/components/dateTime.tsx      # T8
  registry/components/choice.tsx        # T8
  registry/components/aide.tsx          # T9
  registry/components/layout.tsx        # T10
  renderer/renderField.tsx          # T2
  renderer/FormRenderer.tsx         # T2
  designer/store.ts                 # T3
  designer/FormDesigner.tsx         # T4
  designer/Toolbar.tsx              # T4
  designer/LeftPanel.tsx            # T5
  designer/Canvas.tsx               # T6
  designer/CanvasItem.tsx           # T6
  designer/DropGap.tsx              # T6
  designer/RightPanel.tsx           # T7
  designer/ConfigFormRenderer.tsx   # T7
  designer/OptionsEditor.tsx        # T7
  designer/ValidateEditor.tsx       # T7
service/src/db/index.ts             # T11（修改：za_form 表 + 菜单迁移）
service/src/routes/form.ts          # T11
service/src/app.ts                  # T11（修改：注册路由）
src/apis/form.ts                    # T12
src/pages/index/form/list.tsx       # T12
src/pages/index/form/design.tsx     # T12
src/pages/index/form/render.tsx     # T12
```

---

## 任务 1：包骨架 + Schema 类型 + 工具函数（TDD）

**文件：**
- 创建：`packages/form-designer/package.json`
- 创建：`packages/form-designer/index.ts`
- 创建：`packages/form-designer/types/schema.ts`
- 创建：`packages/form-designer/utils/uniqueId.ts`
- 创建：`packages/form-designer/utils/schemaTree.ts`
- 创建：`packages/form-designer/utils/path.ts`
- 测试：`packages/form-designer/utils/schemaTree.test.ts`
- 测试：`packages/form-designer/utils/path.test.ts`
- 修改：根 `package.json`（加 `test` 脚本）

- [x] **步骤 0：安装 Vitest（仅开发依赖）**

```bash
pnpm add -Dw vitest
```

根 `package.json` scripts 加入：

```json
"test": "vitest run"
```

- [x] **步骤 1：创建 package.json**

```json
{
  "name": "@zealous-admin/form-designer",
  "type": "module",
  "version": "0.1.0",
  "license": "MIT",
  "exports": {
    ".": {
      "types": "./index.ts",
      "import": "./index.ts"
    }
  },
  "peerDependencies": {
    "@dnd-kit/react": "catalog:",
    "antd": "catalog:",
    "antd-style": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "zustand": "catalog:"
  }
}
```

- [x] **步骤 2：创建 types/schema.ts**

```ts
/** 表单全局配置，直接透传给 antd Form */
export interface FormGlobalConfig {
  layout?: 'horizontal' | 'vertical' | 'inline'
  labelAlign?: 'left' | 'right'
  size?: 'large' | 'middle' | 'small'
  colon?: boolean
  disabled?: boolean
}

/** 可序列化的校验规则（渲染时转换为 antd Rule） */
export interface ValidateRule {
  type: 'required' | 'email' | 'url' | 'number' | 'regexp'
  message?: string
  /** 仅 type 为 regexp 时使用 */
  pattern?: string
}

export interface FieldSchema {
  /** 唯一 id，拖拽/选中主键 */
  id: string
  /** 组件类型，对应注册表 type */
  type: string
  /** 表单字段名，提交数据的 key；容器/辅助组件可为空 */
  field?: string
  label?: string
  /** 直接透传给 antd 组件的 props */
  props: Record<string, any>
  /** Form.Item 层面配置 */
  formItem?: {
    rules?: ValidateRule[]
    tooltip?: string
    extra?: string
    hidden?: boolean
  }
  /** 容器类子节点 */
  children?: FieldSchema[]
}

export interface FormSchema {
  version: 1
  form: FormGlobalConfig
  children: FieldSchema[]
}

export function createEmptySchema(): FormSchema {
  return {
    version: 1,
    form: { layout: 'horizontal', labelAlign: 'right', size: 'middle', colon: true },
    children: [],
  }
}
```

- [x] **步骤 3：创建 utils/uniqueId.ts**

```ts
let seq = 0

/** 生成短唯一 id，用于字段 id 与 field 名 */
export function uniqueId(prefix = 'f'): string {
  seq = (seq + 1) % 1296
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`
}
```

- [x] **步骤 4：创建 utils/schemaTree.ts**

```ts
import type { FieldSchema, FormSchema } from '../types/schema'

export interface LocatedNode {
  node: FieldSchema
  parentChildren: FieldSchema[]
  index: number
}

/** 在字段树中按 id 查找节点（深度优先） */
export function findNode(children: FieldSchema[], id: string): LocatedNode | null {
  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.id === id)
      return { node, parentChildren: children, index: i }
    if (node.children) {
      const found = findNode(node.children, id)
      if (found)
        return found
    }
  }
  return null
}

/**
 * 取指定父节点的 children 数组。
 * parentId 为 null 时表示根；目标节点没有 children 时初始化为空数组。
 */
export function childrenOf(schema: FormSchema, parentId: string | null): FieldSchema[] | null {
  if (parentId === null)
    return schema.children
  const located = findNode(schema.children, parentId)
  if (!located)
    return null
  if (!located.node.children)
    located.node.children = []
  return located.node.children
}

/** 从树中摘除节点，返回被摘除的节点 */
export function removeNode(schema: FormSchema, id: string): FieldSchema | null {
  const located = findNode(schema.children, id)
  if (!located)
    return null
  located.parentChildren.splice(located.index, 1)
  return located.node
}

/** 深拷贝节点并为整棵子树重新生成 id 与 field（用于复制） */
export function cloneNode(node: FieldSchema, genId: () => string): FieldSchema {
  const copy: FieldSchema = JSON.parse(JSON.stringify(node))
  const walk = (n: FieldSchema) => {
    n.id = genId()
    if (n.field)
      n.field = genId()
    n.children?.forEach(walk)
  }
  walk(copy)
  return copy
}

/** 判断 maybeDescendantId 是否在 node 的子树内（防止容器拖入自身） */
export function isDescendant(node: FieldSchema, maybeDescendantId: string): boolean {
  if (!node.children)
    return false
  return node.children.some(
    c => c.id === maybeDescendantId || isDescendant(c, maybeDescendantId),
  )
}
```

- [x] **步骤 5：创建 utils/path.ts**

```ts
/** 按点分路径读取，如 'props.placeholder' / 'formItem.tooltip' / 'label' */
export function getByPath(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj as any)
}

/** 按点分路径写入（原地修改，调用方负责先克隆） */
export function setByPath(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.')
  let target = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof target[keys[i]] !== 'object' || target[keys[i]] === null)
      target[keys[i]] = {}
    target = target[keys[i]]
  }
  target[keys[keys.length - 1]] = value
}
```

- [x] **步骤 5b：创建 utils/schemaTree.test.ts**

```ts
import type { FieldSchema, FormSchema } from '../types/schema'
import { describe, expect, it } from 'vitest'
import { createEmptySchema } from '../types/schema'
import { childrenOf, cloneNode, findNode, isDescendant, removeNode } from './schemaTree'

function makeTree(): FormSchema {
  const schema = createEmptySchema()
  schema.children = [
    { id: 'a', type: 'input', field: 'fa', label: 'A', props: {} },
    {
      id: 'row', type: 'row', props: {},
      children: [
        { id: 'b', type: 'input', field: 'fb', label: 'B', props: {} },
        { id: 'c', type: 'input', field: 'fc', label: 'C', props: {} },
      ],
    },
  ]
  return schema
}

describe('findNode', () => {
  it('能找到根层节点并给出父列表与下标', () => {
    const schema = makeTree()
    const located = findNode(schema.children, 'a')
    expect(located?.node.id).toBe('a')
    expect(located?.index).toBe(0)
    expect(located?.parentChildren).toBe(schema.children)
  })

  it('能找到嵌套节点', () => {
    const schema = makeTree()
    const located = findNode(schema.children, 'c')
    expect(located?.node.id).toBe('c')
    expect(located?.index).toBe(1)
    expect(located?.parentChildren.map(n => n.id)).toEqual(['b', 'c'])
  })

  it('找不到时返回 null', () => {
    expect(findNode(makeTree().children, 'zzz')).toBeNull()
  })
})

describe('childrenOf', () => {
  it('parentId 为 null 时返回根 children', () => {
    const schema = makeTree()
    expect(childrenOf(schema, null)).toBe(schema.children)
  })

  it('容器无 children 时初始化为空数组', () => {
    const schema = makeTree()
    schema.children.push({ id: 'card', type: 'card', props: {} })
    const list = childrenOf(schema, 'card')
    expect(list).toEqual([])
  })
})

describe('removeNode', () => {
  it('摘除嵌套节点并返回该节点', () => {
    const schema = makeTree()
    const removed = removeNode(schema, 'b')
    expect(removed?.id).toBe('b')
    expect(findNode(schema.children, 'row')?.node.children?.map(n => n.id)).toEqual(['c'])
  })
})

describe('cloneNode', () => {
  it('深拷贝并为整棵子树生成新 id/field', () => {
    const schema = makeTree()
    const row = findNode(schema.children, 'row')!.node
    let seq = 0
    const copy = cloneNode(row, () => `new${seq++}`)
    expect(copy.id).toBe('new0')
    expect(copy.children!.map(c => c.id)).toEqual(['new1', 'new2'])
    expect(copy.children!.map(c => c.field)).toEqual(['new1', 'new2'])
    // 原节点不受影响
    expect(row.id).toBe('row')
  })
})

describe('isDescendant', () => {
  it('识别子树内节点', () => {
    const schema = makeTree()
    const row = findNode(schema.children, 'row')!.node
    expect(isDescendant(row, 'c')).toBe(true)
    expect(isDescendant(row, 'a')).toBe(false)
    expect(isDescendant(row, 'row')).toBe(false)
  })
})
```

- [x] **步骤 5c：创建 utils/path.test.ts**

```ts
import { describe, expect, it } from 'vitest'
import { getByPath, setByPath } from './path'

describe('getByPath', () => {
  it('按点分路径读取', () => {
    const obj = { props: { placeholder: 'x' }, label: 'y' }
    expect(getByPath(obj, 'props.placeholder')).toBe('x')
    expect(getByPath(obj, 'label')).toBe('y')
    expect(getByPath(obj, 'props.missing.deep')).toBeUndefined()
  })
})

describe('setByPath', () => {
  it('按点分路径写入，自动创建中间对象', () => {
    const obj: Record<string, any> = {}
    setByPath(obj, 'formItem.tooltip', '提示')
    expect(obj).toEqual({ formItem: { tooltip: '提示' } })
  })

  it('覆盖已有值', () => {
    const obj = { props: { maxLength: 10 } }
    setByPath(obj, 'props.maxLength', 20)
    expect(obj.props.maxLength).toBe(20)
  })
})
```

- [x] **步骤 5d：运行测试确认通过**

运行：`pnpm test`
预期：2 个测试文件全部 PASS（实现已在步骤 2–5 给出；若 FAIL 先修实现再往下走）

- [x] **步骤 6：创建 index.ts（初始导出，后续任务追加）**

```ts
export { FormRenderer } from './renderer/FormRenderer'
export { FormDesigner } from './designer/FormDesigner'
export { registerComponent, getComponent, getMenus } from './registry/registry'
export type { ComponentDef, ConfigMeta, MenuGroup } from './registry/registry'
export type { FieldSchema, FormSchema, ValidateRule } from './types/schema'
export { createEmptySchema } from './types/schema'
```

- [x] **步骤 7：验证**

运行：`pnpm lint -- packages/form-designer`（或 `pnpm lint`，确认无新增错误；此时 FormRenderer/FormDesigner/registry 尚未创建，index.ts 中的导出会报模块不存在——**属预期，任务 2 完成后消失**）

- [x] **步骤 8：Commit**

```bash
git add packages/form-designer
git commit -m "feat: form-designer 包骨架、schema 类型与树操作工具"
```

---

## 任务 2：组件注册表 + 渲染器

**文件：**
- 创建：`packages/form-designer/registry/registry.ts`
- 创建：`packages/form-designer/registry/components/index.ts`
- 创建：`packages/form-designer/renderer/renderField.tsx`
- 创建：`packages/form-designer/renderer/FormRenderer.tsx`

- [x] **步骤 1：创建 registry/registry.ts**

```tsx
import type { ReactNode } from 'react'
import type { FieldSchema } from '../types/schema'

export type MenuGroup = 'main' | 'aide' | 'layout'

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

export interface ComponentDef {
  type: string
  title: string
  menu: MenuGroup
  /** 左侧面板图标（antd 图标节点） */
  icon: ReactNode
  /** 容器类：通过 children 嵌套 */
  isContainer?: boolean
  /** 辅助类：无 field、不进 Form.Item 绑定 */
  noFormItem?: boolean
  /** Form.Item 额外属性，如开关的 valuePropName: 'checked' */
  formItemProps?: Record<string, any>
  defaultSchema: () => FieldSchema
  /** children 为已渲染好的子节点（容器类使用） */
  render: (schema: FieldSchema, children?: ReactNode) => ReactNode
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
}

export function getMenus(): { name: MenuGroup, title: string, list: ComponentDef[] }[] {
  const all = [...registry.values()]
  return (Object.keys(GROUP_TITLES) as MenuGroup[])
    .map(name => ({ name, title: GROUP_TITLES[name], list: all.filter(d => d.menu === name) }))
    .filter(g => g.list.length > 0)
}
```

- [x] **步骤 2：创建 renderer/renderField.tsx**

```tsx
import type { Rule } from 'antd/es/form'
import type { FieldSchema, ValidateRule } from '../types/schema'
import type { ReactNode } from 'react'
import { Alert, Form } from 'antd'
import { getComponent } from '../registry/registry'

function toAntdRules(schema: FieldSchema): Rule[] {
  const rules = schema.formItem?.rules ?? []
  return rules.map((r: ValidateRule): Rule => {
    const label = schema.label || '该字段'
    switch (r.type) {
      case 'required':
        return { required: true, message: r.message || `${label}不能为空` }
      case 'regexp':
        return { pattern: new RegExp(r.pattern || ''), message: r.message || `${label}格式不正确` }
      default:
        return { type: r.type as 'email' | 'url' | 'number', message: r.message || `${label}格式不正确` }
    }
  })
}

/**
 * 渲染单个字段。容器类通过 renderChild 递归子节点，
 * 设计器画布与运行时共用此入口。
 */
export function renderField(
  schema: FieldSchema,
  renderChild: (child: FieldSchema) => ReactNode,
): ReactNode {
  const def = getComponent(schema.type)
  if (!def)
    return <Alert type="warning" showIcon message={`未注册的组件类型：${schema.type}`} />

  if (def.isContainer)
    return def.render(schema, (schema.children ?? []).map(c => renderChild(c)))

  const control = def.render(schema)
  if (def.noFormItem)
    return control

  return (
    <Form.Item
      name={schema.field}
      label={schema.label}
      rules={toAntdRules(schema)}
      tooltip={schema.formItem?.tooltip}
      extra={schema.formItem?.extra}
      hidden={schema.formItem?.hidden}
      {...def.formItemProps}
    >
      {control}
    </Form.Item>
  )
}
```

- [x] **步骤 3：创建 renderer/FormRenderer.tsx**

```tsx
import type { FormSchema } from '../types/schema'
import { Button, Form, Space } from 'antd'
import { Fragment } from 'react'
import { renderField } from './renderField'
import './registry' // 见步骤 4

export interface FormRendererProps {
  schema: FormSchema
  initialValues?: Record<string, any>
  onSubmit?: (values: Record<string, any>) => void
  /** 是否显示提交/重置按钮，业务页面可自行接管提交 */
  showActions?: boolean
}

export function FormRenderer({ schema, initialValues, onSubmit, showActions = true }: FormRendererProps) {
  const [form] = Form.useForm()

  const renderChild = (child: (typeof schema.children)[number]) => (
    <Fragment key={child.id}>{renderField(child, renderChild)}</Fragment>
  )

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={onSubmit}
      {...schema.form}
    >
      {schema.children.map(renderChild)}
      {showActions && (
        <Form.Item wrapperCol={schema.form.layout === 'horizontal' ? { offset: 4 } : undefined}>
          <Space>
            <Button type="primary" htmlType="submit">提交</Button>
            <Button onClick={() => form.resetFields()}>重置</Button>
          </Space>
        </Form.Item>
      )}
    </Form>
  )
}
```

- [x] **步骤 4：创建 registry/components/index.ts（组件注册汇总，暂为空壳，T8–T10 填充）**

```ts
// 各组件文件在 import 时完成 registerComponent
import './basicInput'
import './selectFamily'
import './dateTime'
import './choice'
import './aide'
import './layout'
```

并修正 `renderer/FormRenderer.tsx` 步骤 3 中的 `import './registry'` 为：

```tsx
import '../registry/components'
```

同时 `designer` 侧也需要注册——在 `renderer/renderField.tsx` 顶部加一行：

```tsx
import '../registry/components'
```

（注册放 import 副作用里，保证任何用到渲染/设计器的入口组件都已注册。）

- [x] **步骤 5：验证**

运行：`pnpm lint -- packages/form-designer`。此时 `registry/components/*` 具体文件尚未创建，import 报错属预期，T8 后消失。`tsc` 层面确认已建文件无类型错误（在 `packages/form-designer` 下 `npx tsc --noEmit --jsx react-jsx --module esnext --moduleResolution bundler --target es2022 types/schema.ts utils/*.ts registry/registry.ts`，预期无输出）。

- [x] **步骤 6：Commit**

```bash
git add packages/form-designer
git commit -m "feat: 组件注册表与 FormRenderer 渲染器"
```

---

## 任务 3：设计器状态 store（schema 树 + 撤销重做，TDD）

**文件：**
- 创建：`packages/form-designer/designer/store.ts`
- 测试：`packages/form-designer/designer/store.test.ts`

- [x] **步骤 1：创建 designer/store.ts**

```ts
import type { FieldSchema, FormSchema } from '../types/schema'
import { create } from 'zustand'
import { getComponent } from '../registry/registry'
import { createEmptySchema } from '../types/schema'
import { getByPath, setByPath } from '../utils/path'
import { childrenOf, cloneNode, findNode, isDescendant, removeNode } from '../utils/schemaTree'
import { uniqueId } from '../utils/uniqueId'

/** 拖拽落点：插入到 parentId 的 children 的 index 处 */
export interface DropTarget {
  parentId: string | null
  index: number
}

const HISTORY_LIMIT = 50

interface DesignerState {
  schema: FormSchema
  selectedId: string | null
  past: FormSchema[]
  future: FormSchema[]
  select: (id: string | null) => void
  addField: (type: string, target: DropTarget) => void
  moveField: (id: string, target: DropTarget) => void
  removeField: (id: string) => void
  duplicateField: (id: string) => void
  /** 按点分路径更新字段属性，如 updateField(id, 'props.placeholder', '请输入') */
  updateField: (id: string, path: string, value: any) => void
  updateFormConfig: (patch: Partial<FormSchema['form']>) => void
  undo: () => void
  redo: () => void
  clear: () => void
  importSchema: (json: string) => boolean
  exportSchema: () => string
  setSchema: (schema: FormSchema) => void
  getSelected: () => FieldSchema | null
}

function clone(schema: FormSchema): FormSchema {
  return JSON.parse(JSON.stringify(schema))
}

export const useDesignerStore = create<DesignerState>((set, get) => {
  /** 所有结构/属性变更走此入口：深拷贝 → 变更 → 推历史 */
  const mutate = (fn: (draft: FormSchema) => void) => {
    const { schema, past } = get()
    const draft = clone(schema)
    fn(draft)
    set({
      schema: draft,
      past: [...past.slice(-(HISTORY_LIMIT - 1)), schema],
      future: [],
    })
  }

  return {
    schema: createEmptySchema(),
    selectedId: null,
    past: [],
    future: [],

    select: id => set({ selectedId: id }),

    addField: (type, target) => {
      const def = getComponent(type)
      if (!def)
        return
      mutate((draft) => {
        const list = childrenOf(draft, target.parentId)
        if (!list)
          return
        const node = def.defaultSchema()
        node.id = uniqueId()
        if (node.field)
          node.field = uniqueId()
        list.splice(Math.min(target.index, list.length), 0, node)
        set({ selectedId: node.id })
      })
    },

    moveField: (id, target) => {
      if (target.parentId === id)
        return // 不能拖入自身
      const located = findNode(get().schema.children, id)
      if (!located)
        return
      if (target.parentId && isDescendant(located.node, target.parentId))
        return // 不能拖入自身子树
      mutate((draft) => {
        const node = removeNode(draft, id)
        if (!node)
          return
        const list = childrenOf(draft, target.parentId)
        if (!list)
          return
        // 同列表内向后移动时，摘除后目标下标前移一位
        const sameList = located.parentChildren === list
        const index = sameList && located.index < target.index ? target.index - 1 : target.index
        list.splice(Math.min(index, list.length), 0, node)
      })
    },

    removeField: (id) => {
      mutate(draft => void removeNode(draft, id))
      if (get().selectedId === id)
        set({ selectedId: null })
    },

    duplicateField: (id) => {
      mutate((draft) => {
        const located = findNode(draft.children, id)
        if (!located)
          return
        const copy = cloneNode(located.node, uniqueId)
        located.parentChildren.splice(located.index + 1, 0, copy)
      })
    },

    updateField: (id, path, value) => {
      mutate((draft) => {
        const located = findNode(draft.children, id)
        if (located)
          setByPath(located.node as unknown as Record<string, any>, path, value)
      })
    },

    updateFormConfig: patch => mutate(draft => Object.assign(draft.form, patch)),

    undo: () => {
      const { past, schema, future } = get()
      if (!past.length)
        return
      set({
        schema: past[past.length - 1],
        past: past.slice(0, -1),
        future: [schema, ...future],
        selectedId: null,
      })
    },

    redo: () => {
      const { past, schema, future } = get()
      if (!future.length)
        return
      set({
        schema: future[0],
        past: [...past, schema],
        future: future.slice(1),
        selectedId: null,
      })
    },

    clear: () => mutate(draft => void (draft.children = [])),

    importSchema: (json) => {
      try {
        const parsed = JSON.parse(json)
        if (parsed?.version !== 1 || !Array.isArray(parsed.children))
          return false
        mutate(draft => void Object.assign(draft, parsed))
        set({ selectedId: null })
        return true
      }
      catch {
        return false
      }
    },

    exportSchema: () => JSON.stringify(get().schema, null, 2),

    setSchema: schema => set({ schema, selectedId: null, past: [], future: [] }),

    getSelected: () => {
      const { schema, selectedId } = get()
      if (!selectedId)
        return null
      return findNode(schema.children, selectedId)?.node ?? null
    },
  }
})

export { getByPath }
```

- [x] **步骤 2：验证**

运行：`npx tsc --noEmit --jsx react-jsx --module esnext --moduleResolution bundler --target es2022 packages/form-designer/designer/store.ts`（工作目录仓库根），预期无输出。注意：`moveField` 中 `sameList` 比较依赖 `childrenOf` 返回的引用与 `findNode` 时一致——`mutate` 内先 `removeNode(draft)` 后 `childrenOf(draft)` 均作用于同一 draft，引用比较成立；但 `located` 取自旧 schema，`located.parentChildren === list` 永远为 false。**修正**：sameList 判断改为比较父 id：

```ts
// moveField 内 mutate 之前补充：
const oldParentChildren = located.parentChildren
// mutate 内：
const list = childrenOf(draft, target.parentId)
if (!list) return
// 通过 id 是否曾相邻判断同一列表：摘除前记录目标列表长度
```

**最终采用实现（替换上面 moveField 的 mutate 部分，以此为准）：**

```ts
    moveField: (id, target) => {
      if (target.parentId === id)
        return
      const located = findNode(get().schema.children, id)
      if (!located)
        return
      if (target.parentId && isDescendant(located.node, target.parentId))
        return
      // 同列表时记录摘除前的相对位置
      const targetList = childrenOf(get().schema, target.parentId)
      const sameList = targetList === located.parentChildren
      mutate((draft) => {
        const node = removeNode(draft, id)
        if (!node)
          return
        const list = childrenOf(draft, target.parentId)
        if (!list)
          return
        const index = sameList && located.index < target.index ? target.index - 1 : target.index
        list.splice(Math.min(index, list.length), 0, node)
      })
    },
```

- [x] **步骤 2b：创建 designer/store.test.ts**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { registerComponent } from '../registry/registry'
import { createEmptySchema } from '../types/schema'
import { useDesignerStore } from './store'

// 注册测试用组件
registerComponent({
  type: 'input',
  title: '输入框',
  menu: 'main',
  icon: null,
  defaultSchema: () => ({ id: 'x', type: 'input', field: 'fx', label: '输入框', props: {} }),
  render: () => null,
  configForm: [],
})
registerComponent({
  type: 'card',
  title: '卡片',
  menu: 'layout',
  icon: null,
  isContainer: true,
  defaultSchema: () => ({ id: 'x', type: 'card', props: {}, children: [] }),
  render: () => null,
  configForm: [],
})

function reset() {
  useDesignerStore.setState({
    schema: createEmptySchema(),
    selectedId: null,
    past: [],
    future: [],
  })
}

const store = () => useDesignerStore.getState()

describe('designer store', () => {
  beforeEach(reset)

  it('addField 向根列表插入字段并选中', () => {
    store().addField('input', { parentId: null, index: 0 })
    expect(store().schema.children).toHaveLength(1)
    expect(store().schema.children[0].type).toBe('input')
    expect(store().schema.children[0].id).not.toBe('x') // 重新生成
    expect(store().schema.children[0].field).not.toBe('fx')
    expect(store().selectedId).toBe(store().schema.children[0].id)
  })

  it('addField 向容器内插入', () => {
    store().addField('card', { parentId: null, index: 0 })
    const cardId = store().schema.children[0].id
    store().addField('input', { parentId: cardId, index: 0 })
    expect(store().schema.children[0].children).toHaveLength(1)
  })

  it('moveField 同列表排序（移到后方时下标修正）', () => {
    store().addField('input', { parentId: null, index: 0 })
    store().addField('input', { parentId: null, index: 1 })
    store().addField('input', { parentId: null, index: 2 })
    const [a, b, c] = store().schema.children.map(n => n.id)
    store().moveField(a, { parentId: null, index: 3 }) // a 移到末尾
    expect(store().schema.children.map(n => n.id)).toEqual([b, c, a])
  })

  it('moveField 拒绝拖入自身子树', () => {
    store().addField('card', { parentId: null, index: 0 })
    const cardId = store().schema.children[0].id
    store().addField('card', { parentId: cardId, index: 0 })
    const innerId = store().schema.children[0].children![0].id
    store().moveField(cardId, { parentId: innerId, index: 0 })
    expect(store().schema.children[0].id).toBe(cardId) // 未变化
  })

  it('removeField / duplicateField', () => {
    store().addField('input', { parentId: null, index: 0 })
    const id = store().schema.children[0].id
    store().duplicateField(id)
    expect(store().schema.children).toHaveLength(2)
    expect(store().schema.children[1].id).not.toBe(id)
    store().removeField(id)
    expect(store().schema.children).toHaveLength(1)
  })

  it('updateField 按路径写回并产生历史', () => {
    store().addField('input', { parentId: null, index: 0 })
    const id = store().schema.children[0].id
    store().updateField(id, 'props.placeholder', '请输入')
    expect(store().schema.children[0].props.placeholder).toBe('请输入')
    expect(store().past.length).toBeGreaterThan(0)
  })

  it('undo/redo 往返', () => {
    store().addField('input', { parentId: null, index: 0 })
    expect(store().schema.children).toHaveLength(1)
    store().undo()
    expect(store().schema.children).toHaveLength(0)
    store().redo()
    expect(store().schema.children).toHaveLength(1)
  })

  it('导出导入往返一致，非法 JSON 导入返回 false', () => {
    store().addField('input', { parentId: null, index: 0 })
    const json = store().exportSchema()
    store().clear()
    expect(store().schema.children).toHaveLength(0)
    expect(store().importSchema(json)).toBe(true)
    expect(store().schema.children).toHaveLength(1)
    expect(store().importSchema('{bad json')).toBe(false)
    expect(store().importSchema('{"version":2,"children":[]}')).toBe(false)
  })
})
```

- [x] **步骤 2c：运行测试确认通过**

运行：`pnpm test`
预期：schemaTree/path/store 三个测试文件全部 PASS

- [x] **步骤 3：Commit**

```bash
git add packages/form-designer/designer
git commit -m "feat: 设计器 store（schema 树操作 + 撤销重做，含单测）"
```

---

## 任务 4：FormDesigner 骨架 + Toolbar（撤销/重做/清空/导入/导出/预览）

**文件：**
- 创建：`packages/form-designer/designer/FormDesigner.tsx`
- 创建：`packages/form-designer/designer/Toolbar.tsx`

- [x] **步骤 1：创建 designer/Toolbar.tsx**

```tsx
import {
  ClearOutlined,
  ExportOutlined,
  EyeOutlined,
  ImportOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { Button, Divider, Input, message, Modal, Space } from 'antd'
import { useState } from 'react'
import { FormRenderer } from '../renderer/FormRenderer'
import { useDesignerStore } from './store'

interface ToolbarProps {
  onSave?: () => void
}

export function Toolbar({ onSave }: ToolbarProps) {
  const { past, future, undo, redo, clear, importSchema, exportSchema, schema } = useDesignerStore()
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)

  const handleImport = () => {
    if (importSchema(importText)) {
      message.success('导入成功')
      setImportOpen(false)
      setImportText('')
    }
    else {
      message.error('JSON 格式不正确，未导入')
    }
  }

  return (
    <Space split={<Divider type="vertical" />}>
      <Space>
        <Button size="small" icon={<UndoOutlined />} disabled={!past.length} onClick={undo} />
        <Button size="small" icon={<RedoOutlined />} disabled={!future.length} onClick={redo} />
      </Space>
      <Space>
        <Button size="small" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>导入</Button>
        <Button size="small" icon={<ExportOutlined />} onClick={() => setExportOpen(true)}>导出</Button>
        <Button size="small" danger icon={<ClearOutlined />} onClick={() => Modal.confirm({ title: '清空画布？', content: '将删除所有字段（可撤销）', onOk: clear })}>清空</Button>
      </Space>
      <Space>
        <Button size="small" type="primary" ghost icon={<EyeOutlined />} onClick={() => { setSubmitted(null); setPreviewOpen(true) }}>预览</Button>
        {onSave && <Button size="small" type="primary" icon={<SaveOutlined />} onClick={onSave}>保存</Button>}
      </Space>

      <Modal title="导入 Schema" open={importOpen} onOk={handleImport} onCancel={() => setImportOpen(false)} okText="导入">
        <Input.TextArea rows={10} value={importText} onChange={e => setImportText(e.target.value)} placeholder="粘贴 FormSchema JSON" />
      </Modal>

      <Modal title="导出 Schema" open={exportOpen} footer={null} onCancel={() => setExportOpen(false)}>
        <Input.TextArea rows={14} readOnly value={exportSchema()} onFocus={e => e.target.select()} />
      </Modal>

      <Modal title="表单预览" open={previewOpen} footer={null} width={720} onCancel={() => setPreviewOpen(false)} destroyOnHidden>
        <FormRenderer
          schema={schema}
          onSubmit={(values) => {
            setSubmitted(JSON.stringify(values, null, 2))
            message.success('提交成功，数据见下方')
          }}
        />
        {submitted && (
          <pre style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6, maxHeight: 240, overflow: 'auto' }}>
            {submitted}
          </pre>
        )}
      </Modal>
    </Space>
  )
}
```

- [x] **步骤 2：创建 designer/FormDesigner.tsx**

```tsx
import type { FormSchema } from '../types/schema'
import { createStyles } from 'antd-style'
import { useEffect } from 'react'
import { Toolbar } from './Toolbar'
import { useDesignerStore } from './store'
import '../registry/components'

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: ${token.colorBgLayout};
  `,
  toolbar: css`
    padding: ${token.paddingXS}px ${token.paddingSM}px;
    background: ${token.colorBgContainer};
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  body: css`
    flex: 1;
    display: flex;
    min-height: 0;
  `,
  left: css`
    width: 250px;
    flex-shrink: 0;
    background: ${token.colorBgContainer};
    border-right: 1px solid ${token.colorBorderSecondary};
    overflow-y: auto;
  `,
  canvas: css`
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    padding: ${token.paddingLG}px;
  `,
  right: css`
    width: 300px;
    flex-shrink: 0;
    background: ${token.colorBgContainer};
    border-left: 1px solid ${token.colorBorderSecondary};
    overflow-y: auto;
  `,
}))

export interface FormDesignerProps {
  initialSchema?: FormSchema
  onSave?: (schema: FormSchema) => void
}

export function FormDesigner({ initialSchema, onSave }: FormDesignerProps) {
  const { styles } = useStyles()
  const { setSchema, schema, removeField, duplicateField, undo, redo, selectedId } = useDesignerStore()

  // 外部 schema 装载（设计页编辑已有表单）
  useEffect(() => {
    if (initialSchema)
      setSchema(initialSchema)
    // 仅首次装载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 键盘快捷键
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const inInput = /^(INPUT|TEXTAREA)$/.test((e.target as HTMLElement).tagName)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
      else if (inInput) {
        return
      }
      else if (e.key === 'Delete' && selectedId) {
        removeField(selectedId)
      }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId) {
        e.preventDefault()
        duplicateField(selectedId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, removeField, duplicateField, undo, redo])

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Toolbar onSave={onSave ? () => onSave(schema) : undefined} />
      </div>
      <div className={styles.body}>
        <div className={styles.left}>{/* T5：LeftPanel */}</div>
        <div className={styles.canvas}>{/* T6：Canvas */}</div>
        <div className={styles.right}>{/* T7：RightPanel */}</div>
      </div>
    </div>
  )
}
```

- [x] **步骤 3：验证**

`pnpm lint -- packages/form-designer` 无错误。注释占位在 T5–T7 被替换。

- [x] **步骤 4：Commit**

```bash
git add packages/form-designer/designer
git commit -m "feat: FormDesigner 三栏骨架与工具栏（撤销/导入/导出/预览）"
```

---

## 任务 5：LeftPanel（组件面板：分组 + 搜索 + 拖拽源）

**文件：**
- 创建：`packages/form-designer/designer/LeftPanel.tsx`
- 修改：`packages/form-designer/designer/FormDesigner.tsx`（替换左栏占位）

- [x] **步骤 1：创建 designer/LeftPanel.tsx**

```tsx
import type { ComponentDef } from '../registry/registry'
import { useDraggable } from '@dnd-kit/react'
import { Collapse, Input } from 'antd'
import { createStyles } from 'antd-style'
import { useMemo, useState } from 'react'
import { getMenus } from '../registry/registry'

const useStyles = createStyles(({ token, css }) => ({
  panel: css`
    padding: ${token.paddingSM}px;
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    padding: 6px 10px;
    margin-bottom: ${token.marginXS}px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    cursor: grab;
    font-size: ${token.fontSizeSM}px;
    background: ${token.colorBgContainer};
    user-select: none;
    &:hover {
      border-color: ${token.colorPrimary};
      color: ${token.colorPrimary};
    }
  `,
}))

function PaletteItem({ def }: { def: ComponentDef }) {
  const { styles } = useStyles()
  const { ref } = useDraggable({
    id: `palette-${def.type}`,
    data: { kind: 'palette', type: def.type },
  })
  return (
    <div ref={ref} className={styles.item}>
      {def.icon}
      <span>{def.title}</span>
    </div>
  )
}

export function LeftPanel() {
  const { styles } = useStyles()
  const [keyword, setKeyword] = useState('')

  const menus = useMemo(() => {
    const all = getMenus()
    if (!keyword.trim())
      return all
    const kw = keyword.trim().toLowerCase()
    return all
      .map(g => ({ ...g, list: g.list.filter(d => d.title.toLowerCase().includes(kw) || d.type.includes(kw)) }))
      .filter(g => g.list.length > 0)
  }, [keyword])

  return (
    <div className={styles.panel}>
      <Input.Search
        size="small"
        placeholder="搜索组件"
        allowClear
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <Collapse
        ghost
        size="small"
        defaultActiveKey={menus.map(g => g.name)}
        items={menus.map(g => ({
          key: g.name,
          label: g.title,
          children: g.list.map(def => <PaletteItem key={def.type} def={def} />),
        }))}
      />
    </div>
  )
}
```

- [x] **步骤 2：替换 FormDesigner.tsx 左栏占位**

将 `FormDesigner.tsx` 中：

```tsx
        <div className={styles.left}>{/* T5：LeftPanel */}</div>
```

替换为：

```tsx
        <div className={styles.left}><LeftPanel /></div>
```

并在文件顶部 import 区加入：

```tsx
import { LeftPanel } from './LeftPanel'
```

- [x] **步骤 3：验证**

`pnpm lint -- packages/form-designer` 无错误。（拖拽源此时还无法放置，T6 接入落点后联调。）

- [x] **步骤 4：Commit**

```bash
git add packages/form-designer/designer
git commit -m "feat: 左侧组件面板（分组/搜索/拖拽源）"
```

---

## 任务 6：Canvas + CanvasItem + DropGap（拖拽落点、选中、复制、删除）

**文件：**
- 创建：`packages/form-designer/designer/DropGap.tsx`
- 创建：`packages/form-designer/designer/CanvasItem.tsx`
- 创建：`packages/form-designer/designer/Canvas.tsx`
- 修改：`packages/form-designer/designer/FormDesigner.tsx`（替换画布占位 + 包 DragDropProvider）

**落点设计（先读我）：** 采用"间隙落点"方案避免嵌套 droppable 冲突——每个兄弟列表渲染成交替的 `DropGap / CanvasItem / DropGap …`，容器 body 在 children 为空时整体是一个 DropGap 样式的落点。字段项本身不是 droppable，仅通过选中态浮动条上的拖拽手柄作为 drag source。

- [x] **步骤 1：创建 designer/DropGap.tsx**

```tsx
import { useDroppable } from '@dnd-kit/react'
import { createStyles } from 'antd-style'

const useStyles = createStyles(({ token, css }) => ({
  gap: css`
    height: 8px;
    border-radius: 2px;
    transition: background 0.15s;
  `,
  active: css`
    background: ${token.colorPrimary};
    height: 3px;
    margin: 2.5px 0;
  `,
  /** 容器空态落点：更大的虚线区域 */
  empty: css`
    height: 56px;
    border: 1px dashed ${token.colorBorder};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
  emptyActive: css`
    border-color: ${token.colorPrimary};
    color: ${token.colorPrimary};
    background: ${token.colorPrimaryBg};
  `,
}))

interface DropGapProps {
  parentId: string | null
  index: number
  /** 容器空态模式 */
  empty?: boolean
}

export function DropGap({ parentId, index, empty }: DropGapProps) {
  const { styles, cx } = useStyles()
  const { ref, isDropTarget } = useDroppable({
    id: `gap-${parentId ?? 'root'}-${index}`,
    data: { parentId, index },
  })

  if (empty) {
    return (
      <div ref={ref} className={cx(styles.empty, isDropTarget && styles.emptyActive)}>
        拖拽组件到此处
      </div>
    )
  }
  return <div ref={ref} className={cx(styles.gap, isDropTarget && styles.active)} />
}
```

- [x] **步骤 2：创建 designer/CanvasItem.tsx**

```tsx
import type { FieldSchema } from '../types/schema'
import { CopyOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons'
import { useDraggable } from '@dnd-kit/react'
import { Form } from 'antd'
import { createStyles } from 'antd-style'
import { getComponent } from '../registry/registry'
import { DropGap } from './DropGap'
import { useDesignerStore } from './store'

const useStyles = createStyles(({ token, css }) => ({
  item: css`
    position: relative;
    border: 1px dashed transparent;
    border-radius: ${token.borderRadius}px;
    padding: 2px;
    &:hover {
      border-color: ${token.colorPrimaryBorder};
    }
  `,
  selected: css`
    border-color: ${token.colorPrimary} !important;
  `,
  mask: css`
    position: absolute;
    inset: 0;
    z-index: 1;
    cursor: default;
  `,
  actions: css`
    position: absolute;
    top: -12px;
    right: 4px;
    z-index: 2;
    display: flex;
    background: ${token.colorPrimary};
    border-radius: ${token.borderRadiusSM}px;
    overflow: hidden;
  `,
  actionBtn: css`
    padding: 1px 6px;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `,
  dragBtn: css`
    cursor: grab;
  `,
  unknown: css`
    padding: ${token.paddingSM}px;
    color: ${token.colorWarning};
  `,
}))

interface CanvasItemProps {
  node: FieldSchema
  parentId: string | null
  index: number
}

export function CanvasItem({ node, parentId, index }: CanvasItemProps) {
  const { styles, cx } = useStyles()
  const { selectedId, select, removeField, duplicateField } = useDesignerStore()
  const def = getComponent(node.type)
  const selected = selectedId === node.id

  const { ref: dragRef, handleRef } = useDraggable({
    id: `field-${node.id}`,
    data: { kind: 'field', id: node.id },
  })

  if (!def) {
    return <div className={styles.unknown}>未注册的组件类型：{node.type}</div>
  }

  /** 容器子列表：交替渲染间隙落点与子项 */
  const renderChildren = () => {
    const kids = node.children ?? []
    if (!kids.length)
      return <DropGap parentId={node.id} index={0} empty />
    return (
      <>
        {kids.map((c, i) => (
          <span key={c.id} style={{ display: 'contents' }}>
            <DropGap parentId={node.id} index={i} />
            <CanvasItem node={c} parentId={node.id} index={i} />
          </span>
        ))}
        <DropGap parentId={node.id} index={kids.length} />
      </>
    )
  }

  const body = def.isContainer
    ? def.render(node, renderChildren())
    : def.noFormItem
      ? def.render(node)
      : (
          <Form.Item label={node.label} required={node.formItem?.rules?.some(r => r.type === 'required')}>
            {def.render(node)}
          </Form.Item>
        )

  return (
    <div
      ref={dragRef}
      className={cx(styles.item, selected && styles.selected)}
      onClick={(e) => {
        e.stopPropagation()
        select(node.id)
      }}
    >
      {body}
      <div className={styles.mask} onClick={(e) => { e.stopPropagation(); select(node.id) }} />
      {selected && (
        <div className={styles.actions}>
          <span ref={handleRef} className={cx(styles.actionBtn, styles.dragBtn)} title="拖拽移动">
            <DragOutlined />
          </span>
          <span
            className={styles.actionBtn}
            title="复制"
            onClick={(e) => { e.stopPropagation(); duplicateField(node.id) }}
          >
            <CopyOutlined />
          </span>
          <span
            className={styles.actionBtn}
            title="删除"
            onClick={(e) => { e.stopPropagation(); removeField(node.id) }}
          >
            <DeleteOutlined />
          </span>
        </div>
      )}
    </div>
  )
}
```

注意：`parentId`、`index` props 当前未被组件内直接使用（间隙落点由父级渲染），保留是为了后续扩展（如"在此之前插入"操作）；lint 若报 unused，从 props 接口中移除即可。

- [x] **步骤 3：创建 designer/Canvas.tsx**

```tsx
import { Form } from 'antd'
import { createStyles } from 'antd-style'
import { DropGap } from './DropGap'
import { CanvasItem } from './CanvasItem'
import { useDesignerStore } from './store'

const useStyles = createStyles(({ token, css }) => ({
  canvas: css`
    max-width: 900px;
    margin: 0 auto;
    min-height: 100%;
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadiusLG}px;
    padding: ${token.paddingLG}px;
    box-shadow: ${token.boxShadowTertiary};
  `,
  empty: css`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: ${token.colorTextTertiary};
    border: 1px dashed ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
  `,
}))

export function Canvas() {
  const { styles } = useStyles()
  const { schema, select } = useDesignerStore()

  return (
    <div className={styles.canvas} onClick={() => select(null)}>
      <Form {...schema.form} component={false}>
        {schema.children.length === 0
          ? (
              <div className={styles.empty}>
                <DropGap parentId={null} index={0} empty />
              </div>
            )
          : (
              <>
                {schema.children.map((c, i) => (
                  <span key={c.id} style={{ display: 'contents' }}>
                    <DropGap parentId={null} index={i} />
                    <CanvasItem node={c} parentId={null} index={i} />
                  </span>
                ))}
                <DropGap parentId={null} index={schema.children.length} />
              </>
            )}
      </Form>
    </div>
  )
}
```

- [x] **步骤 4：修改 FormDesigner.tsx——接入 Canvas 与 DragDropProvider**

顶部 import 区加入：

```tsx
import type { DragEndEvent } from '@dnd-kit/react'
import { DragDropProvider } from '@dnd-kit/react'
import { Canvas } from './Canvas'
```

将画布占位：

```tsx
        <div className={styles.canvas}>{/* T6：Canvas */}</div>
```

替换为：

```tsx
        <div className={styles.canvas}><Canvas /></div>
```

并将最外层 `<div className={styles.root}>` 内的 `<div className={styles.body}>…</div>` 包裹为：

```tsx
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className={styles.body}>
          …（原有左栏/画布/右栏不变）
        </div>
      </DragDropProvider>
```

在组件内（return 之前）加入：

```tsx
  const { addField, moveField } = useDesignerStore()

  function handleDragEnd(event: DragEndEvent) {
    if (event.canceled)
      return
    const src = event.operation.source?.data as { kind?: string, type?: string, id?: string } | undefined
    const target = event.operation.target?.data as { parentId: string | null, index: number } | undefined
    if (!src || !target)
      return
    if (src.kind === 'palette' && src.type)
      addField(src.type, target)
    else if (src.kind === 'field' && src.id)
      moveField(src.id, target)
  }
```

（`useDesignerStore` 已在 import 中；将 `addField, moveField` 合并进已有的解构行即可。）

- [x] **步骤 5：手动验证（需先有可拖入的组件，可临时在 T8 完成后一并验证；此处仅验证编译）**

`pnpm lint -- packages/form-designer` 无错误。

- [x] **步骤 6：Commit**

```bash
git add packages/form-designer/designer
git commit -m "feat: 画布拖拽（间隙落点）、选中/复制/删除交互"
```

---

## 任务 7：RightPanel + ConfigFormRenderer + OptionsEditor + ValidateEditor

**文件：**
- 创建：`packages/form-designer/designer/OptionsEditor.tsx`
- 创建：`packages/form-designer/designer/ValidateEditor.tsx`
- 创建：`packages/form-designer/designer/ConfigFormRenderer.tsx`
- 创建：`packages/form-designer/designer/RightPanel.tsx`
- 修改：`packages/form-designer/designer/FormDesigner.tsx`（替换右栏占位）

- [x] **步骤 1：创建 designer/OptionsEditor.tsx（select/radio/checkbox 的选项编辑）**

```tsx
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Input } from 'antd'

export interface OptionItem {
  label: string
  value: any
}

interface OptionsEditorProps {
  value?: OptionItem[]
  onChange?: (value: OptionItem[]) => void
}

export function OptionsEditor({ value = [], onChange }: OptionsEditorProps) {
  const update = (index: number, key: keyof OptionItem, v: string) => {
    const next = value.map((item, i) => (i === index ? { ...item, [key]: v } : item))
    onChange?.(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {value.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 6 }}>
          <Input size="small" placeholder="label" value={item.label} onChange={e => update(i, 'label', e.target.value)} />
          <Input size="small" placeholder="value" value={item.value} onChange={e => update(i, 'value', e.target.value)} />
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onChange?.(value.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => onChange?.([...value, { label: `选项${value.length + 1}`, value: `${value.length + 1}` }])}>
        添加选项
      </Button>
    </div>
  )
}
```

- [x] **步骤 2：创建 designer/ValidateEditor.tsx**

```tsx
import type { ValidateRule } from '../types/schema'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Input, Select } from 'antd'

const RULE_TYPES = [
  { label: '必填', value: 'required' },
  { label: '邮箱', value: 'email' },
  { label: 'URL', value: 'url' },
  { label: '数字', value: 'number' },
  { label: '正则', value: 'regexp' },
]

interface ValidateEditorProps {
  value?: ValidateRule[]
  onChange?: (value: ValidateRule[]) => void
}

export function ValidateEditor({ value = [], onChange }: ValidateEditorProps) {
  const update = (index: number, patch: Partial<ValidateRule>) => {
    onChange?.(value.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {value.map((rule, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6, border: '1px solid #f0f0f0', borderRadius: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Select
              size="small"
              style={{ flex: 1 }}
              options={RULE_TYPES}
              value={rule.type}
              onChange={v => update(i, { type: v })}
            />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onChange?.(value.filter((_, j) => j !== i))} />
          </div>
          {rule.type === 'regexp' && (
            <Input size="small" placeholder="正则表达式，如 ^1\\d{10}$" value={rule.pattern} onChange={e => update(i, { pattern: e.target.value })} />
          )}
          <Input size="small" placeholder="校验失败提示语（可选）" value={rule.message} onChange={e => update(i, { message: e.target.value })} />
        </div>
      ))}
      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => onChange?.([...value, { type: 'required' }])}>
        添加规则
      </Button>
    </div>
  )
}
```

- [x] **步骤 3：创建 designer/ConfigFormRenderer.tsx**

```tsx
import type { ConfigMeta } from '../registry/registry'
import type { FieldSchema } from '../types/schema'
import { Input, InputNumber, Select, Switch } from 'antd'
import { getByPath } from '../utils/path'
import { OptionsEditor } from './OptionsEditor'
import { useDesignerStore } from './store'
import { ValidateEditor } from './ValidateEditor'

interface ConfigFormRendererProps {
  node: FieldSchema
  metas: ConfigMeta[]
}

/** 将组件声明的 configForm meta 渲染为配置控件（受控，直接写回 store） */
export function ConfigFormRenderer({ node, metas }: ConfigFormRendererProps) {
  const { updateField } = useDesignerStore()

  const renderControl = (meta: ConfigMeta) => {
    const value = getByPath(node as unknown as Record<string, any>, meta.field)
    const onChange = (v: any) => updateField(node.id, meta.field, v)
    switch (meta.type) {
      case 'input':
        return <Input size="small" value={value} onChange={e => onChange(e.target.value)} {...meta.props} />
      case 'textarea':
        return <Input.TextArea size="small" rows={2} value={value} onChange={e => onChange(e.target.value)} {...meta.props} />
      case 'number':
        return <InputNumber size="small" style={{ width: '100%' }} value={value} onChange={v => onChange(v)} {...meta.props} />
      case 'switch':
        return <Switch size="small" checked={!!value} onChange={onChange} {...meta.props} />
      case 'select':
        return <Select size="small" style={{ width: '100%' }} value={value} options={meta.options} onChange={onChange} allowClear {...meta.props} />
      case 'options':
        return <OptionsEditor value={value} onChange={onChange} />
      case 'json':
        return (
          <Input.TextArea
            size="small"
            rows={4}
            defaultValue={value ? JSON.stringify(value, null, 2) : ''}
            onBlur={(e) => {
              try {
                onChange(JSON.parse(e.target.value))
                e.target.style.borderColor = ''
              }
              catch {
                e.target.style.borderColor = 'red'
              }
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {metas.map(meta => (
        <div key={meta.field}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{meta.label}</div>
          {renderControl(meta)}
        </div>
      ))}
    </div>
  )
}
```

- [x] **步骤 4：创建 designer/RightPanel.tsx**

```tsx
import type { ConfigMeta } from '../registry/registry'
import { Divider, Radio, Select, Switch, Tabs } from 'antd'
import { getComponent } from '../registry/registry'
import { ConfigFormRenderer } from './ConfigFormRenderer'
import { useDesignerStore } from './store'
import { ValidateEditor } from './ValidateEditor'

/** 字段组件的通用配置（label/field/tooltip/extra） */
function useCommonMetas(hasField: boolean): ConfigMeta[] {
  const metas: ConfigMeta[] = [
    { field: 'label', label: '标题', type: 'input' },
  ]
  if (hasField)
    metas.push({ field: 'field', label: '字段名', type: 'input' })
  metas.push(
    { field: 'formItem.tooltip', label: '提示', type: 'input' },
    { field: 'formItem.extra', label: '额外说明', type: 'input' },
  )
  return metas
}

function FieldConfig() {
  const { getSelected, updateField } = useDesignerStore()
  const node = getSelected()
  if (!node)
    return <div style={{ color: '#999', padding: 12 }}>在画布中点击选择一个字段</div>

  const def = getComponent(node.type)
  if (!def)
    return <div style={{ color: '#999', padding: 12 }}>未注册的组件类型</div>

  const hasField = !def.isContainer && !def.noFormItem
  const commonMetas = useCommonMetas(hasField)

  return (
    <div style={{ padding: 12 }}>
      <Divider orientation="left" plain style={{ margin: '4px 0 12px' }}>基础</Divider>
      <ConfigFormRenderer node={node} metas={commonMetas} />
      {hasField && (
        <>
          <Divider orientation="left" plain style={{ margin: '16px 0 12px' }}>校验规则</Divider>
          <ValidateEditor
            value={node.formItem?.rules}
            onChange={rules => updateField(node.id, 'formItem.rules', rules)}
          />
        </>
      )}
      {def.configForm.length > 0 && (
        <>
          <Divider orientation="left" plain style={{ margin: '16px 0 12px' }}>组件属性</Divider>
          <ConfigFormRenderer node={node} metas={def.configForm} />
        </>
      )}
    </div>
  )
}

function FormConfig() {
  const { schema, updateFormConfig } = useDesignerStore()
  const { form } = schema
  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>布局</div>
        <Radio.Group
          size="small"
          value={form.layout}
          onChange={e => updateFormConfig({ layout: e.target.value })}
          options={[
            { label: '水平', value: 'horizontal' },
            { label: '垂直', value: 'vertical' },
            { label: '行内', value: 'inline' },
          ]}
          optionType="button"
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>标签对齐</div>
        <Select
          size="small"
          style={{ width: '100%' }}
          value={form.labelAlign}
          onChange={v => updateFormConfig({ labelAlign: v })}
          options={[{ label: '右对齐', value: 'right' }, { label: '左对齐', value: 'left' }]}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>尺寸</div>
        <Select
          size="small"
          style={{ width: '100%' }}
          value={form.size}
          onChange={v => updateFormConfig({ size: v })}
          options={[{ label: '大', value: 'large' }, { label: '中', value: 'middle' }, { label: '小', value: 'small' }]}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#666' }}>显示冒号</span>
        <Switch size="small" checked={form.colon} onChange={v => updateFormConfig({ colon: v })} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#666' }}>整体禁用</span>
        <Switch size="small" checked={form.disabled} onChange={v => updateFormConfig({ disabled: v })} />
      </div>
    </div>
  )
}

export function RightPanel() {
  return (
    <Tabs
      size="small"
      centered
      style={{ height: '100%' }}
      items={[
        { key: 'field', label: '属性', children: <FieldConfig /> },
        { key: 'form', label: '表单', children: <FormConfig /> },
      ]}
    />
  )
}
```

- [x] **步骤 5：替换 FormDesigner.tsx 右栏占位**

```tsx
        <div className={styles.right}>{/* T7：RightPanel */}</div>
```

替换为：

```tsx
        <div className={styles.right}><RightPanel /></div>
```

并加入 import：`import { RightPanel } from './RightPanel'`。

- [x] **步骤 6：验证**

`pnpm lint -- packages/form-designer` 无错误。

- [x] **步骤 7：Commit**

```bash
git add packages/form-designer/designer
git commit -m "feat: 右侧配置面板（属性/校验/全局表单配置）"
```

---

## 任务 8：基础输入组件（17 个）

**文件：**
- 创建：`packages/form-designer/registry/components/basicInput.tsx`（input / textarea / password / number）
- 创建：`packages/form-designer/registry/components/selectFamily.tsx`（select / radio / checkbox）
- 创建：`packages/form-designer/registry/components/dateTime.tsx`（date / dateRange / time）
- 创建：`packages/form-designer/registry/components/choice.tsx`（switch / rate / slider / color / cascader / treeSelect / transfer）

**公共辅助（每个文件都会用到，放在 `registry/components/helpers.ts`，先创建）：**

- [x] **步骤 1：创建 registry/components/helpers.ts**

```ts
import type { FieldSchema } from '../../types/schema'
import { uniqueId } from '../../utils/uniqueId'

/** 生成字段组件的默认 schema */
export function fieldSchema(type: string, label: string, props: Record<string, any> = {}): FieldSchema {
  return { id: uniqueId(), type, field: uniqueId(), label, props }
}

/** 生成容器/辅助组件的默认 schema（无 field） */
export function bareSchema(type: string, props: Record<string, any> = {}, children?: FieldSchema[]): FieldSchema {
  return { id: uniqueId(), type, props, children }
}
```

- [x] **步骤 2：创建 registry/components/basicInput.tsx**

```tsx
import {
  FieldNumberOutlined,
  FontSizeOutlined,
  LockOutlined,
  TextOutlined,
} from '@ant-design/icons'
import { Input, InputNumber } from 'antd'
import { registerComponent } from '../registry'
import { fieldSchema } from './helpers'

registerComponent({
  type: 'input',
  title: '输入框',
  menu: 'main',
  icon: <FontSizeOutlined />,
  defaultSchema: () => fieldSchema('input', '输入框'),
  render: schema => <Input {...schema.props} />,
  configForm: [
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
    { field: 'props.maxLength', label: '最大长度', type: 'number', props: { min: 0 } },
    { field: 'props.allowClear', label: '可清空', type: 'switch' },
    { field: 'props.showCount', label: '显示字数', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'textarea',
  title: '文本域',
  menu: 'main',
  icon: <TextOutlined />,
  defaultSchema: () => fieldSchema('textarea', '文本域', { rows: 3 }),
  render: schema => <Input.TextArea {...schema.props} />,
  configForm: [
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
    { field: 'props.rows', label: '行数', type: 'number', props: { min: 1, max: 20 } },
    { field: 'props.maxLength', label: '最大长度', type: 'number', props: { min: 0 } },
    { field: 'props.showCount', label: '显示字数', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'password',
  title: '密码框',
  menu: 'main',
  icon: <LockOutlined />,
  defaultSchema: () => fieldSchema('password', '密码'),
  render: schema => <Input.Password {...schema.props} />,
  configForm: [
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'number',
  title: '数字输入',
  menu: 'main',
  icon: <FieldNumberOutlined />,
  defaultSchema: () => fieldSchema('number', '数字'),
  render: schema => <InputNumber style={{ width: '100%' }} {...schema.props} />,
  configForm: [
    { field: 'props.min', label: '最小值', type: 'number' },
    { field: 'props.max', label: '最大值', type: 'number' },
    { field: 'props.step', label: '步长', type: 'number', props: { min: 0 } },
    { field: 'props.precision', label: '小数位', type: 'number', props: { min: 0, max: 10 } },
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})
```

- [x] **步骤 3：创建 registry/components/selectFamily.tsx**

```tsx
import { CheckSquareOutlined, DownSquareOutlined, RadioButtonUncheckedOutlined } from '@ant-design/icons'
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
  icon: <RadioButtonUncheckedOutlined />,
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
  defaultSchema: () => fieldSchema('checkbox', '多选框组', { options: DEFAULT_OPTIONS }),
  render: schema => <Checkbox.Group {...schema.props} />,
  configForm: [
    { field: 'props.options', label: '选项', type: 'options' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})
```

注：`RadioButtonUncheckedOutlined` 若不存在则用 `CheckCircleOutlined` 代替（lint/类型检查会暴露，二选一）。

- [x] **步骤 4：创建 registry/components/dateTime.tsx**

```tsx
import { CalendarOutlined, FieldTimeOutlined, SwapRightOutlined } from '@ant-design/icons'
import { DatePicker, TimePicker } from 'antd'
import { registerComponent } from '../registry'
import { fieldSchema } from './helpers'

const FORMAT_OPTIONS = [
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
  { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
  { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
]

registerComponent({
  type: 'date',
  title: '日期选择',
  menu: 'main',
  icon: <CalendarOutlined />,
  defaultSchema: () => fieldSchema('date', '日期'),
  render: schema => <DatePicker style={{ width: '100%' }} {...schema.props} />,
  configForm: [
    { field: 'props.placeholder', label: '占位提示', type: 'input' },
    { field: 'props.format', label: '格式', type: 'select', options: FORMAT_OPTIONS },
    { field: 'props.showTime', label: '带时间', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'dateRange',
  title: '日期范围',
  menu: 'main',
  icon: <SwapRightOutlined />,
  defaultSchema: () => fieldSchema('dateRange', '日期范围'),
  render: schema => <DatePicker.RangePicker style={{ width: '100%' }} {...schema.props} />,
  configForm: [
    { field: 'props.format', label: '格式', type: 'select', options: FORMAT_OPTIONS },
    { field: 'props.showTime', label: '带时间', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'time',
  title: '时间选择',
  menu: 'main',
  icon: <FieldTimeOutlined />,
  defaultSchema: () => fieldSchema('time', '时间'),
  render: schema => <TimePicker style={{ width: '100%' }} {...schema.props} />,
  configForm: [
    { field: 'props.format', label: '格式', type: 'select', options: [{ label: 'HH:mm:ss', value: 'HH:mm:ss' }, { label: 'HH:mm', value: 'HH:mm' }] },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})
```

- [x] **步骤 5：创建 registry/components/choice.tsx**

```tsx
import {
  ApartmentOutlined,
  BgColorsOutlined,
  NodeIndexOutlined,
  SlidersOutlined,
  StarOutlined,
  SwapOutlined,
  ToggleRightOutlined,
} from '@ant-design/icons'
import { Cascader, ColorPicker, Rate, Slider, Switch, Transfer, TreeSelect } from 'antd'
import { registerComponent } from '../registry'
import { fieldSchema } from './helpers'

registerComponent({
  type: 'switch',
  title: '开关',
  menu: 'main',
  icon: <ToggleRightOutlined />,
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
    // Transfer 的 onChange 首参为 targetKeys，可直接接 Form.Item 注入
    const { value, onChange, ...rest } = schema.props as any
    return (
      <Transfer
        dataSource={schema.props.dataSource}
        titles={schema.props.titles}
        targetKeys={value ?? []}
        onChange={keys => onChange?.(keys)}
        render={item => item.title}
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
```

注意：`transfer` 的 render 需要 Form.Item 注入 value/onChange——但 `def.render(schema)` 只收到 schema。修改方案：render 签名第二参 children 之外不加参数，改为 renderItem 注入：在 `renderer/renderField.tsx` 中，非容器渲染改为透传注入 props：

将 `renderField.tsx` 中 `const control = def.render(schema)` 改为：

```tsx
  const control = def.render({ ...schema, props: { ...schema.props, __injected: true } })
```

**不采用**——更干净的做法：ComponentDef.render 增加可选第三参 `injected`（Form.Item 注入的 value/onChange）。统一修改：

`registry/registry.ts` 中 render 签名改为：

```ts
  render: (schema: FieldSchema, children?: ReactNode, injected?: Record<string, any>) => ReactNode
```

`renderField.tsx` 中：

```tsx
  // 非容器：
  const control = def.render(schema, undefined, undefined)
  ...
  <Form.Item ...>
    <InjectedControl def={def} schema={schema} />
  </Form.Item>
```

并新增小组件（利用 antd Form.Item 对唯一子元素自动注入 value/onChange 的机制，antd 默认即如此）：

```tsx
function InjectedControl({ def, schema }: { def: ComponentDef, schema: FieldSchema }) {
  // antd Form.Item 会将 value/onChange 注入本组件的 props
  return <Injector def={def} schema={schema} />
}
```

**最终简化（以此为准，废弃上面两个中间方案）**：Form.Item 自动向直接子组件注入 `value`/`onChange` props。因此自定义一个转发组件即可，无需改 render 签名：

`renderer/renderField.tsx` 中，非容器分支写为：

```tsx
function FieldControl({ def, schema, value, onChange }: {
  def: ComponentDef
  schema: FieldSchema
  value?: any
  onChange?: (v: any) => void
}) {
  // Transfer 等 onChange 签名特殊的组件在各自 def.render 内自行处理
  return <>{def.render({ ...schema, props: { ...schema.props, value, onChange } })}</>
}
```

非容器渲染：

```tsx
  return (
    <Form.Item
      name={schema.field}
      label={schema.label}
      rules={toAntdRules(schema)}
      tooltip={schema.formItem?.tooltip}
      extra={schema.formItem?.extra}
      hidden={schema.formItem?.hidden}
      {...def.formItemProps}
    >
      <FieldControl def={def} schema={schema} />
    </Form.Item>
  )
```

同时普通组件（Input 等）的 render 为 `<Input {...schema.props} />`，`value/onChange` 随 props 展开自动生效；transfer 的 render 改为：

```tsx
  render: (schema) => {
    const { value, onChange, dataSource, titles, ...rest } = schema.props
    return (
      <Transfer
        dataSource={dataSource}
        titles={titles}
        targetKeys={value ?? []}
        onChange={keys => onChange?.(keys)}
        render={item => item.title}
        {...rest}
      />
    )
  },
```

switch 的 `valuePropName: 'checked'` 已由 formItemProps 处理。

- [x] **步骤 6：更新 registry/components/index.ts**

内容保持任务 2 步骤 4 的版本（已 import 全部六个文件），确认 `aide` 和 `layout` 的 import 暂时指向尚不存在的文件——**先注释掉这两行**，T9/T10 再取消注释：

```ts
import './basicInput'
import './selectFamily'
import './dateTime'
import './choice'
// import './aide'     // T9
// import './layout'   // T10
```

- [x] **步骤 7：启动开发服务器手动验收（P2 验收）**

```bash
pnpm dev
```

浏览器打开后，需要临时验证页——**创建临时路由文件** `src/pages/index/form-designer-test.tsx`：

```tsx
import { FormDesigner } from '@zealous-admin/form-designer/index'

export default function FormDesignerTest() {
  return (
    <div style={{ height: 'calc(100vh - 120px)' }}>
      <FormDesigner />
    </div>
  )
}
```

访问 `/form-designer-test`，验收：
1. 左侧面板显示"基础组件"分组，17 个组件可见、可搜索过滤
2. 拖 3 个组件到画布，可通过间隙落点排序
3. 点击选中显示操作条，可复制/删除，Ctrl+Z 可撤销
4. 右侧修改"占位提示"等属性，画布实时更新
5. 预览弹窗中填写表单并提交，values 正确（key 为 field 名）
6. 导出 JSON → 清空 → 导入，画布还原

验收通过后删除临时文件 `src/pages/index/form-designer-test.tsx`。

- [x] **步骤 8：Commit**

```bash
git add packages/form-designer
git commit -m "feat: 17 个基础输入组件定义与配置面板"
```

---

## 任务 9：辅助组件（5 个）

**文件：**
- 创建：`packages/form-designer/registry/components/aide.tsx`
- 修改：`packages/form-designer/registry/components/index.ts`（取消注释 aide 行）

- [x] **步骤 1：创建 registry/components/aide.tsx**

```tsx
import {
  AlertOutlined,
  FontColorsOutlined,
  LinkOutlined,
  PlaySquareOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { Alert, Button, Typography } from 'antd'
import { registerComponent } from '../registry'
import { bareSchema } from './helpers'

registerComponent({
  type: 'text',
  title: '文本',
  menu: 'aide',
  icon: <FontColorsOutlined />,
  noFormItem: true,
  defaultSchema: () => bareSchema('text', { content: '文本内容' }),
  render: schema => <Typography.Text {...schema.props}>{schema.props.content}</Typography.Text>,
  configForm: [
    { field: 'props.content', label: '内容', type: 'textarea' },
    {
      field: 'props.type', label: '类型', type: 'select',
      options: [
        { label: '默认', value: undefined },
        { label: '次要', value: 'secondary' },
        { label: '成功', value: 'success' },
        { label: '警告', value: 'warning' },
        { label: '危险', value: 'danger' },
      ],
    },
    { field: 'props.strong', label: '加粗', type: 'switch' },
    { field: 'props.delete', label: '删除线', type: 'switch' },
  ],
})

registerComponent({
  type: 'paragraph',
  title: '段落',
  menu: 'aide',
  icon: <RobotOutlined />,
  noFormItem: true,
  defaultSchema: () => bareSchema('paragraph', { content: '段落文本，支持多行。' }),
  render: schema => <Typography.Paragraph {...schema.props}>{schema.props.content}</Typography.Paragraph>,
  configForm: [
    { field: 'props.content', label: '内容', type: 'textarea' },
    { field: 'props.type', label: '类型', type: 'select', options: [
      { label: '默认', value: undefined },
      { label: '次要', value: 'secondary' },
      { label: '成功', value: 'success' },
      { label: '警告', value: 'warning' },
      { label: '危险', value: 'danger' },
    ] },
  ],
})

registerComponent({
  type: 'alert',
  title: '提示块',
  menu: 'aide',
  icon: <AlertOutlined />,
  noFormItem: true,
  defaultSchema: () => bareSchema('alert', { message: '提示信息', type: 'info', showIcon: true }),
  render: schema => <Alert {...schema.props} />,
  configForm: [
    { field: 'props.message', label: '标题', type: 'input' },
    { field: 'props.description', label: '描述', type: 'textarea' },
    { field: 'props.type', label: '类型', type: 'select', options: [
      { label: '信息', value: 'info' },
      { label: '成功', value: 'success' },
      { label: '警告', value: 'warning' },
      { label: '错误', value: 'error' },
    ] },
    { field: 'props.showIcon', label: '显示图标', type: 'switch' },
    { field: 'props.closable', label: '可关闭', type: 'switch' },
  ],
})

registerComponent({
  type: 'button',
  title: '按钮',
  menu: 'aide',
  icon: <PlaySquareOutlined />,
  noFormItem: true,
  defaultSchema: () => bareSchema('button', { text: '按钮', type: 'default' }),
  render: schema => <Button {...schema.props}>{schema.props.text}</Button>,
  configForm: [
    { field: 'props.text', label: '文字', type: 'input' },
    { field: 'props.type', label: '类型', type: 'select', options: [
      { label: '默认', value: 'default' },
      { label: '主要', value: 'primary' },
      { label: '虚线', value: 'dashed' },
      { label: '文本', value: 'text' },
      { label: '链接', value: 'link' },
    ] },
    { field: 'props.danger', label: '危险态', type: 'switch' },
    { field: 'props.block', label: '撑满一行', type: 'switch' },
    { field: 'props.disabled', label: '禁用', type: 'switch' },
  ],
})

registerComponent({
  type: 'link',
  title: '链接',
  menu: 'aide',
  icon: <LinkOutlined />,
  noFormItem: true,
  defaultSchema: () => bareSchema('link', { text: '链接文字', href: 'https://', target: '_blank' }),
  render: schema => <Typography.Link {...schema.props}>{schema.props.text}</Typography.Link>,
  configForm: [
    { field: 'props.text', label: '文字', type: 'input' },
    { field: 'props.href', label: '地址', type: 'input' },
    { field: 'props.target', label: '打开方式', type: 'select', options: [
      { label: '新窗口', value: '_blank' },
      { label: '当前窗口', value: '_self' },
    ] },
  ],
})
```

注：`RobotOutlined`（段落图标）语义不贴切，可用 `FileTextOutlined` 替代——任选其一。

- [x] **步骤 2：取消 registry/components/index.ts 中 aide 行注释**

```ts
import './aide'
```

- [x] **步骤 3：验证**

`pnpm lint` 无错误；在任务 8 的临时验证页（或正式设计页）中拖入 5 个辅助组件，画布展示正确，属性面板可编辑。

- [x] **步骤 4：Commit**

```bash
git add packages/form-designer
git commit -m "feat: 5 个辅助组件（文本/段落/提示块/按钮/链接）"
```

---

## 任务 10：布局组件（8 个）+ 容器嵌套

**文件：**
- 创建：`packages/form-designer/registry/components/layout.tsx`
- 修改：`packages/form-designer/registry/components/index.ts`（取消注释 layout 行）

**容器渲染约定（先读我）：** 容器 `def.render(schema, children)` 收到的 `children` 在画布模式是已嵌好 DropGap 的节点数组（由 CanvasItem 的 renderChildren 生成），在运行时是 `renderField` 渲染的字段节点。Descriptions 因 antd items 结构限制，画布模式仅支持空态落点插入（在计划末尾的验收中确认此行为）。

- [x] **步骤 1：创建 registry/components/layout.tsx**

```tsx
import {
  BgOutlined,
  CreditCardOutlined,
  ColumnWidthOutlined,
  LayoutOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
  SplitCellsOutlined,
  TableOutlined,
} from '@ant-design/icons'
import { Card, Col, Collapse, Descriptions, Divider, Flex, Row, Space, Tabs } from 'antd'
import { registerComponent } from '../registry'
import { bareSchema, fieldSchema } from './helpers'

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
    { field: 'props.size', label: '尺寸', type: 'select', options: [
      { label: '默认', value: 'default' },
      { label: '小', value: 'small' },
    ] },
    { field: 'props.bordered', label: '边框', type: 'switch' },
  ],
})

registerComponent({
  type: 'divider',
  title: '分割线',
  menu: 'layout',
  icon: <MenuUnfoldOutlined />,
  noFormItem: true,
  defaultSchema: () => bareSchema('divider', { text: '' }),
  render: schema => <Divider {...schema.props}>{schema.props.text || null}</Divider>,
  configForm: [
    { field: 'props.text', label: '文字', type: 'input' },
    { field: 'props.dashed', label: '虚线', type: 'switch' },
    { field: 'props.orientation', label: '文字位置', type: 'select', options: [
      { label: '左', value: 'left' },
      { label: '中', value: 'center' },
      { label: '右', value: 'right' },
    ] },
  ],
})

registerComponent({
  type: 'collapse',
  title: '折叠面板',
  menu: 'layout',
  icon: <BgOutlined />,
  isContainer: true,
  defaultSchema: () => bareSchema('collapse', { panelTitle: '折叠面板' }, []),
  render: (schema, children) => (
    <Collapse
      items={[{ key: '1', label: schema.props.panelTitle || '折叠面板', children }]}
      defaultActiveKey={['1']}
    />
  ),
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
  render: (schema, children) => (
    <Tabs items={[{ key: '1', label: schema.props.tabTitle || '标签页', children }]} />
  ),
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
    { field: 'props.size', label: '间距', type: 'select', options: [
      { label: '小', value: 'small' },
      { label: '中', value: 'middle' },
      { label: '大', value: 'large' },
    ] },
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
    { field: 'props.justify', label: '主轴对齐', type: 'select', options: [
      { label: '起点', value: 'flex-start' },
      { label: '居中', value: 'center' },
      { label: '两端', value: 'space-between' },
      { label: '终点', value: 'flex-end' },
    ] },
    { field: 'props.align', label: '交叉轴对齐', type: 'select', options: [
      { label: '起点', value: 'flex-start' },
      { label: '居中', value: 'center' },
      { label: '终点', value: 'flex-end' },
      { label: '拉伸', value: 'stretch' },
    ] },
  ],
})

registerComponent({
  type: 'descriptions',
  title: '描述列表',
  menu: 'layout',
  icon: <ProfileOutlined />,
  isContainer: true,
  defaultSchema: () => bareSchema('descriptions', { title: '描述列表', bordered: true, column: 2 }, []),
  render: (schema, children) => {
    // children 与 schema.children 顺序对齐；画布模式下仅空态落点可用
    const items = (schema.children ?? []).map((c, i) => ({
      key: c.id,
      label: c.label || c.field || `字段${i + 1}`,
      children: Array.isArray(children) ? children[i] : children,
    }))
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

// fieldSchema 在本文件中未使用则从 import 中移除（lint 会提示）
```

- [x] **步骤 2：取消 registry/components/index.ts 中 layout 行注释**

```ts
import './layout'
```

- [x] **步骤 3：手动验收（P3 验收）**

临时验证页中：
1. 拖入"栅格行"，自动生成两个 12 栅格列；拖输入框到列内
2. 卡片套 Row 套 Col 套输入框，嵌套层级正常，间隙落点在容器内外均可用
3. 尝试把卡片拖入它自己内部——无反应（isDescendant 防护生效）
4. 预览模式提交，Row/Col 内字段 values 正常平铺

- [x] **步骤 4：Commit**

```bash
git add packages/form-designer
git commit -m "feat: 8 个布局组件与容器嵌套拖拽"
```

---

## 任务 11：后端 za_form 表 + CRUD 路由 + 菜单迁移

**文件：**
- 修改：`service/src/db/index.ts`（加 za_form 表 + 幂等菜单迁移）
- 创建：`service/src/routes/form.ts`
- 修改：`service/src/app.ts`（注册路由）

- [x] **步骤 1：service/src/db/index.ts 加表**

在 `initDb()` 中最后一个 `db.exec(CREATE TABLE …)` 之后追加：

```ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS za_form (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      schema TEXT,
      status INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      create_time TEXT,
      update_time TEXT
    )
  `)
```

- [x] **步骤 2：service/src/db/index.ts 加幂等菜单迁移**

在 `initDb()` 的 seed 逻辑（`if` 空库判断块）**之外、函数末尾**追加（对已有数据库也生效）：

```ts
  // 幂等迁移：表单设计菜单（老库补充）
  const existFormMenu = db.prepare('SELECT id FROM za_menu WHERE path = ?').get('/form/list')
  if (!existFormMenu) {
    const nowStr = now()
    const parent = db.prepare(
      'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(0, '表单设计', 1, 90, 'form', 'ai:AiOutlineForm', 0, nowStr, '/form', null)
    const pid = Number(parent.lastInsertRowid)
    const child = db.prepare(
      'INSERT INTO za_menu (parent_id, title, level, sort, name, icon, hidden, create_time, path, active_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(pid, '表单管理', 2, 0, 'list', 'ai:AiOutlineUnorderedList', 0, nowStr, '/form/list', null)
    const cid = Number(child.lastInsertRowid)
    const roles = db.prepare('SELECT id FROM za_role').all() as any[]
    const rel = db.prepare('INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)')
    for (const r of roles) {
      rel.run(r.id, pid)
      rel.run(r.id, cid)
    }
  }
```

- [x] **步骤 3：创建 service/src/routes/form.ts**

```ts
import { Router } from 'express'
import { getDb } from '../db'
import { toCamelCase, toCamelCaseList } from '../lib/camel'
import { now } from '../lib/date'
import { failed, success } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const db = getDb()

router.use(authMiddleware)

router.get('/form/list', (req, res) => {
  try {
    const keyword = (req.query.keyword as string) || ''
    const pageSize = Number(req.query.pageSize) || 10
    const pageNum = Number(req.query.pageNum) || 1
    const offset = (pageNum - 1) * pageSize

    let total: number
    let list: any[]
    if (keyword) {
      const like = `%${keyword}%`
      total = (db.prepare('SELECT COUNT(*) AS count FROM za_form WHERE name LIKE ?').get(like) as any).count
      list = toCamelCaseList(db.prepare(
        'SELECT id, name, description, status, version, create_time, update_time FROM za_form WHERE name LIKE ? ORDER BY update_time DESC LIMIT ? OFFSET ?',
      ).all(like, pageSize, offset) as any[])
    }
    else {
      total = (db.prepare('SELECT COUNT(*) AS count FROM za_form').get() as any).count
      list = toCamelCaseList(db.prepare(
        'SELECT id, name, description, status, version, create_time, update_time FROM za_form ORDER BY update_time DESC LIMIT ? OFFSET ?',
      ).all(pageSize, offset) as any[])
    }
    res.json(success({ list, total, pageSize, pageNum }))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取表单列表失败'))
  }
})

router.get('/form/detail', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM za_form WHERE id = ?').get(Number(req.query.id)) as any
    if (!row) {
      res.json(failed('表单不存在'))
      return
    }
    res.json(success(toCamelCase(row)))
  }
  catch (e: any) {
    res.json(failed(e.message || '获取表单详情失败'))
  }
})

router.post('/form/create', (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) {
      res.json(failed('表单名称不能为空'))
      return
    }
    const nowStr = now()
    const result = db.prepare(
      'INSERT INTO za_form (name, description, schema, status, version, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(name, description || '', '', 0, 1, nowStr, nowStr)
    res.json(success({ id: Number(result.lastInsertRowid) }, '创建成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '创建表单失败'))
  }
})

router.post('/form/update', (req, res) => {
  try {
    const { id, name, description, schema, status } = req.body
    if (!id) {
      res.json(failed('缺少 id'))
      return
    }
    const existing = db.prepare('SELECT id, version FROM za_form WHERE id = ?').get(id) as any
    if (!existing) {
      res.json(failed('表单不存在'))
      return
    }
    // schema 变化时版本号 +1
    const versionBump = schema !== undefined ? 1 : 0
    db.prepare(
      `UPDATE za_form SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        schema = COALESCE(?, schema),
        status = COALESCE(?, status),
        version = version + ?,
        update_time = ?
      WHERE id = ?`,
    ).run(name ?? null, description ?? null, schema ?? null, status ?? null, versionBump, now(), id)
    res.json(success(null, '更新成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '更新表单失败'))
  }
})

router.post('/form/delete', (req, res) => {
  try {
    const { id } = req.body
    if (!id) {
      res.json(failed('缺少 id'))
      return
    }
    db.prepare('DELETE FROM za_form WHERE id = ?').run(id)
    res.json(success(null, '删除成功'))
  }
  catch (e: any) {
    res.json(failed(e.message || '删除表单失败'))
  }
})

export default router
```

- [x] **步骤 4：service/src/app.ts 注册路由**

import 区加入：

```ts
import formRoutes from './routes/form'
```

路由注册区（`app.use('/', dictRoutes)` 之后）加入：

```ts
app.use('/', formRoutes)
```

- [x] **步骤 5：验证**

```bash
cd service && pnpm dev
```

预期启动日志正常。用 Apifox/curl 带 token 验证：
- `POST /form/create` body `{"name":"测试表单"}` → 返回 id
- `GET /form/list` → 列表含该记录
- `POST /form/update` body `{"id":1,"schema":"{\"version\":1,...}"}` → version 变 2
- 登录前端，侧边菜单出现"表单设计 > 表单管理"

- [x] **步骤 6：Commit**

```bash
git add service
git commit -m "feat: 表单 schema 存取接口与菜单迁移"
```

---

## 任务 12：前端 apis + 三个演示页（P4 闭环）

**文件：**
- 创建：`src/apis/form.ts`
- 创建：`src/pages/index/form/list.tsx`
- 创建：`src/pages/index/form/design.tsx`
- 创建：`src/pages/index/form/render.tsx`

- [x] **步骤 1：创建 src/apis/form.ts**

```ts
import type { CommonPage, PageParam } from '@zealous-admin/layout/index'
import { http } from '@zealous-admin/layout/index'

export interface FormRecord {
  id: number
  name: string
  description: string
  schema: string
  status: number
  version: number
  createTime: string
  updateTime: string
}

export function getFormListAPI(params: PageParam & { keyword?: string }) {
  return http<CommonPage<FormRecord>>({ url: '/form/list', method: 'get', params })
}

export function getFormDetailAPI(id: number) {
  return http<FormRecord>({ url: '/form/detail', method: 'get', params: { id } })
}

export function createFormAPI(data: { name: string, description?: string }) {
  return http<{ id: number }>({ url: '/form/create', method: 'post', data })
}

export function updateFormAPI(data: { id: number, name?: string, description?: string, schema?: string, status?: number }) {
  return http({ url: '/form/update', method: 'post', data })
}

export function deleteFormAPI(id: number) {
  return http({ url: '/form/delete', method: 'post', data: { id } })
}
```

注：`CommonPage`/`PageParam` 类型与 `src/apis/dict.ts` 同款从 layout 包导入；若 layout 未导出这两个类型，参照 `src/apis/dict.ts` 第一行的实际导入照抄。

- [x] **步骤 2：创建 src/pages/index/form/list.tsx**

```tsx
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons'
import { http, useAppMessage, useControlTab } from '@zealous-admin/layout/index'
import { Button, Card, Input, Modal, Popconfirm, Space, Table, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { createFormAPI, deleteFormAPI, getFormListAPI } from '@/apis/form'

export default function FormListPage() {
  const { message } = useAppMessage()
  const { openTab } = useControlTab()
  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [pageNum, setPageNum] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const load = async (page = pageNum, kw = keyword) => {
    setLoading(true)
    try {
      const res = await getFormListAPI({ pageNum: page, pageSize: 10, keyword: kw })
      setList(res.list)
      setTotal(res.total)
      setPageNum(page)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  const handleCreate = async () => {
    if (!name.trim()) {
      message.warning('请输入表单名称')
      return
    }
    const res = await createFormAPI({ name: name.trim(), description })
    message.success('创建成功')
    setCreateOpen(false)
    setName('')
    setDescription('')
    openTab({ key: `/form/design?id=${res.id}`, label: `设计-${name.trim()}` })
  }

  const handleDelete = async (id: number) => {
    await deleteFormAPI(id)
    message.success('删除成功')
    load()
  }

  return (
    <Card
      title="表单管理"
      extra={(
        <Space>
          <Input.Search placeholder="搜索名称" allowClear onSearch={(v) => { setKeyword(v); load(1, v) }} style={{ width: 200 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建表单</Button>
        </Space>
      )}
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        pagination={{ current: pageNum, total, pageSize: 10, onChange: p => load(p) }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '版本', dataIndex: 'version', width: 70 },
          { title: '状态', dataIndex: 'status', width: 90, render: (s: number) => (s === 1 ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>) },
          { title: '更新时间', dataIndex: 'updateTime', width: 170 },
          {
            title: '操作',
            width: 220,
            render: (_, row) => (
              <Space>
                <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openTab({ key: `/form/design?id=${row.id}`, label: `设计-${row.name}` })}>设计</Button>
                <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => openTab({ key: `/form/render?id=${row.id}`, label: `渲染-${row.name}` })}>渲染</Button>
                <Popconfirm title="确认删除该表单？" onConfirm={() => handleDelete(row.id)}>
                  <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title="新建表单" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)} okText="创建">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="表单名称" value={name} onChange={e => setName(e.target.value)} />
          <Input.TextArea placeholder="描述（可选）" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
        </Space>
      </Modal>
    </Card>
  )
}
```

注：`http` 返回值直接是响应 data（拦截器已解包），与 `src/apis/dict.ts` 调用方一致；若 `res.list` 类型对不上，参照 `src/pages/index/system/dict.tsx` 的实际取值方式调整。

- [x] **步骤 3：创建 src/pages/index/form/design.tsx**

```tsx
import type { FormSchema } from '@zealous-admin/form-designer/index'
import { FormDesigner } from '@zealous-admin/form-designer/index'
import { useAppMessage } from '@zealous-admin/layout/index'
import { Spin } from 'antd'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getFormDetailAPI, updateFormAPI } from '@/apis/form'

export default function FormDesignPage() {
  const { message } = useAppMessage()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('id'))
  const [loading, setLoading] = useState(!!id)
  const [initialSchema, setInitialSchema] = useState<FormSchema | undefined>()

  useEffect(() => {
    if (!id)
      return
    getFormDetailAPI(id).then((res) => {
      if (res.schema) {
        try {
          setInitialSchema(JSON.parse(res.schema))
        }
        catch {
          message.warning('已存 schema 解析失败，将重新设计')
        }
      }
    }).finally(() => setLoading(false))
  }, [id])

  const handleSave = async (schema: FormSchema) => {
    await updateFormAPI({ id, schema: JSON.stringify(schema) })
    message.success('保存成功')
  }

  if (loading)
    return <Spin style={{ display: 'block', margin: '120px auto' }} />

  return (
    <div style={{ height: 'calc(100vh - 120px)' }}>
      <FormDesigner initialSchema={initialSchema} onSave={id ? handleSave : undefined} />
    </div>
  )
}
```

- [x] **步骤 4：创建 src/pages/index/form/render.tsx**

```tsx
import type { FormSchema } from '@zealous-admin/form-designer/index'
import { FormRenderer } from '@zealous-admin/form-designer/index'
import { useAppMessage } from '@zealous-admin/layout/index'
import { Card, Empty, Spin } from 'antd'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getFormDetailAPI } from '@/apis/form'

export default function FormRenderPage() {
  const { message } = useAppMessage()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('id'))
  const [loading, setLoading] = useState(true)
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    getFormDetailAPI(id).then((res) => {
      setName(res.name)
      if (res.schema)
        setSchema(JSON.parse(res.schema))
    }).finally(() => setLoading(false))
  }, [id])

  if (loading)
    return <Spin style={{ display: 'block', margin: '120px auto' }} />
  if (!schema)
    return <Empty description="未找到表单或尚未保存设计" />

  return (
    <Card title={`渲染测试：${name}`} style={{ maxWidth: 860, margin: '0 auto' }}>
      <FormRenderer
        schema={schema}
        onSubmit={(values) => {
          setSubmitted(JSON.stringify(values, null, 2))
          message.success('提交成功')
        }}
      />
      {submitted && (
        <pre style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6, maxHeight: 320, overflow: 'auto' }}>
          {submitted}
        </pre>
      )}
    </Card>
  )
}
```

- [x] **步骤 5：手动验收（P4 验收）**

1. `pnpm dev` + `cd service && pnpm dev` 同时启动
2. 侧边菜单"表单设计 > 表单管理"可见可进入
3. 新建表单 → 自动打开设计页 → 拖入若干字段（含 Row/Col 嵌套）→ 保存
4. 回到列表（schema 已存库，version=2），再次进入设计页，画布还原
5. 点"渲染"，填写并提交，values 结构与 field 命名一致
6. 删除表单，列表刷新

- [x] **步骤 6：全量检查 + Commit**

```bash
pnpm lint
```

确认全仓库无新增 lint 错误后：

```bash
git add src/apis/form.ts src/pages/index/form packages/form-designer service
git commit -m "feat: 表单管理/设计/渲染演示页，打通设计器存取闭环"
```

---

## 自检结果（编写后已执行）

- **规格覆盖度**：P1（T1–T7）、P2（T8 + T7 配置面板 + T4 预览/导入导出）、P3（T9、T10）、P4（T11、T12）均有对应任务。P5（子表单+高级组件）不在本计划范围，后续单独计划。
- **占位符扫描**：`renderField` 的 value/onChange 注入方案在 T8 步骤 5 给出"以此为准"的最终版；`RadioButtonUncheckedOutlined`、`RobotOutlined` 两个图标给了替代方案说明；dict 类型导入给了参照来源。其余无 TODO/待定。
- **类型一致性**：`DropTarget`、`ConfigMeta`、`ComponentDef.render(schema, children)`、`useDesignerStore` 各 action 签名在 T3/T4/T6/T7/T8 间一致；`ValidateRule.type` 取值（required/email/url/number/regexp）在 schema.ts、ValidateEditor、renderField 三处一致。
