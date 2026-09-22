# Schema 结构

表单的一切都是一份可序列化的 `FormSchema`。设计器读写它，渲染器消费它，后端 `za_form.schema` 以 JSON 字符串存它。

## FormSchema

```ts
interface FormSchema {
  version: 2
  form: FormGlobalConfig
  /** 表单级场景钩子与命名公共事件 */
  events?: FormEventConfig
  /** 命名全局数据源：字段用 dataSource.ref 按名引用 */
  dataSources?: Record<string, DataSourceDef>
  children: FieldSchema[]
}

/** 表单全局配置：antd 透传项 + 设计器自有项 */
interface FormGlobalConfig extends AntdFormPassthrough {
  /** 标签宽度（px），水平布局下生效 */
  labelWidth?: number
  /** 隐藏必填星号（true → requiredMark={false}） */
  hideRequiredAsterisk?: boolean
  /** 是否渲染提交按钮；FormRenderer 的 showActions 传 false 时优先级更高 */
  submitBtn?: boolean
  /** 是否渲染重置按钮 */
  resetBtn?: boolean
}

/** 直接透传给 antd Form 的白名单 */
interface AntdFormPassthrough {
  layout?: 'horizontal' | 'vertical' | 'inline'
  labelAlign?: 'left' | 'right'
  size?: 'large' | 'middle' | 'small'
  colon?: boolean
  disabled?: boolean
}
```

`createEmptySchema()` 返回带默认全局配置的空表单：

```ts
{
  version: 2,
  form: { layout: 'horizontal', labelAlign: 'right', size: 'middle', colon: true },
  children: [],
}
```

三个段的分工：

