# 设计器与渲染器

## FormDesigner

```tsx
interface FormDesignerProps {
  /** 初始 schema。引用身份变化时重新装载 */
  initialSchema?: FormSchema
  onSave?: (schema: FormSchema) => void
}
```

外层需要一个撑满高度的容器（设计器根节点是 `height: 100%` 的纵向 flex），并且需要处在 antd `App` 上下文内（弹窗与提示走 `App.useApp()`，包本身不依赖 `@zealous-admin/layout`）。

```tsx
<div style={{ height: '100%' }}>
  <FormDesigner key={id} initialSchema={schema} onSave={handleSave} />
</div>
```

`initialSchema` 按引用身份变化触发 `setSchema`。同一个页面实例切换编辑不同表单时务必传 `key`，否则父组件复用同一对象引用不会重新装载，画布会残留上一张表单。

### 三栏结构

| 区域 | 宽度 | 内容 |
|------|------|------|
| 顶部工具栏 | 通栏 | 撤销 / 重做 · 导入 / 导出 / 清空 · 预览 / 保存 |
| 左侧组件面板 | 250px | 关键字搜索 + 按分组折叠的组件列表，每项可拖拽 |
| 中间画布 | 自适应撑满 | 字段树 + 拖拽落点，空态落点撑满整块画布 |
| 右侧属性面板 | 300px | 「属性」「表单」两个页签 |

### 拖拽

基于 `@dnd-kit/react` 的 `DragDropProvider`，`FormDesigner` 统一在 `onDragEnd` 分发：

- **面板 → 画布**（`kind: 'palette'`）：调用 `addField(type, target)`，用组件的 `defaultSchema()` 生成节点，`id` 与 `field` 都由 `uniqueId()` 生成并自动选中。
- **画布内移动**（`kind: 'field'`）：调用 `moveField(id, target)`，同列表内向下移动会自动修正摘除造成的下标偏移；拖入自身或自身子树会被拒绝。
- **落点**：`DropGap` 承担，容器为空或字段之间都会出现落点；横向容器（`row` / `flex` 等）的落点走横向样式。
- 每个字段只有拖拽手柄（选中后左上角出现）可以拖动整块，避免与内部控件的交互冲突。

### 画布渲染

`CanvasItem` 直接调用组件声明的 `canvasRender ?? render`，并自己递归子节点——**画布不走运行时的 `renderField`**，`Form.Item` 只用于呈现 label / required / tooltip，不绑定 `name`。字段外层盖一层透明遮罩接管点击，选中后浮出「拖拽移动 / 复制 / 删除」三个操作。

### 快捷键

| 按键 | 行为 |
|------|------|
| `Ctrl` / `Cmd` + `Z` | 撤销 |
| `Ctrl` / `Cmd` + `Shift` + `Z` 或 `Ctrl` / `Cmd` + `Y` | 重做 |
| `Delete` | 删除选中字段 |
| `Ctrl` / `Cmd` + `D` | 复制选中字段 |

生效条件：事件目标在设计器容器内，或焦点回落到 `body` 且设计器当前可见（keep-alive 隐藏时不响应）。焦点在输入框 / 文本域 / contentEditable 内时全部屏蔽，让位于原生文本编辑。

### 删除与撤销

删除统一走 `useRemoveField()`：无子字段直接删；含子字段的容器弹二次确认（提示将一并删除多少个字段）。画布上的删除按钮与 `Delete` 快捷键共用这个入口，删除后仍可 `Ctrl+Z` 撤销。

所有结构与属性变更都经 store 的 `mutate()`：深拷贝 → 变更 → 推历史。历史上限 50 条；带 `coalesceKey` 的连续写入若间隔小于 500ms 则合并为一条（文本类配置项与校验规则编辑器会传这个 key，避免每敲一个字产生一条历史），数字 / 开关 / 下拉保持离散。

### 属性面板

「属性」页签按选中节点的组件声明动态生成：

