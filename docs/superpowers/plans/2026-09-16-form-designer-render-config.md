# 渲染项配置补齐 实现计划（批次 3）

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 补齐渲染项（字段级）配置 —— 字段级栅格 `col`、校验规则扩展与 `trigger`、声明式**数据来源**（静态 / 字典 / 宿主注册接口，含 `{{字段}}` 插值、依赖重跑、竞态收口）、以及**联动** `control`（按值控制隐藏 / 禁用 / 必填）。

**架构：** 四项都是 `FieldSchema` 的增量字段，运行时行为集中在渲染器：`col` 在 `renderField` 外层包 `<Col>`（画布由 `canvasShellStyle` 镜像）；`dataSource` 由一个 `useFieldDataSource` 钩子解析并取数，结果经 `FieldControl` 合并进 `schema.props.options`；`control` 由一个纯函数按当前值算出有效态，覆盖 `hidden` / `disabled` / `required`。包**不得**依赖 `@zealous-admin/layout` 或 `src/apis` —— 字典与业务接口一律走宿主注册表 `registerFormDataApis`。

**技术栈：** React 19 + antd 6 + zustand + Vitest（jsdom）。批次 3 **不新增依赖**。

---

## 与参照实现的对照（`../form-manage.web`，form-create Pro）

| 能力 | 参照实现 | 本计划的取舍 |
|---|---|---|
| 字段级栅格 | `formCreateCol>span` + `xs/sm/md/lg/xl` | 采用，落在 `field.col`（字段自带，不必再拖 `row`+`col` 容器） |
| 数据来源 | `rule.effect.fetch`（action/method/query/data/parse/to） | 采用「声明式来源」，但**接口只接受宿主注册名**（不填裸 URL），保证鉴权与错误处理走统一 `http` |
| 依赖重跑 | `{{字段}}` 插值 + `watchData` 深度 watch + 600ms 防抖 | 采用，**补 AbortController 与后写胜**（参照实现裸 XHR，无取消、无竞态防护） |
| 校验 | 18 种类型 + `trigger` + 自定义 `validator` + `computed` | 采用类型与 `trigger`；自定义校验复用**公共事件表**（`events.custom`），不新开一套 |
| 联动 | `rule.control = [{value, condition, rule, method}]` | 采用，收敛为 `control: [{ field, operator, value, effects }]`；条件必填由 `effects: ['required']` 表达 |

**该软件为商业授权版**，只对齐能力与数据模型，不复制实现代码。

## 前置（已完成，勿重做）

批次 1、2 已落地：schema `version: 2` 与 `parseSchema()` 单一解析入口（含事件形状校验）、全局配置与 antd 透传白名单、事件钩子引擎（`events/`）、渲染器 12 场景接线、设计器「表单」页签三段面板。当前基线：**18 个测试文件 / 243 用例**全绿。

---

## 文件结构

**新增**

| 文件 | 职责 |
|---|---|
| `packages/form-designer/renderer/colProps.ts` | `field.col` → antd `Col` 属性；画布外壳复用同一换算 |
| `packages/form-designer/renderer/dataApis.ts` | 宿主注册表：`registerFormDataApis` / `getFormDataApi`（字典与业务接口的唯一入口） |
| `packages/form-designer/renderer/interpolate.ts` | `{{字段}}` 插值（纯函数，支持嵌套名路径） |
| `packages/form-designer/renderer/useFieldDataSource.ts` | 解析来源 → 插值 → 取数 → 竞态收口 → 返回 `{ options, loading }` |
| `packages/form-designer/renderer/control.ts` | `control` 规则求值（纯函数）：返回 `{ hidden, disabled, required }` |
| `packages/form-designer/designer/ColEditor.tsx` | 字段级栅格配置（span 预设 + 响应式断点） |
| `packages/form-designer/designer/DataSourceEditor.tsx` | 数据来源配置（静态 / 字典 / 接口 + 依赖字段 + 防抖） |
| `packages/form-designer/designer/ControlEditor.tsx` | 联动规则配置 |

