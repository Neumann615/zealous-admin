# 事件钩子

表单可以挂两类可序列化的 JS 钩子，都随 `FormSchema` 一起存进 `za_form.schema`：

| 层次 | 位置 | 数量 | 用途 |
|------|------|------|------|
| 表单级**场景钩子** | `schema.events[场景名]` | 12 个场景 | 在固定时机执行 |
| 命名**公共事件表** | `schema.events.custom` | 任意条 | 写一次、多场景按名复用 |

钩子正文以结构化信封 `{ $type: 'fn', args, body }` 持久化（`events/fnSource.ts`），运行时按 `args + body` 记忆化编译——不是字符串前后缀拼接，也不需要正则剥壳。

> ⚠️ 钩子以 `AsyncFunction` 编译、**无沙箱**，等价于让「有表单设计权限的人」在所有终端用户浏览器里执行任意 JS。这是**已知并接受**的风险，详见[模型 A：风险与边界](#模型-a-风险与边界)。

## 两个层次

### 场景钩子

`schema.events` 的 12 个场景键各挂一个引用数组：

```ts
interface HookRef {
  /** 内联函数体；与 hook 同时存在时 fn 优先 */
  fn?: FnSource
  /** 按名引用 events.custom 里的公共事件 */
  hook?: string
  /** 仅 onFieldChange 生效：只在这些字段变化时触发；不填 = 任意字段 */
  watch?: string[]
  /** 同场景内的执行顺序，升序；不填按 0（Array.sort 稳定，同序保持配置里的先后） */
  order?: number
}
```

同一个场景可以挂多条，逐条执行。`fn` 与 `hook` 同时配置时运行时以 `fn` 为准（`console.warn` 提示一次），设计器的引用下拉与函数体互斥，不会产生这种组合。

`watch` / `order` **没有设计器入口**，只能来自导入的 JSON；在面板里切换或清空引用不会把它们抹掉。

### 命名公共事件

`schema.events.custom` 是 `Record<名字, { label?, fn }>`。场景里按名引用：

```json
{ "onFormMounted": [{ "hook": "logVisit" }] }
```

钩子内部还能主动触发别的公共事件并等它跑完：

```js
await ctx.emit('refreshOrgTree', { deptId: ctx.getValues().deptId })
```

被触发的事件拿到的是**新的 ctx 副本**：`payload` 换成 `ctx.emit` 投递的载荷（不会写回表单值，也不与真实字段名撞名），`scene` / `changed` / `values` 等其余字段沿用调用方。因此公共事件里用 `ctx.scene` 就能知道自己是被哪个场景触发的，「写一次、多场景复用」时尤其有用。

两种情况运行时各 `console.warn` 提示一次（不逐键刷屏），都不影响其余钩子：

- **引用了不存在的公共事件**：这一条**整条跳过**（没有可执行的正文）
- **同时配了 `fn` 与 `hook`**：**不跳过**，按 `fn` 执行、只忽略 `hook`——与上面「以 `fn` 为准」是同一条规则

## 12 个场景

| 场景 | 触发时机 | 说明 |
|------|----------|------|
| `onFormCreated` | 渲染器挂载 effect 内、`onFormMounted` 之前 | 表单实例已创建；设计器画布**不执行** |
| `onFormMounted` | `onFormCreated` 之后 | 可在此拉取初始数据 |
| `onFormUnmount` | 组件卸载的清理阶段 | 清理副作用 |
| `onFieldChange` | 任意已注册字段的值变化 | `ctx.changed` 带 `field` / `value`；可用 `watch` 限定字段；嵌套字段只上报顶层段名，见[已知限制](#已知限制) |
| `beforeLoadData` | 数据源取数前 | **关键场景**；每次请求前触发，`return false` 中断本次加载；`ctx.payload = { field, config }` |
| `afterLoadData` | 数据源取数成功后 | `ctx.payload = { field, config, result }` |
| `onReload` | **手动**重跑数据源后 | 只有 `ctx.reload()` 触发；`watch` 引起的自动重取不触发；`ctx.payload = { field }` |
| `beforeSubmit` | 提交校验通过、调用 `onSubmit` 之前 | **关键场景**；可改值（只对已注册字段生效，见[改值与提交报文](#改值与提交报文)）、可 `return false` 中断 |
| `onValidateFail` | 提交校验未通过 | 只覆盖提交这条路径，见[已知限制](#已知限制) |
| `afterSubmit` | `onSubmit` 正常返回后 | 业务页提交失败的提示由 http 拦截器负责 |
| `onSubmitError` | `onSubmit` 抛错时 | `onSubmit` 的 rejection 不会外抛 |
| `onReset` | 渲染器自带「重置」按钮点击后 | 只覆盖渲染器自己的重置按钮，见[已知限制](#已知限制) |

数据源相关的三个场景只在**字段声明了 `dataSource`** 时才有触发点（见[渲染项配置 · 数据来源](/form-designer/render-config#数据来源-datasource)）：没有数据源的字段不会取数，`ctx.reload()` 也就没有目标（钩子照常执行）。

## 关键场景的中断语义

`beforeSubmit` 与 `beforeLoadData` 是**关键场景**（`CRITICAL_SCENES`），钩子有两个途径中断流程：

- **显式 `return false`**：中断。`beforeSubmit` 下不再调用 `onSubmit`，`afterSubmit` 也不会触发
- **抛错**：中断。同时按场景弹一次错误提示、`console.error` 一次

其余场景的钩子**不参与控制流**：

- `return false` 被忽略，流程照常
- 抛错只跳过这一条并提示，同场景后续钩子与整条链路继续（例如 `onFormMounted` 抛错不影响提交）

同场景内的钩子按 `order` 升序执行；关键场景里一旦中断，后面的钩子不再执行。

## 钩子怎么写

只写**函数体**，形参固定 `ctx`（`HOOK_ARGS = ['ctx']`，由配置声明、运行时按声明顺序注入）。编辑器不提供 `function` 外壳，正文直接写在最外层，允许顶层 `await`：

```js
if (!ctx.getValues().agree) {
  ctx.message.warning('请先勾选同意')
  return false
}
```

几条约定：

- 保存前**试编译**做语法校验，失败时编辑器下方红字提示并**阻止保存**（`validateHookFn` 与 `parseSchema` 共用同一份口径，不会出现「保存放行、回读拒绝」）
- **空正文合法**，表示「什么都不做」；正文不做 `trim`，纯空白会原样保存
- 正文长度上限 **20000 字符**，超长同样红字提示并阻止保存
- `HookEditor` 是受控组件（正文直接读 `value.body`），引用列表上移 / 删除 / 切换引用后不会读到过期正文

## `ctx` API

| 成员 | 类型 | 说明 |
|------|------|------|
| `form` | `FormInstance` | antd 表单实例，可直接调 antd 原生 API |
| `values` | `Record<string, any>` | **触发时刻的值快照**，不会随钩子里的改动更新；要最新值走 `getValues()`。顶层场景取自整份表单 store，提交链路的三个场景（`beforeSubmit` / `afterSubmit` / `onSubmitError`）就是本次提交的那批已注册字段值 |
| `getValues()` | `() => Record<string, any>` | 实时读取当前表单值 |
| `changed` | `{ field: string, value: any } \| undefined` | 仅 `onFieldChange` 有值，标记本次变化的字段与值 |
| `payload` | `any` | 由 `ctx.emit` 投递的载荷；顶层场景钩子里为 `undefined` |
| `scene` | `HookScene \| undefined` | 当前场景名；公共事件被复用时靠它区分触发来源 |
| `setValue(field, value)` | `(string, any) => void` | 改单个字段的值 |
| `setValues(patch)` | `(Record<string, any>) => void` | 批量改值 |
| `getField(field)` | `(string) => FieldSchema \| undefined` | 按字段名取节点（label / props 等），容器内部的字段也能命中 |
| `emit(name, payload?)` | `(string, any?) => Promise<void>` | 触发一个命名公共事件，**返回 Promise，可以 `await`** |
| `reload(field?)` | `(string?) => Promise<void>` | 重跑数据源：无参重取所有挂了 `dataSource` 的字段，带参只重取命中该字段（名路径或字段名）的实例。返回的 Promise 在取数与随后的 `onReload` 都结束后 resolve，可以 `await` 后再读新选项 |
| `message` | antd `message` 实例 | `success` / `error` / `warning` / `info`；宿主未挂 `<App>` 时降级为静态 message |

`values` 与 `getValues()` 的差别是这套 API 里最容易踩的一处：`values` 是钩子被调用那一刻的快照，`getValues()` 每次都重新向表单取值。在一条钩子里先 `setValue` 再读，读到的还是旧快照。

### `ctx.reload` 与自动重取

字段的 `dataSource.watch` 命中值变化时会**自动**重取（防抖后），这条路径**不触发 `onReload`**；只有钩子里显式调用 `ctx.reload()` 才触发。因此 `onReload` 适合放「用户点了刷新之后要做的事」（例如按新选项回填、提示成功），而每次自动重取都会跑的收尾逻辑应该放进 `afterLoadData`。

两个注意点：

- **依赖监听只看用户输入**：值版本号由 `onValuesChange` 驱动，钩子里的 `ctx.setValue` / `setValues` 不会触发 `watch` 自动重取——需要重取就显式 `await ctx.reload()`
- **没有递归护栏**：在 `onReload` 钩子里无条件再次 `ctx.reload()` 会沿微任务无限递归（与「同步死循环无护栏」同一类风险），要重取请加条件判断

### 改值与提交报文

`setValue` / `setValues` 改的是表单 store，而**提交报文只含已注册字段**：`FormRenderer` 在 `beforeSubmit` 通过后用 `form.getFieldsValue()`（无参）取值，只回当前挂载着 `Form.Item` 的字段。于是：

- 改**已注册字段**的值会进 `onSubmit`，这正是「`beforeSubmit` 可改值」的含义
- 钩子里新写的**未注册字段**不会进报文；组件已卸载、仅靠 `preserve` 留在 store 里的值同样不会。要把额外数据带进报文，得先在 `schema.children` 里放一个同名字段的组件，不能靠 `ctx.setValue` 塞进去
- 读数时别被 store 迷惑：`getValues()`（以及顶层场景的 `values`）看到的是整份 store，包含这些未注册的键，只有提交报文按「已注册字段」收窄

### `ctx.emit` 的递归护栏

`emit` 的嵌套深度上限是 **5 层**（按 `ctx` 副本逐层记账）。自己 emit 自己、或两个公共事件互相 emit，都会在超过上限时被截断：该次 `emit` 直接返回，并按事件名提示一次 `表单钩子 emit 递归过深：<名字>`，不会无限递归下去。

深度按调用链上的 ctx 副本记账，不是模块级计数——同页多个表单并发 `await emit` 不会互相抬高计数。

## 失败上报

钩子运行时的错误提示有两条去处，都做了去重：

| 去处 | 去重口径 |
|------|----------|
| 页面弹窗 | 固定 key（`form-designer-hook-error`）：antd 会覆盖同 key 的提示，不会按键逐条刷屏 |
| 控制台 | 按场景名 / 公共事件名去重，同一条钩子反复失败只 `console.error` 一次 |

上报本身**不影响控制流**：提示失败（例如宿主没挂 antd `<App>`）只会落到 `console.error`，不会从 `catch` 里二次抛出，也不会改变关键场景的中断判定。

## 模型 A：风险与边界

钩子以 `AsyncFunction` 编译执行，**没有沙箱**。这意味着：**有表单设计权限的人，可以在所有终端用户的浏览器里执行任意 JS**——这是权限提升，不只是 XSS。2026-09-15 决定采用并接受这个模型（模型 A）。

现有缓解措施：

- 设计器侧保存前语法校验，失败红字提示且**阻止保存**
- 运行时逐条 `try/catch`，单条钩子抛错不拖垮表单
- 钩子只接收单一 `ctx` 入参，API 面文档化（降低误用，**不构成沙箱**）

**重新评估的触发条件**：如果「表单设计」权限将来开放给更多角色，或表单定义开始接受**外部来源 / 不受信任的导入**（设计器自带的 JSON 导入是自家导出、属受信来源，不算），就需要改用具名钩子注册表（模型 B）——那时任意 JS 的可达面不再受信任边界约束。触发任一条件时重新评估，不要沿用本节的结论。

两个**不受护栏保护**的边界（无超时机制，写钩子时自己避免）：

- **同步死循环**：`while (true) {}` 会让页面直接卡死，递归深度护栏管不到它
- **永不 resolve 的 promise**：`beforeSubmit` 里 `await` 一个不 resolve 的 promise，表单就再也提交不了

## 已知限制

| 限制 | 说明 |
|------|------|
| 嵌套字段只上报顶层段名 | 子表单 / 表格子表单内的字段变化时，`onFieldChange` 的 `ctx.changed.field` 是顶层段名（如 `contact`），`watch: ['contact.name']` **不会命中**，要按 `contact` 过滤 |
| `onReset` / `onValidateFail` 只覆盖渲染器自己的路径 | `showActions={false}` 时业务页自己调 `form.resetFields()` / `form.validateFields()` 不会触发这两个场景 |
| 画布（设计态）不执行钩子 | 设计器画布只做视觉呈现；预览弹窗与业务渲染页才真正跑钩子 |
| 公共事件键名会被复用 | 删除公共事件后，`新增公共事件` 会重新占用 `event_${n}` 这个空位，旧的 `{ hook: 'event_1' }` 会静默绑到新事件上；改名 / 删除前先查引用 |
| 只支持表单级入口 | 字段级钩子（`field.hooks`）与字段级按名引用公共事件尚未接入；字段级**数据来源**与**联动**不是钩子，见[渲染项配置](/form-designer/render-config) |
| `ctx.reload` 无递归护栏 | 在 `onReload` 里无条件再次 `ctx.reload()` 会无限递归（同「同步死循环无护栏」） |
| 正文上限 20000 字符 | 超长在保存与解析两侧都会被拒 |

## 完整示例

一份带场景钩子与公共事件的 `FormSchema` 片段：

```json
{
  "version": 2,
  "form": { "layout": "vertical" },
  "events": {
    "custom": {
      "logVisit": {
        "label": "记录访问",
        "fn": { "$type": "fn", "args": ["ctx"], "body": "globalThis.track?.('form:' + ctx.scene)" }
      },
      "refreshOrgTree": {
        "label": "刷新组织树",
        "fn": {
          "$type": "fn",
          "args": ["ctx"],
          "body": "await ctx.reload('deptId')\nctx.message.success(`已按 ${ctx.payload?.deptId ?? '-'} 刷新`)"
        }
      }
    },
    "onFormCreated": [{ "hook": "logVisit" }],
    "onFormMounted": [{ "hook": "logVisit" }],
    "onFieldChange": [
      { "fn": { "$type": "fn", "args": ["ctx"], "body": "if (ctx.changed.field === 'deptId') await ctx.emit('refreshOrgTree', { deptId: ctx.changed.value })" }, "watch": ["deptId"] }
    ],
    "beforeSubmit": [
      { "fn": { "$type": "fn", "args": ["ctx"], "body": "if (!ctx.getValues().agree) {\n  ctx.message.warning('请先勾选同意')\n  return false\n}" }, "order": 0 },
      { "fn": { "$type": "fn", "args": ["ctx"], "body": "ctx.setValue('deptId', String(ctx.getValues().deptId ?? '').trim())" }, "order": 1 }
    ]
  },
  "children": [
    { "id": "f1", "type": "input", "field": "deptId", "label": "部门", "props": {} },
    { "id": "f2", "type": "switch", "field": "agree", "label": "同意条款", "props": {} }
  ]
}
```

这份配置的效果：

- 表单挂载后 `onFormCreated` 与 `onFormMounted` 各触发一次 `logVisit`，公共事件里用 `ctx.scene` 区分来源
- `deptId` 变化时（`watch` 只放行这个字段）内联钩子 emit `refreshOrgTree`，被触发的事件从 `ctx.payload` 拿参数
- 提交前两条钩子按 `order` 依次执行：先检查 `agree`，未勾选就 `return false` 中断（后面的钩子不再跑，`onSubmit` 也不会被调用）；通过后第二条把 `deptId` 的首尾空格去掉——它写的是**已注册字段**，所以改值会进提交报文（未注册字段的写入不会，见[改值与提交报文](#改值与提交报文)）

## 延伸阅读

- [Schema 结构](/form-designer/schema) — `events` / `dataSources` 段的形状约束、版本迁移与解析入口
- [设计器与渲染器](/form-designer/designer) — 「表单」页签的三段面板、保存拦截口径
