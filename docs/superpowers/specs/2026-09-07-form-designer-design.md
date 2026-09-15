# FormDesigner（React + antd 6 自研表单设计器）设计规格

日期：2026-09-07
状态：已获用户批准（头脑风暴三节设计逐节确认）；P1–P5 已于 2026-09-10 全部落地，实现偏差与落地状态见 §12

## 1. 背景与目标

将 `form-manage.web` 项目中 form-designer（FormCreate 商业版，Vue 3 + Element Plus，312 文件约 6.4 万行）的能力，以 React + antd 6 自研重写，集成到 zealous-admin 模板，作为 `packages/form-designer` 包。

**关键决策（用户已确认）：**

| 决策点 | 结论 |
|---|---|
| Schema 格式 | 自研 schema，不兼容 form-create rule JSON，不管旧数据 |
| 组件范围 | 精简全量（基础 + 布局 + 子表单，约 36 个；富文本/图表/签名/二维码等重组件暂不接入） |
| 双端 | 只做 PC 端，不做移动端 |
| 集成形态 | 包 + 演示页 + 后端存取（完整闭环） |
| 架构 | 方案 A：声明式组件注册表 + 单一真实渲染（画布/预览/运行时共用） |

**License 约束**：原包为 FormCreate 商业版（"未经授权不得使用、修改或移除版权信息"）。本实现**全部代码自研**，仅参考其交互模式与组件清单，不复制任何源码。

**非目标（YAGNI）**：

- 移动端设计与渲染
- 富文本（wangEditor）、图表（echarts）、签名板、二维码、HTML 嵌入、JSON 编辑器（后续按需增量接入）
- 事件 JS 表达式配置、JS 函数编辑器（二期评估）
- AI 生成表单（原项目 ai/ 目录能力）
- 原项目业务组件（组织选择器、干系人选择器、天地图等）

## 2. 包结构

```
packages/form-designer/
  index.ts                        # 导出 FormDesigner、FormRenderer、registerComponent、类型
  types/schema.ts                 # Schema 类型定义
  registry/
    registry.ts                   # registerComponent / getComponent / getMenus
    components/                   # 每个组件一个定义文件
      input.ts / select.ts / ...  # defaultSchema + render + configForm
      _containers/ row.ts col.ts card.ts tabs.ts ...
  designer/
    FormDesigner.tsx              # 三栏布局 + 顶部工具栏
    LeftPanel.tsx                 # 组件面板（分组 + 搜索 + 拖拽源）
    Canvas/
      Canvas.tsx                  # 画布（@dnd-kit 放置区）
      CanvasItem.tsx              # 单项包装：选中/悬停/拖拽/复制/删除/嵌套
    RightPanel.tsx                # 属性 / 表单全局配置 Tab
    ConfigFormRenderer.tsx        # meta 配置 → antd Form 渲染器
    Toolbar.tsx                   # 撤销/重做/预览/导入/导出/清空/保存
    store.ts                      # Zustand：schema 树 + 选中项 + 历史栈
  renderer/
    FormRenderer.tsx              # 运行时渲染（设计器画布 & 预览 & 业务复用同一组件）
    renderItem.tsx                # 单个 schema → Form.Item 递归渲染
  utils/  uniqueId / schemaWalker / json io
```

包通过现有 `@zealous-admin` alias 引入（`packages` 目录已映射）。

## 3. Schema 数据模型（自研）

```ts
interface FormSchema {
  version: 1
  form: FormGlobalConfig      // labelAlign、size、labelCol、disabled 等全局配置
  children: FieldSchema[]     // 表单字段树（容器类通过 children 嵌套）
}

interface FieldSchema {
  id: string                  // 唯一 id（拖拽/选中主键）
  type: string                // 'input' | 'select' | 'row' | ...
  field?: string              // 表单字段名，提交数据的 key（容器/辅助类可为空）
  label?: string
  props: Record<string, any>  // 直接透传给 antd 组件的 props，无中间层转换
  formItem?: {                // Form.Item 层面配置
    rules?: Rule[]
    required?: boolean
    tooltip?: string
    extra?: string
    labelCol?: ColProps
    hidden?: boolean
  }
  children?: FieldSchema[]    // 容器类：row/col/card/tabs/subForm/tableForm
}
```

设计要点：

- `props` 直接对应 antd 组件 props，配置面板改什么 antd 就吃什么。
- 树形结构，`id` 为主键，`field` 只是提交数据 key。
- 嵌套容器（Row > Col > Input）通过 `children` 递归，拖拽时整个子树一起移动。

## 4. 设计器交互与状态管理