**修改**

| 文件 | 改动 |
|---|---|
| `packages/form-designer/types/schema.ts` | `FieldCol` / `DataSourceDef` / `FieldDataSource` / `ControlRule`；`ValidateRule` 扩类型 + `trigger`；`FieldSchema` 加 `col` / `dataSource` / `control`；`FormSchema.dataSources` 收敛为 `Record<string, DataSourceDef>` |
| `packages/form-designer/renderer/toAntdRules.ts` | 新规则类型映射 + `trigger` |
| `packages/form-designer/renderer/renderField.tsx` | 有 `col` 时包 `<Col>` |
| `packages/form-designer/renderer/FieldControl.tsx` | 合并数据源加载出的 `options` |
| `packages/form-designer/renderer/FormRenderer.tsx` | 接线 `beforeLoadData` / `afterLoadData` / `onReload` 场景；`ctx.reload` 落地；把值交给 `control` 求值 |
| `packages/form-designer/registry/components/layout.tsx` | `col` 组件的 `canvasShellStyle` 复用 `colProps` |
| `packages/form-designer/utils/parseSchema.ts` | 校验 `dataSources` / `col` / `control` / 新校验规则形状；迁移无需变（仍是 v2 增量） |
| `packages/form-designer/utils/fieldName.ts` | 新增 `validateSchemaShape` 汇总点（把 col/control/dataSource 的校验并进既有拦截） |
| `packages/form-designer/designer/RightPanel.tsx` | 属性面板接入三个新编辑器 |
| `packages/form-designer/designer/FormDesigner.tsx` | 保存拦截纳入新形状校验 |
| 文档 | `docs/form-designer/`（新增 `render-config.md`，并补 schema / designer）、两份 CHANGELOG、规格 §12.10 |

## 执行分片

- **批次 3A（任务 1–3）**：字段级栅格 + 校验扩展 + 属性面板 —— 纯本地、无网络，可与 3B 解耦独立验收。**本节结束是检查点。**
- **批次 3B（任务 4–6）**：数据来源 + 联动 + 文档。

---

## 任务 1：字段级栅格 `col`

**文件：** 创建 `renderer/colProps.ts` + `renderer/colProps.test.ts`；修改 `types/schema.ts`、`renderer/renderField.tsx`、`registry/components/layout.tsx`、`designer/ColEditor.tsx`（创建）、`designer/RightPanel.tsx`。

**设计：** `col` 是**字段自带**的栅格配置，渲染时把该字段包进 `<Col>`；画布用同一份换算作为外壳样式（与批次 1 的 `buildFormProps` 同理，**只留一个换算点**）。

收尾轮修正（实现以此为准）：

- 外壳样式改成**轴向无关**的 `{ width: pct, maxWidth: pct, flexShrink: 0 }`，不用 `flex: 0 0 X%` 简写 —— `flex-basis` 落在父容器的**主轴**上，而画布根是纵向 flex（`Canvas.tsx`）、`Row` 是横向 flex，同一份简写在两种父容器下含义不同（顶层字段会变成「限高」而不是「限宽」）。
- **画布只镜像 `span`**，不镜像断点：`xs` / `sm` / `md` / `lg` / `xl` 是媒体查询驱动、依赖真实视口宽度，画布没有可依据的宽度，断点效果只能在预览/业务页里看。面板断点行对此有提示。
- **已知限制**：`Col` 只在 flex 行父容器（`Row`）里才能真正并排；顶层字段设 `span` 只表现为「限宽 + 换行」。

- [x] **步骤 1：编写失败的测试**

