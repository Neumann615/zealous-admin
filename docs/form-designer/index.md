# 表单设计器

`@zealous-admin/form-designer` 是 zealous-admin 的自研低代码表单方案，采用**声明式组件注册表 + 单一真实渲染**架构：设计器画布与运行时表单共用同一份 `FormSchema` 和同一套注册组件，画布里搭出来的结构就是最终渲染出的表单，不存在「设计态一套、运行态另一套」的双份实现。

## 核心组成

| 模块 | 说明 |
|------|------|
| `FormDesigner` | 三栏可视化设计器（组件面板 / 画布 / 属性面板），拖拽搭建 + 撤销重做 + 导入导出 + 实时预览 |
| `FormRenderer` | 运行时渲染器，吃一份 `FormSchema` 输出可直接使用的 antd `Form` |
| `registry` | 组件注册表，37 个内置组件分 5 组，`registerComponent` 可无侵入扩展 |
| `types/schema` | `FormSchema` / `FieldSchema` / `ValidateRule` 类型与 `createEmptySchema()` |
| `designer/store` | Zustand 设计器状态：schema 树、选中态、历史栈（上限 50 步） |

字段级配置（栅格 `col`、校验规则、数据来源 `dataSource`、联动 `control`）见[渲染项配置](/form-designer/render-config)。

## 目录结构

```
packages/form-designer
├── index.ts                    # 对外导出入口
├── types/schema.ts             # FormSchema / FieldSchema / ValidateRule / createEmptySchema
├── registry
│   ├── registry.ts             # registerComponent / getComponent / getMenus / ComponentDef
│   └── components              # 内置组件声明：basicInput、selectFamily、dateTime、choice、
│                               #   aide、layout、advanced、subForm（import 即完成注册）
├── designer
│   ├── FormDesigner.tsx        # 三栏外壳 + 拖拽事件分发 + 快捷键
│   ├── Toolbar.tsx             # 撤销 / 重做 / 导入 / 导出 / 清空 / 预览 / 保存
│   ├── LeftPanel.tsx           # 组件面板（分组折叠 + 关键字搜索）
│   ├── Canvas.tsx              # 画布（撑满容器宽度，空态落点撑满整块画布）
│   ├── CanvasItem.tsx          # 画布字段外壳（选中 / 拖拽 / 复制 / 删除）
│   ├── DropGap.tsx             # 拖拽落点（支持横向落点与空态落点）
│   ├── RightPanel.tsx          # 「属性」「表单」两个页签
│   ├── ConfigFormRenderer.tsx  # configForm meta → 配置控件
│   ├── OptionsEditor.tsx       # 选项列表编辑器
│   ├── ValidateEditor.tsx      # 校验规则编辑器
│   ├── ColEditor.tsx           # 字段级栅格编辑器
│   ├── DataSourceEditor.tsx    # 数据来源编辑器（静态 / 字典 / 接口 / 命名引用）
│   ├── dataSourceType.ts       # 数据来源归一化纯函数（切类型丢弃无关字段）
│   ├── ControlEditor.tsx       # 联动规则编辑器
│   ├── controlRule.ts          # 联动规则归一化纯函数（切 operator 归一化 value）
│   ├── useRemoveField.ts       # 删除统一入口（含子字段的容器二次确认）
│   └── store.ts                # Zustand：schema + 选中态 + 历史栈 + 连续编辑合并
├── renderer
│   ├── FormRenderer.tsx        # 运行时入口
│   ├── renderField.tsx         # 单字段渲染分发（未注册类型降级为警告块）
│   ├── FieldItem.tsx           # Form.Item 分支（名路径 + 校验 + label 特化）
│   ├── FieldControl.tsx        # 把 Form.Item 注入的受控 props、数据源选项、联动 disabled 并入 schema.props
│   ├── ContainerField.tsx      # 容器分支（nestObject 下发名路径前缀）
│   ├── ListField.tsx           # 数组容器分支（Form.List 驱动行增删）
│   ├── namePrefix.ts           # 名路径 context 与 joinName
│   ├── toAntdRules.ts          # ValidateRule → antd Rule
│   ├── colProps.ts             # col → antd Col 属性 / 画布外壳宽度
│   ├── dataApis.ts             # 宿主注册的数据接口表（registerFormDataApis）
│   ├── interpolate.ts          # {{名路径}} 插值（纯函数）
│   ├── useFieldDataSource.ts   # 数据来源取数：竞态收口 / 依赖重跑 / 降级
│   └── control.ts              # 联动规则求值（纯函数）
└── utils                       # schemaTree / path / uniqueId
```

## 快速开始

### 设计器

