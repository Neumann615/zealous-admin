# Schema 结构

表单的一切都是一份可序列化的 `FormSchema`。设计器读写它，渲染器消费它，后端 `za_form.schema` 以 JSON 字符串存它。

## FormSchema

```ts
interface FormSchema {
  version: 1
  form: FormGlobalConfig
  children: FieldSchema[]
}

/** 表单全局配置，直接透传给 antd Form */
interface FormGlobalConfig {
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
  version: 1,
  form: { layout: 'horizontal', labelAlign: 'right', size: 'middle', colon: true },
  children: [],
}
```

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
| `formItem` | 渲染器 | 校验规则与 `Form.Item` 的 tooltip / extra / hidden |
| `children` | 双方 | 仅容器类使用 |

## ValidateRule

校验规则以可序列化的形式存储，渲染时由 `toAntdRules` 转成 antd `Rule`：

```ts
interface ValidateRule {
  type: 'required' | 'email' | 'url' | 'number' | 'regexp'
  message?: string
  /** 仅 type 为 regexp 时使用 */
  pattern?: string
}
```

| type | 转换结果 | 备注 |
|------|----------|------|
| `required` | `{ required: true }` | `formItem.required` 为真且规则里没有 `required` 时，自动补一条并置于最前 |
| `email` / `url` | `{ type: 'email' \| 'url' }` | — |
| `number` | `{ type: 'number' }` | 要求值为 number 类型，仅适用于 `number` / `money` / `slider` 等数值组件；给文本输入配这条会永远校验失败 |
| `regexp` | `{ pattern: new RegExp(pattern) }` | `pattern` 缺失或非法时跳过该条并打印告警 |

未显式填 `message` 时按 `${label}不能为空` / `${label}格式不正确` 兜底。

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

## 完整示例

```json
{
  "version": 1,
  "form": { "layout": "vertical", "labelAlign": "right", "size": "middle", "colon": true },
  "children": [
    {
      "id": "f1",
      "type": "input",
      "field": "username",
      "label": "用户名",
      "props": { "placeholder": "请输入用户名" },
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
    }
  ]
}
```

> 设计器工具栏的「导出」直接给出当前画布的 schema JSON，「导入」粘贴回来即可复原，可当作模板复用手段。