```ts
// packages/form-designer/renderer/colProps.test.ts
import { describe, expect, it } from 'vitest'
import { fieldColProps, shellStyleFromCol } from './colProps'

describe('fieldColProps', () => {
  it('无 col 时返回 null（不包裹 Col）', () => {
    expect(fieldColProps(undefined)).toBeNull()
  })

  it('只给 span 时透传 span', () => {
    expect(fieldColProps({ span: 12 })).toEqual({ span: 12 })
  })

  it('响应式断点一并透传', () => {
    expect(fieldColProps({ span: 12, xs: 24, md: 8 })).toEqual({ span: 12, xs: 24, md: 8 })
  })

  it('空对象视为未配置', () => {
    expect(fieldColProps({})).toBeNull()
  })
})

describe('shellStyleFromCol', () => {
  it('span 换算成与轴向无关的宽度（不用 flex 简写）', () => {
    expect(shellStyleFromCol({ span: 6 })).toEqual({ width: '25%', maxWidth: '25%', flexShrink: 0 })
  })

  it('未配置时占满一行', () => {
    expect(shellStyleFromCol(undefined)).toEqual({ width: '100%', maxWidth: '100%', flexShrink: 0 })
  })
})
```

- [x] **步骤 2：运行测试验证失败**

运行：`cmd /c "node_modules\.bin\vitest.CMD run packages/form-designer/renderer/colProps.test.ts"`
预期：FAIL，`Cannot find module './colProps'`

- [x] **步骤 3：实现 `colProps.ts`**

```ts
import type { FieldCol } from '../types/schema'

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/** field.col → antd Col 属性；未配置或全空返回 null（调用方据此决定不包裹 Col） */
export function fieldColProps(col: FieldCol | undefined): Record<string, any> | null {
  if (!col)
    return null
  const props: Record<string, any> = {}
  if (col.span !== undefined)
    props.span = col.span
  for (const bp of BREAKPOINTS) {
    if (col[bp] !== undefined)
      props[bp] = col[bp]
  }
  return Object.keys(props).length ? props : null
}

/**
 * 画布外壳样式：span → 外壳宽度（与 layout.tsx 的 col 容器同一算法）。
 * 用 width + maxWidth + flexShrink 而不是 `flex: 0 0 X%`：flex-basis 落在父容器主轴上，
 * 画布根是纵向 flex、Row 是横向 flex，简写在两种父容器下含义不同；width 则始终是横向尺寸。
 * 断点不镜像（媒体查询依赖真实视口宽度），只镜像 span，断点效果请在预览里看。
 */
export function shellStyleFromCol(col: FieldCol | undefined) {
  const span = col?.span ?? 24
  const pct = `${(span / 24) * 100}%`
  return { width: pct, maxWidth: pct, flexShrink: 0 }
}
```

- [x] **步骤 4：运行测试验证通过**（预期 6 条）

- [x] **步骤 5：`types/schema.ts` 加类型**

```ts
/** 字段级栅格（渲染时自动包裹 Col；不配则与其他字段同处一行流） */
export interface FieldCol {
  span?: number
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
}

// FieldSchema 新增：
  /** 字段级栅格；设置后渲染器会为该字段包一层 Col */
  col?: FieldCol
```

- [x] **步骤 6：`renderField.tsx` 包裹 Col**（有 `col` 时；注意 `nestList` / 容器分支同样适用，包在外层）

```tsx
import { Col } from 'antd'
import { fieldColProps } from './colProps'

export function renderField(schema, renderChild, parentType?) {
  const def = getComponent(schema.type)
  if (!def)
    return <Alert type="warning" showIcon message={`未注册的组件类型：${schema.type}`} />

  const node = def.nestList
    ? <ListField def={def} schema={schema} renderChild={renderChild} />
    : def.isContainer
      ? <ContainerField def={def} schema={schema} renderChild={renderChild} />
      : def.noFormItem
        ? def.render(schema)
        : <FieldItem def={def} schema={schema} parentType={parentType} />

  const colProps = fieldColProps(schema.col)
  return colProps ? <Col {...colProps}>{node}</Col> : node
}
```

- [x] **步骤 7：`layout.tsx` 的 col 容器复用换算**：把 `canvasShellStyle` 改为 `schema => shellStyleFromCol({ span: schema.props.span ?? 24 })`，删掉本地重复的百分比算法。