**三栏布局**：顶部工具栏（撤销/重做/清空/导入/导出/预览/保存）；左侧组件面板（分组折叠 + 搜索过滤 + 拖拽源）；中间画布（真实 antd 渲染的表单外观）；右侧配置（属性 Tab / 表单全局配置 Tab）。

**Zustand store（`designer/store.ts`）**：

```ts
{
  schema: FormSchema
  selectedId: string | null
  history: { past: FormSchema[], future: FormSchema[] }  // 快照式撤销重做
  addField(type, targetId?, index?)
  moveField(id, targetId, index)
  removeField(id) / duplicateField(id)
  updateProps(id, path, value)      // 每次变更推历史快照
  updateFormConfig(patch)
  undo() / redo() / clear()
  importSchema(json) / exportSchema()
}
```

**拖拽**：使用项目已有依赖 `@dnd-kit/react`。左侧组件项为 drag source（携带 type）；画布及每个容器（Col、Card、Tabs 页签、SubForm）为 drop zone；画布内已有字段也是 drag source，支持排序与跨容器移动。插入位置显示 2px primary 色指示线。

**画布交互拦截**：`CanvasItem` 外层壳 `position: relative`，组件本体上盖透明遮罩（`position: absolute; inset: 0`）吃掉鼠标事件——点击 = 选中，不触发真实输入。悬停显示描边，选中显示 primary 描边 + 浮动操作钮（复制、删除，容器类加拖拽手柄）。

**键盘**：Delete 删除选中项、Ctrl+Z / Ctrl+Shift+Z 撤销重做、Ctrl+D 复制。

**配置面板**：`ConfigFormRenderer` 将每个组件声明的 `configForm` meta 数组映射为 antd Form 项（约 60 行核心），不引入任何表单引擎。校验规则提供"必填 + 类型 + 正则 + 自定义提示"可视化编辑。

## 5. 渲染器（FormRenderer）

对外三个用法，同一组件：

```tsx
// 1. 设计器画布内部复用（带拦截壳）
// 2. 设计器预览弹窗：真实可交互 + 提交回调 formData
<FormRenderer schema={schema} onSubmit={(values) => ...} />
// 3. 业务页运行时渲染
<FormRenderer schema={remoteSchema} initialValues={...} onSubmit={save} />
```

内部为 antd `Form` + 递归 `renderItem`：非容器 → `Form.Item` 包 `registry[type].render(props)`；容器 → 渲染自身壳再递归 children。`form` 全局配置透传给 antd `Form`。

## 6. 组件清单（约 36 个）

> 实际注册 37 个（`row` / `col` 分开注册），见 §12.2。

| 分组 | 组件 |
|---|---|
| 基础输入 (17) | 输入框、文本域、数字、密码、下拉、单选、多选、开关、日期、日期范围、时间、级联、树选择、评分、滑块、颜色、穿梭框 |
| 高级 (3) | 上传、金额输入、图标选择器（复用 ZaIcon 体系） |
| 布局 (8) | Row/Col、卡片、分割线、折叠面板、标签页、Space、描述列表、Flex |
| 子表单 (3) | SubForm（嵌套对象）、TableForm（antd Table 行内编辑数组）、StepForm |
| 辅助 (5) | 文本、段落、Alert 提示块、按钮、链接 |

后续增量候选（不在本期）：富文本、图表、签名板、二维码、HTML、JSON 编辑器。

## 7. 后端存取（service 端）

> 实际落地的接口形态、表结构与日期约定与本节有偏差，见 §12.3。

```ts
// Drizzle schema 新增 form 表
form: id, name, category, description, schema(text, JSON 字符串),
      status(草稿/发布), version, createTime, updateTime

// 路由 service/src/routes/form.ts
GET    /form/list         分页 + 搜索
GET    /form/:id
POST   /form/create
PUT    /form/:id          存 schema + version+1
DELETE /form/:id
GET    /form/:id/schema   运行时取发布版
```

注意：数据库写入日期直接传 `new Date()`，禁止 `toISOString()`（项目 CLAUDE.md 约束）。

**演示页（src/pages）**：

- `/form/list`：表单管理列表（antd Table + 新建/编辑/删除/复制）
- `/form/design/:id?`：设计器页（保存调后端）
- `/form/render/:id`：渲染测试页（取发布 schema 真实提交）

## 8. 分期计划