```tsx
import type { FormSchema } from '@zealous-admin/form-designer/index'
import { createEmptySchema, FormDesigner } from '@zealous-admin/form-designer/index'

export default function DesignPage() {
  const handleSave = async (schema: FormSchema) => {
    await saveToServer(JSON.stringify(schema))
  }

  return (
    <div style={{ height: '100%' }}>
      <FormDesigner initialSchema={createEmptySchema()} onSave={handleSave} />
    </div>
  )
}
```

`initialSchema` 按**引用身份**变化重新装载：同一组件实例切换编辑不同表单时，请配合 `key={表单id}` 强制重建，否则画布会残留上一张表单的字段。

### 渲染器

```tsx
import { FormRenderer, parseSchema } from '@zealous-admin/form-designer/index'

<FormRenderer
  schema={parseSchema(record.schema)}
  initialValues={{ name: '张三' }}
  onSubmit={values => console.log(values)}
/>
```

`record.schema` 是服务端下发的 JSON 字符串，不要自己 `JSON.parse` 后直接用：`parseSchema` 会做版本迁移与形状校验（见[解析与迁移](/form-designer/schema#解析与迁移)）。

## 导出清单

```tsx
// 组件
import { FormDesigner, FormRenderer } from '@zealous-admin/form-designer/index'

// 注册表
import { getComponent, getMenus, registerComponent } from '@zealous-admin/form-designer/index'

// 数据来源：注册宿主接口（字典 / 业务查询），可选提供接口名清单
import { registerFormDataApis, setFormDataApiCatalog } from '@zealous-admin/form-designer/index'

// schema
import { createEmptySchema, parseSchema, SCHEMA_VERSION } from '@zealous-admin/form-designer/index'

// 类型
import type {
  ComponentDef,
  ConfigMeta,
  ControlRule,
  DataSourceDef,
  FieldSchema,
  FormGlobalConfig,
  FormRendererProps,
  FormDesignerProps,
  FormSchema,
  ListRenderCtx,
  MenuGroup,
  FieldDataSource,
  ValidateRule,
} from '@zealous-admin/form-designer/index'
```

包本身不依赖 `@zealous-admin/layout`（保证可独立复用），弹窗与提示统一走 antd 的 `App.useApp()`，因此外层需要包一个 antd `App`。

## 演示页

示例应用内置一套完整闭环（`src/pages/index/form/`）：

| 路由 | 说明 |
|------|------|
| `/form/list` | 表单管理：新建、按名称搜索、设计、渲染、发布 / 下线、删除 |
| `/form/design?id=1` | 设计器页：装载已存 schema，保存写回后端；无 id 时为空白设计 |
| `/form/render?id=1` | 渲染测试页：装载 schema 并在提交后展示 JSON 数据 |

页面之间通过 `useControlTab().openTab` 打开新标签，列表页的「设计」「渲染」按钮按行 id 跳转。

## 后端接口

`service/src/routes/form.ts`（Express 5 + `node:sqlite`，全部接口需登录态）：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/form/list` | 分页列表，支持 `keyword` 按名称模糊搜索，按 `update_time` 倒序；列表不返回 `schema` |
| GET | `/form/detail?id=` | 详情，含 `schema` 字符串 |
| POST | `/form/create` | 新建（`name` 必填、`description` 可选），初始 `status: 0`、`version: 1`、`schema: ''` |
| POST | `/form/update` | 更新 `name` / `description` / `schema` / `status`，未传字段保持原值；传 `schema` 时 `version` 自增 |
| POST | `/form/delete` | 按 `id` 删除 |

数据表 `za_form`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `name` | TEXT NOT NULL | 表单名称 |
| `description` | TEXT | 描述 |
| `schema` | TEXT | `FormSchema` 的 JSON 字符串 |
| `status` | INTEGER | 0 草稿 / 1 已发布 |
| `version` | INTEGER | 版本号，schema 变更时 +1 |
| `create_time` / `update_time` | TEXT | 时间戳字符串 |

前端 API 封装见 `src/apis/form.ts`，响应字段已由服务端统一转小驼峰。

## 延伸阅读

- [Schema 结构与名路径](/form-designer/schema) — 数据结构、校验规则、嵌套提交结构
- [渲染项配置](/form-designer/render-config) — 字段级栅格、校验规则、数据来源与联动
- [组件清单与注册](/form-designer/components) — 37 个内置组件与 `registerComponent` 扩展
- [设计器与渲染器](/form-designer/designer) — 交互、快捷键、配置面板、已知限制
- [事件钩子](/form-designer/events) — 12 个表单级场景、命名公共事件、`ctx` API 与风险边界
- [数据落库与查询](/form-designer/data) — `za_form_data` 表、接口与数据管理页