- [x] **步骤 8：`ColEditor.tsx` + 属性面板接入**

```tsx
// designer/ColEditor.tsx：span 预设按钮（1/4=6、1/3=8、1/2=12、2/3=16、3/4=18、整行=24，再点同值置空）
// 加四个响应式断点输入（xs/sm/md/lg/xl，InputNumber 1–24，留空表示不设）
```

`RightPanel` 的 `FieldConfig` 在「基础」与「校验规则」之间插入「布局」分组（`ColEditor`），只在**能进入栅格**的节点上渲染（非 `noFormItem`）。

- [x] **步骤 9：补交互测试**（`FormDesigner.interaction.test.tsx`）：设置 span=12 后 `useDesignerStore.getState().schema.children[0].col.span === 12`；画布外壳带上对应 flex 样式。

- [x] **步骤 10：提交**（`feat(form-designer): 字段级栅格配置`）

## 任务 2：校验规则扩展与 `trigger`

**文件：** 修改 `types/schema.ts`、`renderer/toAntdRules.ts`（+测试）、`designer/ValidateEditor.tsx`、`utils/parseSchema.ts`（形状校验）。

**设计：** 类型扩到 15 种（`len` / `maxLen` / `minLen` / `min` / `max` / `phone` / `ip` / `integer` / `uppercase` / `lowercase` 新增），每条规则支持 `trigger: 'blur' | 'change' | 'submit'`（**不写则沿用 antd 默认时机：值变化即校验**）。**不加** `validator` 内联函数（自定义校验放任务 3，复用公共事件表）。

```ts
export type ValidateRuleType
  = | 'required' | 'email' | 'url' | 'number' | 'regexp'
    | 'len' | 'maxLen' | 'minLen' | 'min' | 'max'
    | 'phone' | 'ip' | 'integer' | 'uppercase' | 'lowercase'

export interface ValidateRule {
  type: ValidateRuleType
  message?: string
  /** 仅 regexp 使用 */
  pattern?: string
  /** len / maxLen / minLen / min / max 的阈值 */
  value?: number
  /** 触发时机；不写则沿用 antd 默认（值变化即校验） */
  trigger?: 'blur' | 'change' | 'submit'
}
```

要点：
1. `toAntdRules` 里 `number` 是 antd 的 `type: 'number'`（要求值为 number），而 `min` / `max` / `len` 等是**独立规则**（`{ min }` / `{ max }` / `{ len }` / `{ min: n, type: 'string' }` 语义差异）——实现时以 antd `Rule` 类型为准，逐个写清并各配一条测试（**不要照抄参照实现的实现**）。实现落地：`len` / `minLen` / `maxLen` 钉 `type: 'string'` 走字符串长度语义，`min` / `max` 钉 `type: 'number'` 走数值语义（理由与组件语境提示见 `renderer/toAntdRules.ts` 注释与 `designer/ValidateEditor.tsx`）。
2. `phone` / `ip` 用内置 pattern 常量（`/^1[3-9]\d{9}$/`、IPv4 正则），`integer` 用 `/^-?\d+$/`，`uppercase` / `lowercase` 用 `/^[A-Z]+$/`、`/^[a-z]+$/` —— 常量集中在 `toAntdRules.ts` 顶部并注释。
3. `trigger` 透传到 antd rule 的 `validateTrigger`（实现里映射为 antd 的字段事件名 `onBlur` / `onChange` / `onSubmit`）；规则级 `validateTrigger` 是字段级时机的子集，声明了 `blur` 的字段会把 `onBlur` 并入 `Form.Item.validateTrigger`，未配 `trigger` 时不写该字段。提交时 antd 仍会全量校验（`trigger: 'submit'` 的规则只在提交时校验）。
4. `parseSchema` 的 events 校验旁，新增**校验规则形状**校验：类型在枚举内、`value` 为数字（用到阈值的类型必填）、`pattern` 为字符串、`trigger` 在枚举内。复用「面向用户」的错误消息风格。