| 阶段 | 内容 | 验收标准 |
|---|---|---|
| P1 骨架 | 包搭建、注册表、schema 类型、store、三栏布局、拖拽、选中/删除/复制 | 拖 3 个 input 进画布能排序、删除、撤销 |
| P2 基础组件 | 17 个基础输入组件 + 配置面板 + 预览/导入/导出 | 设计一个完整表单，预览提交拿到正确 values |
| P3 布局+辅助+嵌套 | 8 个布局组件 + 5 个辅助组件、容器嵌套拖拽 | 卡片套 Row 套 Col 套输入框正常工作 |
| P4 后端闭环 | form 表 + CRUD + 三个演示页 | 列表→设计→保存→渲染测试全链路通 |
| P5 子表单+高级 | SubForm/TableForm/StepForm + 上传/金额输入/图标选择器 | 子表单提交嵌套数据结构正确 |

P1–P4 构成完整可用闭环；P5 逐组件增量添加，互不影响。

## 9. 错误处理

- 导入 JSON 非法：message.error 提示，不覆盖当前 schema。
- schema 中出现未注册的 type：渲染时降级为警告占位块，不崩溃。
- 保存接口失败：保留本地 schema，message.error 提示重试。
- 删除含子字段的容器：二次确认（Modal.confirm，走 useAppMessage 体系）。

## 10. 测试

- `utils/`（schemaWalker、uniqueId、json io）与 `store.ts` 的纯逻辑用 Vitest 单测：增删移动字段、撤销重做、导入导出往返一致。
- 渲染器冒烟测试：每个注册组件用 defaultSchema 渲染不抛错。
- 手动验收走第 8 节分期验收标准（项目无 E2E 设施，不新增）。

## 11. 依赖新增

> 本节后端技术栈描述有误（实际为 Express 5 + `node:sqlite`），见 §12.4。

- 前端：**零新增**。拖拽复用已有 `@dnd-kit/react`，状态复用 zustand，不引入表单引擎/低代码框架。（富文本/echarts/qrcode/signature_pad 等依赖随对应组件后续增量接入时再添加。）
- 后端：无新依赖（沿用 Hono + Drizzle + mysql2 现有体系）。

## 12. 实现偏差与落地状态（2026-09-11 回写）

本节记录规格批准后实际落地时的偏差。§1–§11 原文保持不动，以留存当时的决策依据。

### 12.1 分期完成状态

| 阶段 | 状态 | 对应任务与提交 |
|---|---|---|
| P1 骨架 | 已完成 | T1–T7，`9379e01`→`d36a9ee`（2026-09-07） |
| P2 基础组件 | 已完成 | T8，`3ea2db9`、`a609cb7` |
| P3 布局+辅助+嵌套 | 已完成 | T9–T10，`19d5a03`→`898a977` |
| P4 后端闭环 | 已完成 | T11–T12，`2ba26f2`→`7b85b3e`（含 `a14102b` 配置面板撤销合并增强） |
| P5 子表单+高级 | 已完成 | `5748b09`、`78ca47c`（2026-09-10/11） |

§9 错误处理 4 条、§10 测试 3 条均已落地。截至 2026-09-11：Vitest 10 文件 / 103 测试全绿，改动路径 `eslint` 0 error，`pnpm docs:build` 通过，后端接口全链路实测通。

任务拆解与逐步记录见 `docs/superpowers/plans/2026-09-07-form-designer.md`（P1–P4）与 `docs/superpowers/plans/2026-09-10-form-designer-p5.md`（P5）。使用文档见 `docs/form-designer/`。

### 12.2 §6 组件清单

实际注册 **37** 个（规格估算约 36）。差异来源：布局组 9 个——`row` 与 `col` 分开注册，规格表中「Row/Col」按一项计。其余分组与规格一致：基础输入 17、高级 3、子表单 3、辅助 5。

左侧面板分组由 3 组扩展为 5 组：`MenuGroup` 增加 `advanced`（高级组件）与 `subform`（子表单），分组标题由 `getMenus()` 动态生成，面板代码无需改动。

### 12.3 §7 后端存取

| 规格 | 实际 | 原因 |
|---|---|---|
| `GET /form/:id` | `GET /form/detail?id=` | 与项目既有 `admin` / `role` / `menu` 路由风格一致（不用路径参数） |
| `PUT /form/:id` | `POST /form/update` | 同上 |
| `DELETE /form/:id` | `POST /form/delete` | 同上 |
| `GET /form/:id/schema`（运行时取发布版） | **未实现** | 无消费方：渲染演示页需要能看草稿。待出现对外填写场景再加 |
| 表含 `category` 列 | **未实现** | 当前无分类需求。`za_form` 只有 id / name / description / schema / status / version / create_time / update_time |
| 演示页 `/form/design/:id?`、`/form/render/:id` | `/form/design?id=`、`/form/render?id=` | file-based routing 下用 query 传参更简单，避免引入动态路由配置 |
| 「日期直接传 `new Date()`，禁止 `toISOString()`」 | 用 `service/src/lib/date.ts` 的 `now()` 存 TEXT（`YYYY-MM-DD HH:mm:ss`，本地时区） | 实际是 `node:sqlite`，没有 mysql2 的 Date 序列化。ISO 的 `T` / `Z` 形态与既有行不一致，会破坏排序与前端 dayjs 解析 |

