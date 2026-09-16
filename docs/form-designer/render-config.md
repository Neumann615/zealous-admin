# 渲染项配置

字段级（渲染项）配置都挂在 `FieldSchema` 上，由渲染器消费：

| 配置 | 位置 | 作用 |
|------|------|------|
| 栅格 | `col` | 该字段包一层 antd `Col`，参与父容器的栅格 |
| 校验规则 | `formItem.rules` | 转成 antd `Rule`，含触发时机与自定义校验 |
| 数据来源 | `dataSource` | 静态 / 字典 / 宿主注册接口，取数结果写进 `props.options` |
| 联动 | `control` | 按当前表单值控制字段的隐藏 / 禁用 / 必填 |

四项的形状校验统一在 `utils/parseSchema.ts`（见 [Schema 结构 · 形状约束](/form-designer/schema#形状约束)），设计器保存 / 导出与 `parseSchema()` 解析共用同一份口径。

## 字段级栅格 `col`

```ts
interface FieldCol {
  span?: number
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
}
```

渲染时 `renderField` 把该字段的**最外层**包进 `<Col {...fieldColProps(col)}>`——容器、数组容器与辅助组件同样适用，这样子表单 / 表格子表单才能整体参与父容器的栅格（`renderer/colProps.ts`）。

面板「布局」分组提供 span 预设（1/4、1/3、1/2、2/3、3/4、整行）与五个响应式断点输入；再次点击当前预设会取消该项，全部为空时整体回传 `undefined`（不留下 `col: {}` 这种噪声）。

两条务必知道的限制：

- **画布只镜像 `span`**：画布外壳用 `shellStyleFromCol` 把 `span` 换算成与轴向无关的 `width / maxWidth / flexShrink`。`xs` / `sm` / `md` / `lg` / `xl` 由媒体查询驱动，依赖真实视口宽度，画布没有可依据的宽度 —— 断点效果请在**预览**（或业务页）里看。
- **`Col` 只在 flex 行父容器（`Row`）里才真正并排**：顶层字段设 `span` 只表现为「限宽 + 换行」。想要严格并排，请把字段放进 `row` 容器（或按 `col` 容器组合）。

## 校验规则 `formItem.rules`

### 类型与映射

```ts
interface ValidateRule {
  type: ValidateRuleType
  message?: string
  /** 仅 type 为 regexp 时使用 */
  pattern?: string
  /** len / maxLen / minLen / min / max 的阈值 */
  value?: number
  /** 触发时机；不写则跟随字段级时机（antd 默认 onChange） */
  trigger?: 'blur' | 'change' | 'submit'
  /** 仅 type 为 validator 时使用：引用 events.custom 的公共事件名 */
  hook?: string
  /** 仅 type 为 validator 时使用：内联函数体（与 hook 同时存在时 fn 优先） */
  fn?: FnSource
}
```

| type | 转成 antd | 备注 |
|------|-----------|------|
| `required` | `{ required: true }` | `formItem.required` 为真且规则里没有 `required` 时自动补一条并置于最前 |
| `email` / `url` / `number` | `{ type }` | `number` 要求值为 number 类型，只适用于数字输入 / 金额 / 滑块等数值组件；给文本输入配它会永远校验失败 |
| `regexp` | `{ pattern: new RegExp(pattern) }` | `pattern` 为空时该条被跳过（面板红字提示），非法正则跳过并 `console.warn` |
| `len` / `minLen` / `maxLen` | `{ type: 'string', len \| min \| max }` | **按字符长度**校验，只对文本类组件有意义；字段留空时不校验，需要必填请再加一条 `required` |
| `min` / `max` | `{ type: 'number', min \| max }` | **按数值大小**校验，只对数值组件有意义；字段留空时不校验 |
| `phone` / `ip` / `integer` / `uppercase` / `lowercase` | `pattern` | 用内置正则落地（`integer` 走字符串正则，因为文本输入框里输入的数字是字符串） |
| `validator` | `validator` 函数 | 自定义校验，见下 |

未显式填 `message` 时按类型兜底：`${label}不能为空` / `${label}格式不正确` / `${label}长度必须为 N` 等，`label` 缺失时用「该字段」。

### `trigger` 语义

规则级 `trigger` 是**字段级校验时机**的收窄：

| trigger | 映射到的 antd 字段事件 | 说明 |
|---------|----------------------|------|
| `change` | `onChange` | 与不写 `trigger` 时的 antd 默认行为一致 |
| `blur` | `onBlur` | 声明后会把 `onBlur` 并进 `Form.Item` 的 `validateTrigger`（默认只保留 `onChange`），否则该条规则永远不会跑 |
| `submit` | `onSubmit` | 提交走全量校验、此时不过滤规则，所以它天然「只在提交时生效」；不会给组件挂 `onSubmit` |

没有声明 `trigger` 的规则**不写** `validateTrigger`，即沿用 antd 默认（字段级时机 = `onChange`）。

### 自定义校验 `validator`

自定义校验**不新开一套函数 API**，而是复用批次 2 的公共事件表（`schema.events.custom`）：

- **写一次、多场景复用**：同一段校验既能被表单级场景钩子引用，也能被任意字段的校验规则引用
- **同一份编译器与错误上报**：`compileFn` 的结构化信封、记忆化、`notifyError` 去重都直接继承，不必维护第二套
- **入口收敛**：面板里「引用公共事件」与「内联正文」互斥（切换时清掉另一个），因为运行时 `fn` 优先，留着旧正文会让公共事件永远不执行
- **可引用性**：引用下拉读的是当前 `schema.events.custom`；若引用的事件已被删除（或导入的 JSON 指向了别的名字），面板就地红字提示**引用的公共事件已不存在**。运行期策略不变：`console.warn` 一次并把该规则视为通过

钩子的执行约定（`ctx.payload = { value, formValue }`，`value` 是字段当前值、`formValue` 是整份表单值快照）：

| 返回值 | 结果 |
|--------|------|
| `true` / `undefined`（含 `null`、空串） | 通过 |
| 字符串 | 作为错误消息 |
| `false` 或其它值 | 不通过，文案 `${label}校验未通过` |
| 抛错 | 不通过（默认文案），并走与钩子同一条错误上报 |

面板里填了 `message` 时以面板文案为准（antd 用 `rule.message` 覆盖校验器给出的文案）。

## 数据来源 `dataSource`

### 三种来源

```ts
type DataSourceDef =
  | { type: 'static', options: FieldOption[] }
  | { type: 'dict', dictType: string, labelField?: string, valueField?: string }
  | { type: 'api', api: string, params?: Record<string, string>, parse?: string }

interface FieldDataSource {
  /** 引用 schema.dataSources 命名表；与 def 二选一，def 优先（与 HookRef 同规则） */
  ref?: string
  def?: DataSourceDef
  /** 依赖字段（名路径，支持 contact.name）：这些字段变化时重新取数 */
  watch?: string[]
  /** 防抖 ms，默认 300 */
  debounce?: number
}
```

| 类型 | 取数方式 |
|------|----------|
| `static` | 直接用 `def.options`（schema 里写死） |
| `dict` | 调宿主注册的 `dict` 接口，参数 `{ dictType }`，按 `labelField` / `valueField` 映射（默认 `dictLabel` → `label`、`dictValue` → `value`） |
| `api` | 调宿主注册名 `def.api` 对应的接口，`params` 经 `{{}}` 插值后传入，返回结果按 `parse`（名路径）取出数组 |

**接口只接受宿主注册名，不填裸 URL**：鉴权、错误提示、loading 都走宿主统一的 `http` 实例，而表单定义是可导入 / 导出 / 跨环境复制的**数据**，不该携带请求实现。因此本包不依赖 `@zealous-admin/layout` 与 `src/apis`，也不自行发起任何请求。

### 宿主注册

```ts
import { registerFormDataApis, setFormDataApiCatalog } from '@zealous-admin/form-designer/index'
import { getDictDataByTypeAPI } from '@/apis/dict'
import { getOrgTreeAPI } from '@/apis/org'

registerFormDataApis({
  // 约定名：字典一律注册为 dict，参数固定 { dictType }
  dict: (params, signal) => getDictDataByTypeAPI(params.dictType, { signal }),
  orgTree: (params, signal) => getOrgTreeAPI(params, { signal }),
})

// 可选：给「数据来源」面板的接口下拉一份名字清单（包不知道宿主注册了哪些名字）
setFormDataApiCatalog(['dict', 'orgTree'])
```

未调用 `setFormDataApiCatalog` 时，面板的接口名退化为自由文本输入并提示「未提供接口清单」。

`api` 的返回约定：`parse` 之后必须是数组；数组项为 `{ label, value }` 对象（`disabled` 会透传），也接受字符串 / 数字（直接当值用）。字典项则按 `labelField` / `valueField` 映射。

### 插值

`params` 里的字符串支持 `{{名路径}}` 占位符，取值走名路径（支持 `contact.name`、`items.0.qty`），缺失替换为空串：

```json
{ "type": "api", "api": "orgTree", "params": { "deptId": "{{dept}}", "keyword": "{{contact.name}}" }, "parse": "data.list" }
```

插值时读的是**取数那一刻**的表单值（`form.getFieldsValue(true)`），不是面板渲染时的快照。

### 依赖重跑：`watch` 与 `debounce`

`watch` 显式声明依赖字段（名路径数组），**不隐式扫描模板串**：

- 这些字段的值变化时，防抖（默认 300ms）后重新取数；连续输入只取最后一次
- 按**值**比较：依赖字段变化但值相同（例如同值回填）不会重复请求
- 名路径支持嵌套（`contact.name`、`items.0.title`），且**不受事件钩子 `watch` 的「只上报顶层段名」限制** —— 数据源是直接读值的
- 触发来源是值版本号：用户输入（`onValuesChange`）与钩子里的 `ctx.setValue` / `setValues` 都会让它自增，依赖取值比较随之重跑；写的正是被监听的字段且值确实变了才会重取

### 竞态收口与失败降级

| 情况 | 行为 |
|------|------|
| 重取时上一请求还在飞 | `AbortController.abort()` 上一请求（宿主函数可接收 `signal` 提前释放；忽略 `signal` 也不影响正确性） |
| 先发的请求晚返回 | 自增请求序号**后写胜**：只有最新序号的结果会被采用，过期结果丢弃 |
| 取数失败 | `console.error` 详情 + 稳定 key 的提示（不与钩子错误互相覆盖），并**保留上一次的 `options`**（已选值对应的标签不会当场消失） |
| 抛 `AbortError` | 静默忽略（取消是我们自己发起的，不算失败、不提示、不 `console.error`） |
| 接口名未注册 | 失败并提示「未注册的数据接口：xxx」 |
| 返回不是数组 | 失败并提示「数据接口返回的不是数组：xxx」，同样保留上一次的 `options` |

### 场景钩子

取数链路会触发三个表单级场景（引用来自 `schema.events`，写法见[事件钩子](/form-designer/events)）：

| 场景 | 时机 | `ctx.payload` |
|------|------|---------------|
| `beforeLoadData` | 每次请求前（**关键场景**，`return false` 或抛错即中断本次加载，不取数也不算失败） | `{ field, config }` |
| `afterLoadData` | 取数成功、写入 `options` 之后 | `{ field, config, result }` |
| `onReload` | **手动**重取（`ctx.reload()`）之后 | `{ field }` |

`field` 是字段名，`config` 是解析后的 `DataSourceDef`（`ref` 引用会解析成命名表里的定义），`result` 是归一化前的原始数组。

手动与自动的区别很重要：**`watch` 引起的自动重取不触发 `onReload`**，只有 `ctx.reload()` 触发。

### 命名数据源

`FormSchema.dataSources` 是 `Record<名字, DataSourceDef>`，字段用 `dataSource.ref` 按名引用（`def` 与 `ref` 同时存在时 `def` 优先）。设计器面板的「引用命名数据源」下拉读的就是这张表；`dataSources` 目前只能来自导入的 JSON（面板不提供编辑入口）。

## 联动 `control`

```ts
interface ControlRule {
  /** 条件依赖的字段（名路径） */
  field: string
  /** 比较方式，默认 eq */
  operator?: 'eq' | 'neq' | 'in' | 'empty' | 'notEmpty'
  /** operator 为 in 时为数组 */
  value?: any
  /** 条件命中时施加的效果，可多选 */
  effects: ('hidden' | 'disabled' | 'required')[]
}
```

### 比较方式

| operator | 命中条件 |
|----------|----------|
| `eq`（默认） | `值 === rule.value` |
| `neq` | `值 !== rule.value` |
| `in` | `值` 出现在 `rule.value`（数组）里 |
| `empty` | 值为 `undefined` / `null` / `''` / `[]`（`0` 与 `false` 不算空） |
| `notEmpty` | 上述之外的一切值 |

比较一律是**严格相等**，因此 `1` 与 `"1"` 不相等。面板的值输入会把数字 / 布尔 / 数组按 JSON 解析（写 `1` 得到数字 1，写 `true` 得到布尔值），其它按字符串处理。未配置或配置了非法 `operator`（手写 / 外部 JSON）一律按 `eq` 处理。

### 效果语义

同一规则内的效果全生效；**多条规则的效果取「或」**（任一规则命中即生效）；规则不命中时不覆盖任何配置。

| 效果 | 落地方式 |
|------|----------|
| `hidden` | antd `Form.Item hidden`：只影响呈现，值仍保留在表单 store 里；进不进提交报文由「只提交已注册字段」的既有语义决定（隐藏字段仍是已注册字段，**会**进报文） |
| `disabled` | 合并进组件 props（只置真、不回退），因此面板里显式配置的 `disabled` 开关仍然有效 |
| `required` | 与字段自身 `formItem.required` 取「或」，命中后在规则表最前补一条必填规则 |

容器的 `disabled` 会**下发给子字段**：`nestObject`（子表单）与 `nestList`（表格子表单）容器命中 `disabled` 时，行内 / 子表单内的输入组件同样被禁用。容器自身不挂 `Form.Item`，因此 `hidden` / `required` 对容器没有作用对象（只有 `disabled` 有意义）。

面板「联动」分组按规则列表编辑：依赖字段下拉列出当前 schema 的字段名，比较方式切换时会清掉新方式用不到的 `value`（`in` 需要数组、`empty` / `notEmpty` 不需要值），效果多选。字段自身已必填而规则里又选了 `required` 时会就地提示冗余。

## 已知限制

| 限制 | 说明 |
|------|------|
| 画布不执行联动与数据来源 | 设计态画布直接调组件声明的 `render`（不经过 `FieldItem` / `FieldControl`），既不取数也不求联动；要看真实效果请开预览。画布的必填星号也只读 `formItem.rules`，不读联动算出的必填 |
| 行内字段的联动判定只有一份 | 有效态按**节点 id** 求值，`tableForm` 的多行共享同一结果；依赖写成绝对名路径（`items.0.lock`）时也只按那一行的值算，用于所有行。需要按行取值请在自定义校验 / 钩子里读 `ctx.getValues()` |
| `hidden` + `required` 同时命中 = 死局 | 隐藏的字段仍是已注册字段、仍参与校验：提交会被必填拦住，而错误提示渲染在 `display:none` 的 `Form.Item` 里，用户只看到「点了提交没反应」。面板在规则合并后同时含这两种效果时会红字提示。需要「按条件必填」时请**不要同时隐藏**（例如用 `disabled` 代替隐藏，或把必填条件收窄到字段可见的分支）；目前没有既能隐藏、又能在命中时把提示露出来的替代方案 —— antd `Form.Item hidden` 不渲染错误气泡 |
| 联动需要值版本号 | 只要 schema 里声明了 `watch` 或 `control`，渲染器就会在值变化时重渲染整棵表单（未声明时保持原有的「值变化不重渲染」行为） |
| 失败保留旧选项 | 取数失败时不清空 `options`，因此可能短时间显示过期选项（有提示与 `console.error`） |
| `ctx.reload` 无递归护栏 | 在 `onReload` 钩子里无条件再次 `ctx.reload()` 会沿微任务无限递归（与「同步死循环无护栏」同一类已知风险） |
| `ctx.reload(field)` 的命中口径 | 按字段的**名路径**（顶层即字段名、子表单为 `contact.name`）或**字段名**命中；`tableForm` 行内实例登记的是行相对路径 `0.title`，因此 `ctx.reload('items.0.title')` 命中不到，请用字段名 `ctx.reload('title')`（重取所有行的该字段实例） |
| `await ctx.reload()` 不保证 DOM 已更新 | Promise 只保证取数、写入选项与 `onReload` 都已结束，视图更新在随后的渲染帧；要读新数据请用 `afterLoadData` / `onReload` 里的 `ctx.payload.result` |
| 断点与顶层 `Col` | 见[字段级栅格](#字段级栅格-col)：画布只镜像 `span`，且 `Col` 只在 `Row` 里才真正并排 |

## 延伸阅读

- [Schema 结构](/form-designer/schema) — 四项配置的类型与形状约束
- [事件钩子](/form-designer/events) — 12 个场景、`ctx` API、`ctx.reload` 语义
- [设计器与渲染器](/form-designer/designer) — 属性面板的分组与保存拦截
