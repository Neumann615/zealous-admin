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
| 校验规则 | 非容器且非辅助组件 | `ValidateRule` 列表编辑器 |
| 组件属性 | `configForm` 非空 | 组件自己声明的配置项 |

值绑定容器（`subForm` / `tableForm`）同样显示「字段名」——它决定提交结构的 key；但容器不挂 `Form.Item`，因此不开放校验规则。

「表单」页签编辑全局配置：布局（水平/垂直/行内）、标签对齐、尺寸、显示冒号、整体禁用，直接透传给 antd `Form`。

### 工具栏

| 操作 | 说明 |
|------|------|
| 撤销 / 重做 | 按历史栈可用性自动禁用 |
| 导入 | 粘贴 `FormSchema` JSON，格式非法或字段名不合法（重名 / 为空 / 含空格或点号）则报错并说明原因，不覆盖当前画布 |
| 导出 | 只读展示当前 schema JSON，聚焦自动全选 |
| 清空 | 二次确认后清空全部字段（可撤销） |
| 预览 | 弹窗内用 `FormRenderer` 真实渲染当前 schema，提交后展示 JSON |
| 保存 | 仅在传入 `onSave` 时出现；保存前校验字段名，不通过则提示并中止（不调用 `onSave`） |

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

## 相关文档

- [Schema 结构与名路径](/form-designer/schema)
- [组件清单与注册](/form-designer/components)