补充实现细节：`version` 仅在请求体带 `schema` 时 +1（改名 / 改状态不占版本号）；列表接口不返回 `schema` 字段，避免大文本随分页传输；表单管理菜单由 `service/src/db/index.ts` 的幂等迁移插入 `za_menu`。

发布状态流转（§7 未细化）：`status` 0 草稿 / 1 已发布，列表页操作列按当前值切换「发布 / 下线」，复用 `POST /form/update`。

### 12.4 §11 依赖新增

- **后端技术栈描述有误**：规格写「沿用 Hono + Drizzle + mysql2」，实际项目自始至终是 **Express 5 + `node:sqlite`（`DatabaseSync`），无 ORM**，默认端口 3508。CLAUDE.md 已于 2026-09-10 一并纠正。
- **前端运行时依赖确实零新增**，符合规格。两处补充说明：
  - devDependencies 新增 `jsdom`、`@testing-library/react`——§10 要求渲染器冒烟测试所需，非运行时依赖
  - `packages/form-designer/package.json` 增加 `@zealous-admin/components: workspace:*` peerDependency，用于图标选择器复用 `ZaIconPicker`（§6 已要求「复用 ZaIcon 体系」）

### 12.5 §10 测试

实际覆盖超出规格。除 `utils/` 与 `store.ts` 纯逻辑单测、渲染器冒烟测试外，新增：

- `renderer/namePrefix.test.ts`：名路径拼接纯逻辑
- `renderer/nestedValue.test.tsx`：嵌套提交结构（`{ contact: { … } }` / `items: [{ … }]`）与数组行增删
- `renderer/FormRenderer.form.test.tsx`（2026-09-15）：`FormRenderer` 新增外部表单实例 prop 后，外部实例接管取值与重置、未传时内部实例兜底提交
- `designer/FormDesigner.interaction.test.tsx`：左栏分组、画布设计态外壳、值绑定容器与普通容器的属性面板差异、预览弹窗内表格子表单增删行与提交结构、容器删除二次确认与撤销

仍为 Vitest + jsdom，未引入 E2E 设施，符合规格约定。渲染类测试文件首行声明 `// @vitest-environment jsdom`；因 `@dnd-kit/dom` 在模块求值期即读取 `ResizeObserver`，涉及设计器的测试需最先 import `test/setupDom.ts`。

真实浏览器验收：2026-09-10 已在 dev server 拖入 `number` / `icon` / `password` 并保存成功，验证了 `icon` 组件与 `ZaIconPicker` 的 workspace 依赖解析。其余 5 个 P5 新组件（`upload` / `money` / `subForm` / `tableForm` / `stepForm`）的真机拖拽验收待补。

### 12.6 遗留与后续增量

本期明确不做，记录备查（详见 P5 计划「已知限制」一节）：

- `tabs` / `collapse` / `stepForm` 为单页签 / 单面板 / 单步骤简化版；支持多页签需给 `children` 增加分组语义（schema 扩展）
- `descriptions` 画布态无法把子节点拆分到各 item
- `upload` 仅前端收集 `fileList`，service 端尚无上传路由与静态目录
- `tableForm` 的列宽 / 对齐、行内校验、数组级 min/max（`Form.List` rules）未接入
- §1 非目标不变：移动端，富文本 / 图表 / 签名板 / 二维码 / HTML / JSON 编辑器，事件 JS 表达式配置，AI 生成表单

### 12.7 填写数据落库（2026-09-15 新增）

规格 §7 只覆盖表单定义的存取，未定义填写数据的收集，2026-09-15 补齐。采用「JSON 主存 + 冗余列」折中方案，不做按字段拆列，详见 `docs/form-designer/data.md`。

**表 `za_form_data`**（`service/src/db/index.ts` 幂等建表，`(form_id, id)` 索引）：`id`、`form_id`、`form_version`（提交时的 `za_form.version`，追溯结构变更）、`submitter`（JWT 用户名）、`status`（1 有效 / 0 已作废）、`data`（整份 values 的 JSON 字符串）、`create_time`（`now()` 格式）。`POST /form/delete` 删表单时级联清空该表单的数据。