测试：每种新类型至少一条正反例（`toAntdRules` 纯函数级）；`trigger` 透传；`parseSchema` 拒绝非法类型 / 缺 `value` / 非法 `trigger`。

- [x] **提交**：`feat(form-designer): 校验规则扩展与 trigger`

## 任务 3：自定义校验（复用公共事件表）+ 面板

**文件：** 修改 `types/schema.ts`、`renderer/toAntdRules.ts`、`renderer/FormRenderer.tsx`、`designer/ValidateEditor.tsx`、`utils/parseSchema.ts`。

**设计：** 自定义校验不新开一套 API，**复用批次 2 的公共事件表**（`events.custom`）：

```ts
  /** 自定义校验：引用公共事件表；与 fn 二选一（fn 优先，与 HookRef 同规则） */
  | { type: 'validator', hook?: string, fn?: FnSource }
```

执行约定（写进 `toAntdRules` 的注释与文档）：钩子拿到 `ctx.payload = { value, formValue }`，**返回 `true`/`undefined` 通过**；返回 `false` 用默认文案 `${label}校验未通过`；返回字符串则作为错误消息；抛错视为不通过（并走既有 `notifyError` 上报）。

要点：
- `toAntdRules` 需要 `events.custom` 与 `validateFnSource` 的编译能力 → 让 `toAntdRules(schema, custom?)` 多收一个可选参数（保持向后兼容：不传则 `validator` 规则被忽略并 `console.warn` 一次）。
- `FormRenderer` 把 `schema.events?.custom` 传下去。
- 面板：`ValidateEditor` 的类型下拉加「自定义校验」，选中后提供「引用公共事件」下拉（列出 `custom` 名字）与内联正文编辑器（复用 `HookEditor`）。

测试：validator 返回 `true` / 字符串 / `false` / 抛错四条；非法引用（名字不存在）不抛错且视为通过（并 warn）；`parseSchema` 校验 `validator` 规则形状。

- [x] **提交**：`feat(form-designer): 自定义校验引用公共事件`

> **检查点：** 批次 3A 到此可独立验收（栅格 + 校验，无网络依赖）。建议先跑全量测试与 `pnpm docs:build` 再进 3B。

### 3A 收尾轮遗留（留给 3B，届时一并处理）

- `toAntdRules.ts` 拆成 `ruleShape` / `ruleTrigger` / `validatorRule` 三块 —— 3B 本来就要动这个文件。
- `ValidateRule` 改成判别联合（`ValidateRule | ValidatorRule`），把「`hook` / `fn` 仅 `validator` 生效」落到类型上；现在只靠注释与 `parseSchema` 的宽松检查（非 `validator` 类型带上 `hook` 会被运行时忽略，已知不拦）。
- 「长度组 / 数值组」的元数据表：面板提示与 antd 映射共用一份，避免两处枚举分叉。
- `validator` 引用的公共事件被删除后，面板提示「已不存在」；现在只在运行时 `warnOnce` 并视为通过。
- **已知限制**：`Col` 只在 flex 行父容器（`Row`）里才能真正并排，顶层字段设 `span` 只表现为「限宽 + 换行」；画布外壳也只镜像 `span`，断点效果要到预览 / 业务页才看得到。

---

## 任务 4：声明式数据来源

**文件：** 创建 `renderer/dataApis.ts`、`renderer/interpolate.ts`、`renderer/useFieldDataSource.ts`（各配 `.test.ts`）；修改 `types/schema.ts`、`renderer/FieldControl.tsx`、`renderer/FormRenderer.tsx`、`designer/DataSourceEditor.tsx`（创建）、`designer/RightPanel.tsx`、`utils/parseSchema.ts`。

**设计要点（与参照实现的三处关键差异）：**