| 分组 | 出现条件 | 内容 |
|------|----------|------|
| 基础 | 总是 | 标题、字段名（值绑定组件才有）、提示、额外说明；字段名不合法或与同级字段重名时，输入框下方红字提示 |
| 布局 | 非辅助组件 | 字段级栅格（`col`）：span 预设 + 五个响应式断点，见[渲染项配置 · 字段级栅格](/form-designer/render-config#字段级栅格-col) |
| 校验规则 | 非容器且非辅助组件 | `ValidateRule` 列表编辑器；阈值类型给语境提示、空正则与失效的公共事件引用给红字提示 |
| 数据来源 | 非容器且非辅助组件 | 来源类型（静态 / 字典 / 宿主注册接口 / 引用命名数据源）+ 对应参数 + 依赖字段多选 + 防抖，见[渲染项配置 · 数据来源](/form-designer/render-config#数据来源-datasource) |
| 联动 | 非辅助组件 | 规则列表（依赖字段 → 比较方式 → 值 → 效果），字段自身已必填时提示 `required` 冗余，见[渲染项配置 · 联动](/form-designer/render-config#联动-control) |
| 组件属性 | `configForm` 非空 | 组件自己声明的配置项 |

值绑定容器（`subForm` / `tableForm`）同样显示「字段名」——它决定提交结构的 key；容器不挂 `Form.Item`，因此不开放校验规则与数据来源，但**开放联动**：容器的 `disabled` 会下发给子字段。

分组里的「数据来源」面板依赖宿主先注册接口（`registerFormDataApis`）。宿主另可用 `setFormDataApiCatalog([...])` 给接口名下拉一份清单，未提供时面板退化为自由文本输入。

「表单」页签分三段（`FormEventsPanel.tsx`）：

| 段 | 内容 |
|------|------|
| 表单配置 | 布局（水平 / 垂直 / 行内）、标签对齐、尺寸、显示冒号、整体禁用、标签宽度、隐藏必填星号、提交 / 重置按钮开关 |
| 全局事件 | 12 个场景各一条，点「添加钩子」加一条引用，可上移 / 删除；每条引用是「内联函数体」或「引用公共事件」二选一（`fn` 与 `hook` 互斥，切换时会清掉另一个，避免 `fn` 优先把公共事件顶掉） |
| 公共事件 | 命名公共事件表：键名 + 显示名 + 函数体，可新增 / 删除；上面场景里的引用下拉读的就是这张表 |

表单配置里只有 `layout` / `labelAlign` / `size` / `colon` / `disabled` 这 5 个键透传给 antd `Form`（白名单在 `renderer/formProps.ts`），`labelWidth` / `hideRequiredAsterisk` / `submitBtn` / `resetBtn` 由渲染器与画布自行换算。

场景引用上的 `watch`（仅 `onFieldChange`）与 `order` **没有面板入口**，只能来自导入的 JSON；面板里切换或清空引用不会把它们抹掉——清空引用会回落成空正文，保持 schema 合法可回读。

### 写钩子（HookEditor）

只写函数体，形参固定 `ctx`（编辑器顶部提示「可用参数：ctx」），语法与 `ctx` API 见[事件钩子](/form-designer/events)。编辑器受控：正文直接读 `value.body`，引用列表上移 / 删除 / 切换后不会残留旧正文；**空正文合法**，表示「什么都不做」；正文不做 `trim`，否则从空正文起手打不进前导空格。

红字提示与保存拦截共用同一套口径（`events/validateEvents.ts` / `events/fnSource.ts`）：形参是合法标识符、正文能试编译、长度 ≤ 20000 字符。**红字能提示的，保存一定也能拦**。

### 画布不执行钩子、联动与取数

设计态画布只做视觉呈现（`Canvas` 用 `component={false}` 的 `Form` 承载样式，`CanvasItem` 直接调 `canvasRender ?? render`，不经过 `FieldItem` / `FieldControl`），因此**不跑钩子、不求联动有效态、也不触发数据来源取数**。画布上的必填星号读的是 `formItem.rules`，响应式断点也只镜像 `span`。

真正执行这些行为的是预览弹窗与业务渲染页里的 `FormRenderer`——所以在画布上改钩子 / 联动 / 数据来源不会有运行反馈，要看效果得开预览。

### 工具栏

| 操作 | 说明 |
|------|------|
| 撤销 / 重做 | 按历史栈可用性自动禁用 |
| 导入 | 粘贴 `FormSchema` JSON，格式非法或字段名不合法（重名 / 为空 / 含空格或点号）则报错并说明原因，不覆盖当前画布 |
| 导出 | 只读展示当前 schema JSON，聚焦自动全选；打开前与保存同口径校验字段级配置（栅格 / 校验规则 / 数据来源 / 联动）与事件钩子 |
| 清空 | 二次确认后清空全部字段（可撤销） |
| 预览 | 弹窗内用 `FormRenderer` 真实渲染当前 schema，提交后展示 JSON |
| 保存 | 仅在传入 `onSave` 时出现；保存前校验字段名、字段级配置形状与事件钩子（形状 + 语法 + 正文长度），任一不过即拼成一条提示并中止（不调用 `onSave`） |

## FormRenderer

```tsx
interface FormRendererProps {
  schema: FormSchema
  initialValues?: Record<string, any>
  onSubmit?: (values: Record<string, any>) => void
  /** 是否显示提交 / 重置按钮，业务页面可自行接管提交 */
  showActions?: boolean // 默认 true
  /** 外部表单实例，便于业务页提交后 resetFields / setFieldsValue */
  form?: FormInstance // 默认内部自建
}
```

```tsx
<FormRenderer
  schema={schema}
  initialValues={draft}
  showActions={false}
  onSubmit={handleSubmit}
/>
```

渲染流程：`renderField` 按组件声明分发——未注册类型降级为警告块；`nestList` 容器交给 `ListField`（`Form.List` + `renderList`）；其余容器交给 `ContainerField`（`nestObject` 时下发名路径前缀）；`noFormItem` 组件直接渲染；剩下的走 `FieldItem`（`Form.Item` + `FieldControl`）。

`FieldControl` 是一层转发组件：`Form.Item` 注入的受控 props（`value` / `onChange`，或 `valuePropName` 指定的 `checked` / `fileList`）会并入 `schema.props` 后交给 `def.render`，因此组件声明无需关心受控签名；`Transfer` 等 `onChange` 签名特殊的组件在自己的 `render` 内处理。

## 已知限制

| 限制 | 说明 |
|------|------|
| 单页签 / 单面板 / 单步骤 | `tabs`、`collapse`、`stepForm` 均为简化版视觉容器，多页签需要给 children 增加分组语义（schema 扩展） |
| `descriptions` 画布态 | 无法把子节点拆分到各个 item，画布内按顺序平铺 |
| `upload` 无后端 | 仅前端收集 `fileList`，service 端尚无上传路由与静态目录 |
| `tableForm` 细节 | 列宽 / 对齐、行内校验、数组级 min/max 规则（`Form.List` rules）未接入 |
| 无发布版读取接口 | `GET /form/:id/schema` 暂未实现——渲染演示页需要能看草稿，待有对外填写场景再加 |
| 历史 schema 的字段名 | 早期保存的 schema 若存在重名字段，重新打开后保存会被拦截，需要先按提示改名 |
| 画布不镜像联动与断点 | 画布的隐藏 / 必填 / 禁用不随值变化，响应式断点也不镜像（媒体查询依赖真实视口宽度）；两者都要在预览或业务页里看 |
| 顶层字段的 `Col` | `Col` 只在 `Row` 这类 flex 行父容器里才真正并排；顶层字段设 `span` 只表现为「限宽 + 换行」 |
| 隐藏与必填同时命中 | 联动规则合并后同时含 `hidden` 与 `required` 时，提交会被必填拦住但错误提示不可见（用户只看到「点了提交没反应」）；面板会红字提示，需要条件必填时请不要同时隐藏 |

## 相关文档

- [Schema 结构与名路径](/form-designer/schema)
- [渲染项配置](/form-designer/render-config) — 字段级栅格、校验规则、数据来源、联动与已知限制
- [事件钩子](/form-designer/events) — 场景清单、`ctx` API、公共事件复用与风险边界
- [组件清单与注册](/form-designer/components)