**接口**（`service/src/routes/formData.ts`，只过 `authMiddleware`，无角色级权限）：`POST /form/data/submit`、`GET /form/data/list`（`formId` 必传，`submitter` / `status` 过滤 + 分页，`id DESC`）、`GET /form/data/detail`、`POST /form/data/updateStatus`、`POST /form/data/delete`。`data` 必须是非数组对象；提交不校验发布态（设计期可测）；`GET /form/list` 相关子查询带出 `dataCount`。

**前端**：`src/apis/form.ts` 新增 `FormDataRecord` 与 5 个 API；`FormRenderer` 新增可选 `form?: FormInstance` prop（外部实例接管，业务页提交后可 `resetFields`）；渲染页 `/form/render?id=` 提交即落库；新增数据管理页 `/form/data?id=`（schema 顶层字段动态列、容器值 JSON 化、`FormRenderer` 只读回显详情抽屉、作废 / 恢复、删除、带 BOM 的 CSV 导出）；表单列表加「数据量」列与「数据」入口。

**验证**：接口真实后端全链路实测通过（登录 → 建表单 → 存 schema → 发布 → 提交 ×3 → 分页 / 过滤 → 详情 → 作废恢复 → 删除 → 级联删除，含未鉴权 401、异常分支、中文 UTF-8 往返无损），使用临时 `DB_PATH` 隔离，未污染 `service/data/sqlite.db`；前端测试合计 11 文件 105 用例全绿。

**遗留**：`upload` 提交值仍为 `{}`（File 不可序列化，待补上传接口）；CSV 导出单次拉取上限 9999 条；库内无法按字段聚合，统计需应用层展开；`GET /form/:id/schema` 免鉴权消费方仍无（§12.3 不变）。

### 12.8 字段名校验（2026-09-15 新增）

§3 / §4 未约束 `field` 的取值，而属性面板的字段名是自由文本、`importSchema` 也只校验 `version` 与形状，导致手动改名可产生同名字段。同名字段会绑定到 rc-field-form 的同一个 store 槽位（互相串改、校验互扰、提交覆盖），且全程静默——接上 §12.7 的落库后即直接产生脏数据。本期补齐校验。

**作用域模型**（关键设计）：唯一性按「命名作用域」判定而非直接父节点。依据是渲染器的实际前缀行为（见 §5 名路径）：只有 `nestObject` / `nestList` 容器会下发前缀，普通容器（`row` / `col` / `card` / `tabs` / `descriptions` …）不产生新作用域。因此 `row > col > 输入框` 里的字段与根层字段同域，重名必须能被查出；`nestObject` / `nestList` 另起一层，两个子表单各有一个 `name` 合法。无 `field` 的值绑定容器不下发前缀（`nestList` 无 `field` 时子节点不渲染），按同作用域继续下探。

**格式约束**：非空、不含空白字符、不含点号（点号与配置项点分路径 `setByPath` 语义冲突，嵌套应使用子表单容器）。

**实现**（`packages/form-designer/utils/fieldName.ts`，纯函数便于单测）：`nodeBindsField`（与属性面板「字段名」项的出现条件统一为同一谓词，避免漂移）、`validateFieldNameFormat`、`findDuplicateFieldNames`、`getFieldNameIssue`（单节点内联提示）、`validateSchemaFieldNames`（整体校验）。接入点三处：属性面板红字提示；`FormDesigner` 保存前拦截（不通过不调用 `onSave`）；`importSchema` 拒绝并给出具体冲突项——`importSchema` 的返回类型由 `boolean` 改为 `ImportResult`（`{ ok: true } | { ok: false, reason }`），`Toolbar` 的导入失败提示从通用的「JSON 格式不正确」改为精确原因。

**未采用**：导入时自动重命名重复字段。批量粘贴时静默改写用户的字段名比报错并说明更糟；被拒绝的 schema 不会改动当前画布。

**验证**：新增 36 条测试，覆盖作用域展开边界（布局容器多层嵌套、值绑定容器内外同名、数组容器内部重名、空字段名不参与判定、无值容器残留字段不参与判定）、导入拦截与回滚、保存拦截，并以 37 个内置组件的默认 schema 做无假报守卫；前端测试合计 12 文件 141 用例全绿。

**遗留**：校验只在设计器侧（提示 + 保存 / 导入拦截），`POST /form/update` 对 `schema` 字符串不做结构校验，绕过设计器直接调接口仍可写入重名字段。待有第三方写入场景时再补服务端校验。