1. **接口只接受宿主注册名**，不填裸 URL —— 保证鉴权、错误提示、loading 走统一 `http` 实例；包不依赖 `layout` / `src/apis`。
2. **补竞态收口**：参照实现裸 XHR 无取消、无竞态防护；我们用「请求序号 + 后写胜」+ `AbortController`（宿主函数可接收 `signal`）。
3. **依赖重跑用显式 `watch`**（名路径数组），不隐式扫描模板串 —— 更可预测，且与批次 2 的 `watch` 语义一致。

**类型：**

```ts
export interface FieldOption { label: string, value: string | number, disabled?: boolean }

export type DataSourceDef =
  | { type: 'static', options: FieldOption[] }
  | { type: 'dict', dictType: string, labelField?: string, valueField?: string }
  | { type: 'api', api: string, params?: Record<string, string>, parse?: string }

export interface FieldDataSource {
  /** 引用 schema.dataSources 命名表；与 def 二选一，def 优先（与 HookRef 同规则） */
  ref?: string
  def?: DataSourceDef
  /** 依赖字段（名路径，支持 contact.name）：这些字段变化时重新取数 */
  watch?: string[]
  /** 防抖 ms，默认 300 */
  debounce?: number
}

// FieldSchema 新增：
  /** 声明式选项来源：加载结果写入 props.options */
  dataSource?: FieldDataSource

// FormSchema.dataSources 收敛为：
  dataSources?: Record<string, DataSourceDef>
```

- [x] **步骤 1：宿主注册表（`dataApis.ts`）**

```ts
/** 宿主注册的数据接口签名：params 已完成插值；signal 用于取消（可选实现） */
export type FormDataApi = (params: Record<string, any>, signal?: AbortSignal) => Promise<any>

const apis = new Map<string, FormDataApi>()

/** 业务侧注册数据接口（字典、组织树、业务查询…），包本体不发起任何请求 */
export function registerFormDataApis(map: Record<string, FormDataApi>): void {
  for (const [name, fn] of Object.entries(map))
    apis.set(name, fn)
}

export function getFormDataApi(name: string): FormDataApi | undefined {
  return apis.get(name)
}
```

`index.ts` 导出 `registerFormDataApis`（宿主唯一入口）。测试：注册后可取、未注册返回 `undefined`、同名覆盖。

- [x] **步骤 2：插值（`interpolate.ts`，纯函数）**

```ts
/** 把 "{{a.b}}/固定值" 中的 {{名路径}} 替换成当前值；缺失替换为空串 */
export function interpolate(template: string, values: Record<string, any>): string
/** 递归处理 params / headers 等字符串值 */
export function interpolateDeep<T>(input: T, values: Record<string, any>): T
```

测试：顶层、嵌套（`contact.name`）、缺失、混合固定文本、非字符串原样返回。

- [x] **步骤 3：取数钩子（`useFieldDataSource.ts`）**

核心行为（完整实现写入文件，测试覆盖每条）：

1. 解析来源：`def` 优先，否则按 `ref` 查 `schema.dataSources`；两者皆无 → 不加载
2. 触发时机：挂载后加载一次；`watch` 命中的字段变化时**防抖**重新加载（默认 300ms）
3. 取数：`static` 直接用；`dict` → 调 `getFormDataApi('dict')`（宿主注册，参数 `{ dictType }`），按 `labelField`/`valueField` 映射（默认 `dictLabel`/`dictValue`）；`api` → 调 `getFormDataApi(def.api)`，`params` 经 `interpolateDeep` 后传入
4. **竞态收口**：自增请求序号，只有最新序号的结果被采用（后写胜）；重新加载或卸载时 `AbortController.abort()` 上一请求
5. **场景钩子**：请求前触发 `beforeLoadData`（关键场景，`return false` 可中断本次加载；`ctx.payload = { config }`）、返回后触发 `afterLoadData`（`ctx.payload = { config, result }`）
6. 失败：`console.error` + 稳定 key 的 message 提示，**保留上一次的 options**（不清空，避免用户已选值对应的标签消失）

返回值：`{ options, loading }`；无来源时 `options` 为 `undefined`（调用方保持 `schema.props.options` 原样）。