| 段 | 必填 | 说明 |
|------|------|------|
| `version` | 是 | 当前为 `2`；见[解析与迁移](#解析与迁移) |
| `form` | 是 | 全局配置。只有 `AntdFormPassthrough` 的 5 个键会透传给 antd，其余由渲染器自行换算（如 `labelWidth` → `labelCol`、`hideRequiredAsterisk` → `requiredMark`），画布与运行时共用同一套换算 |
| `events` | 否 | 表单级场景钩子 + 命名公共事件，见 [`events` 段](#events-段)与[事件钩子](/form-designer/events) |
| `dataSources` | 否 | 命名全局数据源（`Record<名字, DataSourceDef>`），字段用 `dataSource.ref` 按名引用，见 [`dataSources` 段](#datasources-段) |
| `children` | 是 | 字段树，见 [FieldSchema](#fieldschema) |

> `version` 当前为 `2`。历史 v1 结构由 `parseSchema()` 自动迁移，无需手工改库；更高版本会被拒绝并提示升级表单设计器。

## `events` 段

两个部分：12 个场景键各挂一个引用数组，`custom` 是命名公共事件表。

```ts
type FormEventConfig = Partial<Record<HookScene, HookRef[]>> & {
  custom?: Record<string, { label?: string, fn: FnSource }>
}

interface HookRef {
  /** 内联函数体；与 hook 同时存在时 fn 优先 */
  fn?: FnSource
  /** 按名引用 custom 里的公共事件 */
  hook?: string
  /** 仅 onFieldChange 生效：只在这些字段变化时触发；不填 = 任意字段 */
  watch?: string[]
  /** 同场景内的执行顺序，升序 */
  order?: number
}

/** 可序列化的函数信封：schema 里只存源码，运行时编译 */
interface FnSource {
  $type: 'fn'
  args: string[]
  body: string
}
```

场景名共 12 个（`HookScene`），分关键场景与非关键场景：`beforeSubmit` / `beforeLoadData` 是**关键场景**，钩子 `return false` 或抛错会中断流程；其余场景的返回值不参与控制流。完整清单、`ctx` API、公共事件复用写法与运行语义见[事件钩子](/form-designer/events)。

### events 段的形状约束

`events` 段的校验只有一份实现（`events/validateEvents.ts`），设计器保存拦截与 `parseSchema()` 共用，任何一条不通过都会被拒：

| 约束 | 失败提示 |
|------|----------|
| `events` 是对象（不是数组 / null） | `events 应为对象` |
| 除 `custom` 外每个场景的值是数组 | `事件钩子格式不正确（<场景>）` |
| 引用对象带 `fn` 时必须是合法信封（`$type` / `args` / `body` 齐备且类型正确） | `事件钩子格式不正确（<场景>）` |
| 引用既没有合法 `fn`，也没有字符串 `hook` | `事件钩子格式不正确（<场景>）` |
| `custom` 是对象，且每项**必须有**合法 `fn`（公共事件表没有 `hook` 回退） | `事件钩子格式不正确（公共事件 <名字>）` |
| 每个 `fn.body` 长度 ≤ 20000 字符 | `钩子正文过长…：最多 20000 字符` |
| `fn.args` 都是合法标识符，且 `body` 能试编译通过 | `参数名不合法：<名字>` / `语法错误：<原因>` |

这份校验同时挂在**设计器保存前**与 **`parseSchema()` 解析时**：前者拼成红字提示并中止保存，后者抛第一条问题。两边共用一份实现，不会出现「保存放行、回读拒绝」。

## `dataSources` 段

命名全局数据源的**定义表**：`Record<名字, DataSourceDef>`，字段用 `dataSource.ref` 按名引用（与 `HookRef` 的 `hook` 同理）。当前面板不提供数据源表本身的编辑入口，`dataSources` 只能来自导入的 JSON；导入后导出 / 保存都不会丢。

```ts
type DataSourceDef =
  | { type: 'static', options: FieldOption[] }
  | { type: 'dict', dictType: string, labelField?: string, valueField?: string }
  | { type: 'api', api: string, params?: Record<string, string>, parse?: string }

interface FieldOption {
  label: string
  value: string | number
  disabled?: boolean
}
```

| type | 说明 |
|------|------|
| `static` | 选项直接写在 schema 里 |
| `dict` | 走宿主注册名 `'dict'`，参数 `{ dictType }`，按 `labelField` / `valueField` 映射（默认 `dictLabel` / `dictValue`） |
| `api` | 走宿主注册名 `def.api`（**只接受注册名，不填裸 URL**），`params` 支持 `{{名路径}}` 插值，`parse` 是取数组的名路径 |

取数时机、竞态收口与失败降级见[渲染项配置 · 数据来源](/form-designer/render-config#数据来源-datasource)。

## FieldSchema

```ts
interface FieldSchema {
  /** 唯一 id，拖拽与选中主键，不参与提交 */
  id: string
  /** 组件类型，对应注册表的 type */
  type: string
  /** 表单字段名，提交数据的 key；容器 / 辅助组件可为空 */
  field?: string
  label?: string
  /** 直接透传给 antd 组件的 props */
  props: Record<string, any>
  /** 字段级栅格；设置后渲染器会为该字段包一层 Col */
  col?: FieldCol
  /** 声明式选项来源：加载结果写入 props.options */
  dataSource?: FieldDataSource
  /** 联动规则：条件命中时控制隐藏 / 禁用 / 必填；规则内条件取「且」，多条规则取「或」 */
  control?: ControlRule[]
  /** Form.Item 层面配置 */
  formItem?: {
    rules?: ValidateRule[]
    required?: boolean
    tooltip?: string
    extra?: string
    hidden?: boolean
  }
  /** 容器类子节点 */
  children?: FieldSchema[]
}
```

| 字段 | 谁在用 | 说明 |
|------|--------|------|
| `id` | 设计器 | 选中、拖拽、历史定位的主键；`uniqueId()` 生成，形如 `fmabc1230` |
| `type` | 双方 | 查注册表拿 `ComponentDef`；未注册类型在渲染时降级为警告块而不是崩溃 |
| `field` | 渲染器 | 提交数据的 key。新拖入字段默认由 `uniqueId()` 生成，需在属性面板改成业务字段名 |
| `label` | 双方 | 画布与 `Form.Item` 的标题；`descriptions` / `tableForm` 的子节点由父级呈现，`Form.Item` 不再重复渲染 label |
| `props` | 双方 | 原样透传给 antd 组件；组件声明里的自定义键（如 upload 的 `buttonText`、money 的 `thousands`）在 `render` 内自行换算 |
| `col` | 渲染器 | 字段级栅格，有值时渲染器在最外层包一层 `Col`；画布外壳只镜像 `span` |
| `dataSource` | 渲染器 | 声明式数据来源，取数结果覆盖 `props.options` |
| `control` | 渲染器 | 联动规则，按当前值算出隐藏 / 禁用 / 必填 |
| `formItem` | 渲染器 | 校验规则与 `Form.Item` 的 tooltip / extra / hidden |
| `children` | 双方 | 仅容器类使用 |

`col` / `dataSource` / `control` 的完整语义（含已知限制）见[渲染项配置](/form-designer/render-config)。

## ValidateRule

校验规则以可序列化的形式存储，渲染时由 `toAntdRules` 转成 antd `Rule`：

```ts
type ValidateRuleType =
  | 'required' | 'email' | 'url' | 'number' | 'regexp'
  | 'len' | 'maxLen' | 'minLen' | 'min' | 'max'
  | 'phone' | 'ip' | 'integer' | 'uppercase' | 'lowercase'
  | 'validator'

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

| type | 转换结果 | 备注 |
|------|----------|------|
| `required` | `{ required: true }` | `formItem.required` 为真且规则里没有 `required` 时，自动补一条并置于最前 |
| `email` / `url` / `number` | `{ type }` | `number` 要求值为 number 类型，仅适用于 `number` / `money` / `slider` 等数值组件；给文本输入配这条会永远校验失败 |
| `regexp` | `{ pattern: new RegExp(pattern) }` | `pattern` 缺失或非法时跳过该条并打印告警 |
| `len` / `minLen` / `maxLen` | `{ type: 'string', len \| min \| max }` | 按**字符长度**校验，阈值取 `value` |
| `min` / `max` | `{ type: 'number', min \| max }` | 按**数值大小**校验，阈值取 `value` |
| `phone` / `ip` / `integer` / `uppercase` / `lowercase` | `pattern` | 内置正则；`integer` 走字符串正则（文本输入框里的数字是字符串） |
| `validator` | antd `validator` 函数 | 自定义校验：复用 `events.custom` 的公共事件（`hook`）或内联 `fn`，两者同时存在时 `fn` 优先 |

未显式填 `message` 时按 `${label}不能为空` / `${label}格式不正确` 兜底。

`trigger` 是**字段级校验时机**的收窄（`blur` / `change` / `submit`），不写则沿用 antd 默认（`onChange`）；阈值类规则只对相应类型的组件有意义，配错组件会恒不通过。完整映射表、阈值语义与自定义校验的返回约定见[渲染项配置 · 校验规则](/form-designer/render-config#校验规则-formitemrules)。

## 字段名与名路径

`Form.Item` 的 `name` 不是直接取 `schema.field`，而是**名路径前缀 + `schema.field`**（`renderer/namePrefix.ts`）。前缀由容器逐级下发：

| 容器声明 | 前缀行为 | 提交结构 |
|----------|----------|----------|
| 普通容器（`row` / `card` / `tabs` …） | 不改变前缀 | 扁平，子字段各自成 key |
| `nestObject`（`subForm`） | 前缀追加自身 `field` | `{ [field]: { 子字段: 值 } }` |
| `nestList`（`tableForm`） | 交给 `Form.List`，行内前缀为行下标 | `{ [field]: [{ 子字段: 值 }, …] }` |

`nestList` 容器的行内子字段名路径**相对列表**——rc-field-form 的 `Form.List` 已注入 `prefixName`，所以行前缀只需 `[rowName]`。

`nestObject` / `nestList` 容器如果没配 `field`，分别退化为普通容器 / 渲染一条「数组容器缺少字段名」警告。

### 字段名校验

同名的字段会绑定到 rc-field-form 的同一个 store 槽位：两边输入互相串改、校验互相影响、提交互相覆盖。所以字段名要满足两条约束（`utils/fieldName.ts`）：

- **格式**：非空、不含空白字符、不含点号（点号与配置项的点分路径语义冲突，嵌套请改用子表单容器）
- **唯一**：同一命名作用域内不重名

「作用域」按上表的前缀行为划分，而不是按直接父节点 —— 普通容器不改变前缀，所以 `row > col > 输入框` 里的字段与根层字段同属一个作用域；`nestObject` / `nestList` 容器才另起一层（两个子表单里各有一个 `name` 是合法的）。

设计器会拦截不一致的字段名：属性面板在「字段名」下方红字提示，保存前整体校验、不通过则拒绝保存；导入的 schema 如果有字段名问题，也会被拒绝并说明具体冲突项。

### 提交结构示例

```
子表单（field: contact）
├── 姓名（field: name）
└── 年龄（field: age）
表格子表单（field: items）
└── 品名（field: title）
```

提交得到：

```json
{
  "contact": { "name": "张三", "age": 18 },
  "items": [{ "title": "苹果" }, { "title": "香蕉" }]
}
```

## 形状约束

字段级配置（校验规则、栅格、数据来源、联动）的校验只有一份实现：`utils/parseSchema.ts` 的 `validateFieldRules(children, dataSources?)`——数组入参是 `children`，第二个参数是 `schema.dataSources`。它同时挂在**设计器保存**、**设计器导出前拦截**与 **`parseSchema()` 解析**三处，不会出现「保存放行、回读拒绝」。

问题文案里的 `<字段>` 依次回落到 `label` → 组件 `type` → `未命名字段`；解析侧抛的是第一条问题（前缀 `表单结构解析失败：`）。命名数据源表按 `dataSources.<名字>` 定位。

| 段 | 约束 | 失败提示 |
|----|------|----------|
| `formItem.rules` | 必须是数组 | `校验规则格式不正确（<字段>）` |
| | `type` 在 `VALIDATE_RULE_TYPES` 内，`pattern` / `trigger` 类型正确 | 同上 |
| | `validator` 必须有可执行来源：合法 `fn`，或非空 `hook` | 同上（附加具体原因） |
| | 阈值类（`len` / `maxLen` / `minLen` / `min` / `max`）必须有有限数字 `value` | `校验规则格式不正确（<字段>）：<type> 需要数字阈值 value` |
| `col` | 必须是非数组对象，键只允许 `span` / `xs` / `sm` / `md` / `lg` / `xl` | `字段栅格格式不正确（<字段>）`（未知键会点名 `：未知键 xxx`） |
| | 每个键的值是 0-24 的整数 | `字段栅格格式不正确（<字段>）：span 必须是 0-24 的整数` |
| `dataSource` | 必须是非数组对象，且 `def` 与 `ref` 至少有一个 | `数据来源格式不正确（<字段>）：def 与 ref 至少要有一个` |
| | `ref` 为非空字符串 | `数据来源格式不正确（<字段>）：ref 需要非空字符串` |
| | `watch` 为字符串数组、`debounce` 为非负数 | `数据来源格式不正确（<字段>）：watch 应为字符串数组` |
| | `def.type` 在 `static` / `dict` / `api` 内 | `数据来源格式不正确（<字段>）` |
| | `static` 的 `options` 是数组，每项有 `label` 与 `value`（`disabled` 为布尔） | `数据来源格式不正确（<字段>）：第 1 个选项需要 label 与 value` |
| | `dict` 的 `dictType` 非空 | `数据来源格式不正确（<字段>）：dict 需要非空的 dictType` |
| | `api` 的 `api` 非空、`params` 是字符串值的对象、`parse` 为字符串 | `数据来源格式不正确（<字段>）：api 需要非空的注册名` / `：params.id 应为字符串` |
| `dataSources` | 必须是对象，每项都是合法的 `DataSourceDef` | `数据来源格式不正确（dataSources 应为对象）` / `数据来源格式不正确（dataSources.<名字>）：…` |
| `control` | 必须是数组，每项是对象 | `联动规则格式不正确（<字段>）` |
| | `field` 为非空字符串 | `联动规则格式不正确（<字段>）：field 需要非空字符串` |
| | `operator` 在枚举内（不写按 `eq`） | `联动规则格式不正确（<字段>）：未知的比较方式 contains` |
| | `effects` 为非空数组且每项在枚举内 | `联动规则格式不正确（<字段>）：effects 需要非空数组` / `：effects 含未知项` |
| | `operator` 为 `in` 时 `value` 必须是数组 | `联动规则格式不正确（<字段>）：operator 为 in 时 value 必须是数组` |
| | 无顶层单条件时必须有非空 `conditions`；顶层单条件必须有非空 `field` | `联动规则格式不正确（<字段>）：field 需要非空字符串` |
| | `conditions` 与顶层单条件不能同时配置 | `联动规则格式不正确（<字段>）：conditions 与顶层单条件不能同时配置` |
| | `conditions` 每项的字段、operator 和 `in` 数组合法 | `联动规则格式不正确（<字段>）：conditions.0.field 需要非空字符串` 等 |

`events` 段有自己的一份形状约束，见 [`events` 段的形状约束](#events-段的形状约束)。

## 解析与迁移

`parseSchema()`（`utils/parseSchema.ts`，包根导出）是**唯一解析入口**：接受 JSON 字符串或已解析对象，返回当前版本的 `FormSchema`，失败一律抛错、消息面向用户可直接展示。数据库里的 `schema` 文本、导入的 JSON 都该走它，不要自己 `JSON.parse` 后直接使用。

| 步骤 | 行为 |
|------|------|
| 1 | 字符串入参先 `JSON.parse`，失败抛 `表单结构解析失败：不是合法的 JSON` |
| 2 | 非对象或数组抛 `表单结构解析失败：应为对象` |
| 3 | `version` 缺失按 `1` 处理；非正整数抛 `表单结构解析失败：表单版本号非法（<原值>）` |
| 4 | 高于 `SCHEMA_VERSION` 直接拒绝，抛 `不支持的表单版本 v<n>，请升级表单设计器`（唯一不带 `表单结构解析失败：` 前缀的消息） |
| 5 | 低于当前版本逐级迁移（`MIGRATIONS` 表）：缺分支抛 `表单结构解析失败：缺少 v<n> 的迁移`；迁移没推进版本号抛 `表单结构解析失败：v<n> 迁移未推进版本` |
| 6 | 校验 `children` 为数组（`表单结构解析失败：children 应为数组`）、`form` 为对象（`表单结构解析失败：form 应为对象`），再按 [形状约束](#形状约束)校验 `events` 与字段级配置（`validateFieldRules`），抛 `表单结构解析失败：` + 第一条问题 |
| 7 | 与 `createEmptySchema()` 合并后返回：`form` 缺的键补默认值，`events` / `dataSources` 原样保留 |

当前迁移表只有 **v1 → v2** 一条，且是纯增量：新增的 `events` / `dataSources` 都是可选段，迁移只抬版本号。`MIGRATIONS` 是后续结构变更的挂载点——新增结构段时抬 `SCHEMA_VERSION` 并补一条对应分支。

解析与迁移都发生在**客户端**：服务端 `POST /form/update` 只把 `schema` 当字符串存（传了就 `version + 1`），不做结构校验。绕过设计器直接调接口仍可写入不合规的 schema——这与字段名校验的现状一致，见设计规格 §12.9。

## 完整示例

```json
{
  "version": 2,
  "form": { "layout": "vertical", "labelAlign": "right", "size": "middle", "colon": true },
  "events": {
    "custom": {
      "logSubmit": { "label": "记录提交", "fn": { "$type": "fn", "args": ["ctx"], "body": "globalThis.track?.('submit')" } }
    },
    "onFormMounted": [{ "hook": "logSubmit" }],
    "beforeSubmit": [{ "fn": { "$type": "fn", "args": ["ctx"], "body": "ctx.setValue('submittedAt', Date.now())" } }]
  },
  "dataSources": {
    "deptDict": { "type": "dict", "dictType": "sys_dept" }
  },
  "children": [
    {
      "id": "f1",
      "type": "input",
      "field": "username",
      "label": "用户名",
      "props": { "placeholder": "请输入用户名" },
      "col": { "span": 12 },
      "formItem": {
        "rules": [{ "type": "required" }, { "type": "regexp", "pattern": "^\\w{4,16}$", "message": "4-16 位字母数字下划线" }]
      }
    },
    {
      "id": "f2",
      "type": "row",
      "props": { "gutter": 16 },
      "children": [
        {
          "id": "f3",
          "type": "col",
          "props": { "span": 12 },
          "children": [
            { "id": "f4", "type": "date", "field": "birthday", "label": "生日", "props": {} }
          ]
        },
        {
          "id": "f5",
          "type": "col",
          "props": { "span": 12 },
          "children": [
            { "id": "f6", "type": "switch", "field": "enabled", "label": "启用", "props": {} }
          ]
        }
      ]
    },
    {
      "id": "f7",
      "type": "tableForm",
      "field": "items",
      "label": "明细",
      "props": { "addText": "添加一行" },
      "children": [
        { "id": "f8", "type": "input", "field": "title", "label": "品名", "props": {} },
        { "id": "f9", "type": "number", "field": "count", "label": "数量", "props": {} }
      ]
    },
    {
      "id": "f10",
      "type": "select",
      "field": "dept",
      "label": "部门",
      "props": {},
      "col": { "span": 12, "md": 8 },
      "dataSource": { "ref": "deptDict" },
      "control": [{
        "conditions": [
          { "field": "enabled", "operator": "eq", "value": false },
          { "field": "dept", "operator": "eq", "value": "finance" }
        ],
        "effects": ["hidden"]
      }]
    }
  ]
}
```

这份 schema 里 `username` 占 12 栅格，`dept` 的选项来自命名数据源 `deptDict`（渲染时调宿主注册的 `dict` 接口），并在 `enabled` 为 `false` 且 `dept` 为 `finance` 时整体隐藏。

> 设计器工具栏的「导出」直接给出当前画布的 schema JSON（含 `events` / `dataSources` / 各字段的 `col` / `dataSource` / `control`），「导入」粘贴回来即可复原，可当作模板复用手段。导入会走 `parseSchema()` 做版本迁移与形状校验，字段名、钩子或字段级配置不过关会报错并保留当前画布。