- [x] **步骤 4：接进渲染（`FieldControl.tsx`）**

```tsx
export function FieldControl({ def, schema, ...injected }) {
  const { options } = useFieldDataSource(schema)
  const merged = options ? { ...schema.props, options } : schema.props
  return <>{def.render({ ...schema, props: { ...merged, ...injected } })}</>
}
```

（`injected` 是 `Form.Item` 注入的受控 props，仍最后合并，保持既有优先级。）

- [x] **步骤 5：渲染器接线 `ctx.reload` 与三个场景**

`FormRenderer` 内新增一个「重载信号」state（`Map<fieldId, number>` 或单一版本号 + 可选字段名）：`ctx.reload(field?)` 递增版本号 → 命中的 `useFieldDataSource` 重新取数；取值 `onReload` 场景在**手动 reload** 时触发（区别于字段变化触发的自动重载）。

注意：`beforeLoadData` / `afterLoadData` 的钩子来自 `schema.events`，`useFieldDataSource` 需要拿到它们与 `buildCtx` —— 通过一个轻量 context（`FormHooksContext`）从 `FormRenderer` 下发，避免逐层传参。

- [x] **步骤 6：面板（`DataSourceEditor.tsx`）**

三段：来源类型（静态 / 字典 / 接口 / 引用命名数据源）、对应参数（静态用 `OptionsEditor`；字典填 `dictType` + 可选字段映射；接口选注册名 + `params` 键值对 + 可选 `parse`）、依赖与防抖（`watch` 多选当前 schema 的所有字段名 + `debounce` 数字）。

「接口」下拉的来源：包不知道宿主注册了哪些名字 → 由宿主注入可选清单 `registerFormDataApis` 的第二个参数或独立 `setFormDataApiCatalog(names)`；未注入时退化为自由文本输入并提示。

测试：解析优先级（def 优先于 ref）、插值、竞态后写胜、`beforeLoadData` 返回 false 中断、失败保留旧 options、`ctx.reload()` 触发重载、面板写入 store 的形状。

- [x] **步骤 7：形状校验（`parseSchema`）**

`validateFieldRules(children, dataSources?)` 单一 walk 内校验 `dataSource`（`type` 在枚举内、`api` / `dictType` / `ref` 非空、`static.options` 是每项带 `label` / `value` 的数组、`def` 与 `ref` 至少一个、`watch` 字符串数组、`debounce` 非负数）与 `schema.dataSources` 命名表；设计器保存 / 导出拦截与解析侧共用同一份口径。

提交：`feat(form-designer): 声明式数据来源与依赖重载`

## 任务 5：联动 `control`

**文件：** 创建 `renderer/control.ts` + `control.test.ts`；修改 `types/schema.ts`、`renderer/FormRenderer.tsx`、`renderer/FieldItem.tsx`、`designer/ControlEditor.tsx`（创建）、`designer/RightPanel.tsx`、`utils/parseSchema.ts`。

**类型与语义：**

```ts
export interface ControlRule {
  /** 条件依赖的字段（名路径） */
  field: string
  /** 比较方式，默认 eq */
  operator?: 'eq' | 'neq' | 'in' | 'empty' | 'notEmpty'
  /** operator 为 in 时为数组 */
  value?: any
  /** 条件命中时施加的效果，可多选 */
  effects: ('hidden' | 'disabled' | 'required')[]
}

// FieldSchema 新增：
  /** 联动规则：条件命中时控制隐藏 / 禁用 / 必填；多条规则的效果取「或」 */
  control?: ControlRule[]
```

- [x] **步骤 1：纯函数求值（`control.ts`）**

```ts
export interface EffectiveState { hidden?: boolean, disabled?: boolean, required?: boolean }

/** 按当前值求字段的有效态；无规则返回空对象（调用方按未配置处理） */
export function evalControl(rules: ControlRule[] | undefined, values: Record<string, any>): EffectiveState

/** 取名路径值（支持 contact.name） */
export function getByPathName(values: Record<string, any>, path: string): any
```

语义：同一规则内的效果全生效；多条规则的效果**取或**（任一规则命中即生效）；`required` 与字段自身的 `formItem.required` **取或**；`hidden` 采用 antd `Form.Item hidden`（值仍保留在表单里）。

测试：五种 operator、嵌套名路径、多规则取或、与自身 `required` 取或、无规则返回 `{}`、非法 operator 视为 `eq`。

- [x] **步骤 2：渲染器应用**

`FormRenderer` 在 `onValuesChange` 时（并首次渲染）算出每个字段的有效态，经 context 下发；`FieldItem` 读取并覆盖：

```tsx
  hidden={effective.hidden ?? schema.formItem?.hidden}
  rules={toAntdRules(schema, { required: effective.required })}
```

`disabled` 需要作用到组件本身 → 由 `FieldControl` 在合并 props 时覆盖 `disabled`（与数据源 `options` 合并同一处）。**注意**：容器节点（`nestObject` / `nestList`）的 `disabled` 要下发给子字段 —— 用 context 传递「父级禁用」，`FieldItem` 里取或。

- [x] **步骤 3：面板（`ControlEditor.tsx`）**：规则列表，每条选依赖字段（下拉当前 schema 字段名）、operator、value（按 operator 切控件）、effects（多选。`required` 与 `formItem.required` 都在时提示后者冗余）。

- [x] **步骤 4：形状校验**：`parseSchema` 校验 `control`（`field` 非空字符串、`operator` 在枚举内、`effects` 非空且在枚举内、`in` 时 `value` 为数组）。

提交：`feat(form-designer): 字段联动规则`

## 任务 6：文档与变更日志

**文件：** 创建 `docs/form-designer/render-config.md`；修改 `docs/form-designer/schema.md`、`docs/form-designer/designer.md`、`docs/form-designer/index.md`、`docs/.vitepress/config.ts`、`docs/superpowers/specs/2026-09-07-form-designer-design.md`（§12.10）、`CHANGELOG.md`、`docs/CHANGELOG.md`。

要点：
- `render-config.md`：字段级栅格（span 与响应式断点、画布与运行态同源的说明）、校验规则类型表与 `trigger` 语义、自定义校验的返回约定（`true`/字符串/`false`/抛错）与「复用公共事件表」的理由、数据来源三种类型 + 宿主注册方式（`registerFormDataApis` 代码示例）+ `{{}}` 插值 + `watch`/`debounce` + 竞态与失败降级行为、联动 `control` 的 operator 表与「效果取或」语义、以及已知限制。
- `schema.md`：补 `col` / `dataSource` / `control` / 扩后的 `ValidateRule` 与 `dataSources` 收敛后的类型，并在「形状约束」里加对应条目。
- `designer.md`：属性面板新增三个分组（布局 / 数据来源 / 联动）的说明。
- 两份 CHANGELOG 在既有日期节追加（若已跨日则新建 `## 2026-09-16`）。
- 规格 §12.10：回写本批次实现偏差（尤其：数据来源只接受宿主注册名、补了竞态收口、`control` 的条件必填用 `effects` 表达、不引入参照实现的 `computed`）。

验证：`cmd /c "node_modules\.bin\vitest.CMD run"` 全绿、`cmd /c "pnpm docs:build"` 通过，并把文档里的 `FormSchema` 示例**抠出来跑一次 `parseSchema`**（沿用批次 2 的做法）。

提交：`docs(form-designer): 渲染项配置文档与批次 3 变更日志`

---

## 后续（不在本计划内）

- CodeMirror 6 编辑器（`HookEditor` 与自定义校验正文）
- 字段级钩子（`field.hooks`）
- 预览弹窗「执行钩子」开关
- 钩子执行超时（同步死循环 / 永不 resolve 的 promise 目前无护栏）
- 服务端 `POST /form/update` 的 schema 校验（§12.8 遗留）
