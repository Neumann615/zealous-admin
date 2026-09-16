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

### 12.9 全局配置与事件钩子（2026-09-15 新增）

§3 / §4 只覆盖「字段 + 少量全局配置」，未定义全局配置命名空间，也没有任何事件能力。本批次把 `schema.form` 升级为真正的**全局配置命名空间**，并新增**可序列化的表单级场景钩子 + 命名公共事件表**。实现计划见 `docs/superpowers/plans/2026-09-15-form-designer-global-config-hooks.md`（批次 1–2），使用文档见 `docs/form-designer/events.md`。

**schema v2 与解析收口**：`SCHEMA_VERSION` 抬到 `2`，新增 `events` / `dataSources` 两个**可选**段；新增 `utils/parseSchema.ts` 作为**唯一解析入口**（接受字符串或已解析对象），内含 v1→v2 迁移（纯增量，只抬版本号）、未知高版本拒绝、`children` / `form` 形状校验与 `events` 形状校验。设计器 `importSchema`、页面装载与测试夹具统一走它，不再各自 `JSON.parse`。

**全局配置**：`FormGlobalConfig` 拆为 `AntdFormPassthrough`（`layout` / `labelAlign` / `size` / `colon` / `disabled`，白名单透传，`renderer/formProps.ts` 用类型级断言防止新增键漏进白名单）与设计器自有项（`labelWidth` → `labelCol`、`hideRequiredAsterisk` → `requiredMark`、`submitBtn` / `resetBtn`）。换算集中在 `buildFormProps`，画布与运行时共用。设计器右栏「表单」页签由单段改为 表单配置 / 全局事件 / 公共事件 三段。

**与参照实现的偏差**（只对齐数据模型与能力，不复制其实现代码；参照软件为商业授权版）：

| 参照实现（form-create Pro） | 本项目 | 原因 |
|---|---|---|
| 钩子以 `[[FORM-CREATE-PREFIX-…]]` 字符串前后缀标记序列化 | 结构化信封 `{ $type: 'fn', args, body }` | 无正则剥壳、不与用户正文混淆、可结构化校验 |
| 每次触发重新 `new Function` | `compileFn` 按 `args + body` 记忆化（上限 500 条，超出整体清空） | 同一钩子反复触发不重复编译 |
| 场景名 `beforeFetch` | 更名 `beforeLoadData` | 批次 3 的声明式数据源叫 loadData，避免与「提交时 fetch」混淆 |
| 9 个场景：`onSubmit` / `onReset` / `onCreated` / `onMounted` / `onBeforeUnmount` / `onReload` / `onChange` / `beforeSubmit` / `beforeFetch` | 12 个场景：前四者更名为 `onFormCreated` / `onFormMounted` / `onFormUnmount` / `onFieldChange`，再加 `beforeLoadData`、`afterSubmit`、`onValidateFail`、`onSubmitError` | 提交动作归宿主（`FormRenderer` 的 `onSubmit` prop），钩子只做前 / 后置：参照实现的 `onSubmit` 落到 `afterSubmit`；另补校验失败与提交失败两条分支 |
| 字段级 `$GLOBAL:事件名` 引用 | 表单级 `{ hook: '名字' }` 引用 | 字段级入口留到后续增量 |
| 同步编译、同步调用 | 统一 `AsyncFunction` 编译，`runHooks` 侧统一 `await` 结果 | 钩子体允许顶层 `await`；同步体无行为差异 |

**执行语义**：`CRITICAL_SCENES = ['beforeSubmit', 'beforeLoadData']`——关键场景钩子 `return false` 或抛错即**中断**（`beforeSubmit` 中断后不调用 `onSubmit`、不触发 `afterSubmit`）；非关键场景 `return false` 被忽略、抛错只跳过该条并提示。同场景内按 `order` 升序执行（`Array.sort` 稳定）。`watch` 过滤的**唯一实现**是 `runHooks.ts` 的 `filterRefsForField`（未声明 `watch` 的引用对任意字段触发），面板与渲染器都只经这一处，避免两边口径分叉。`ctx.emit` **返回 `Promise<void>`**，命名公共事件可被 `await` 串联；递归深度按 ctx 副本（`WeakMap`）记账、上限 5 层，自 emit 或两个事件互 emit 会被截断并提示。错误上报：弹窗按稳定 key 覆盖（不逐键刷屏）、`console.error` 按场景 / 公共事件名去重、上报失败不影响控制流。提交报文只含**已注册字段**（`FormRenderer` 用无参 `form.getFieldsValue()` 取值），钩子里写未注册字段不会进 `onSubmit`。

**模型 A（已接受的风险）**：钩子以 `AsyncFunction` 编译、**无沙箱**，等价于让有表单设计权限者在所有终端用户浏览器执行任意 JS——这是权限提升，不只是 XSS，2026-09-15 确认接受。缓解：保存前试编译、失败红字提示且阻止保存；运行时逐条 `try/catch`；钩子只接收单一 `ctx` 入参（降低误用，不构成沙箱）。两个**无护栏**边界已写入文档：同步死循环（`while (true)`）锁死页面、`beforeSubmit` 里永不 resolve 的 promise 让表单无法提交，均无超时机制。**重新评估条件**：表单设计权限开放给更多角色，或表单定义开始接受外部来源 / 不受信任的导入（设计器自带的 JSON 导入是自家导出、属受信来源，不算），届时改用具名钩子注册表（模型 B）。

**设计器**：`HookEditor` 只写函数体（形参固定 `ctx`）、受控（引用列表上移 / 删除 / 切换后不残留旧正文）、**空正文合法**（删除钩子由删除按钮负责，避免产出 `{}` 这种存得进、读不回的引用）；保存前与字段名校验并列执行钩子校验（形状 + 语法 + 正文 ≤ 20000 字符），任一不过即拼接提示并中止。画布（设计态）**不执行**钩子，预览弹窗与业务渲染页执行。

**服务端现状（§12.8 遗留不变）**：`parseSchema` 已校验 `events` 形状，但服务端 `POST /form/update` 仍只把 `schema` 当字符串存，不做结构校验——绕过设计器直接调接口仍可写入不合规的 `events`。

**验证**：Vitest 18 文件 / 243 用例全绿；`eslint packages/form-designer src/pages/index/form` 0 error（两条既有 `react/no-array-index-key` warning 除外）；`tsc --noEmit` 本批次文件 0 条新增（既有报错集中在 `packages/layout` 等无关文件）；`pnpm docs:build` 通过。

**遗留**：数据源三场景（`beforeLoadData` / `afterLoadData` / `onReload`）与 `ctx.reload()` 待批次 3 落地（当前不触发、空实现）；字段级钩子（`field.hooks`）与字段级按名引用未接入；`HookEditor` 计划升级 CodeMirror 6（语法高亮 + `ctx` 补全 + lint）；其余已知限制（嵌套字段 `onFieldChange` 只上报顶层段名导致 `watch` 不命中、`onReset` / `onValidateFail` 只覆盖渲染器自身路径、删除公共事件后 `event_${n}` 键名复用会让旧引用静默改绑）见 `docs/form-designer/events.md`。

### 12.10 字段级渲染项配置（2026-09-16 新增）

§3 / §4 只定义了「字段 = 类型 + 字段名 + props + 简单校验」，没有栅格、没有数据来源、没有联动。本批次补齐四项**字段级**配置，全部是 `FieldSchema` 的增量字段，运行时行为集中在渲染器：`col`（渲染时包一层 `Col`）、`formItem.rules` 扩展（16 种类型 + `trigger` + 自定义校验）、`dataSource`（声明式取数后写进 `props.options`）、`control`（按值控制隐藏 / 禁用 / 必填）。实现计划见 `docs/superpowers/plans/2026-09-16-form-designer-render-config.md`（批次 3A / 3B），使用文档见 `docs/form-designer/render-config.md`。

**与参照实现（form-create Pro）的偏差**（只对齐能力与数据模型，不复制实现代码；参照软件为商业授权版）：

| 参照实现 | 本项目 | 原因 |
|---|---|---|
| `rule.effect.fetch` 直接写 `action`（URL）/ `method` / `query` / `data` / `parse` / `to` | 声明式 `dataSource`：`static` / `dict` / `api` 三型，其中接口**只接受宿主注册名**（不填裸 URL） | 鉴权、错误提示、loading 全部走宿主统一的 `http` 实例；表单定义是可导入 / 导出 / 跨环境复制的**数据**，不应携带请求实现，包也不依赖 `@zealous-admin/layout` 与 `src/apis`。字典约定注册名 `'dict'`（参数 `{ dictType }`），接口名清单由 `setFormDataApiCatalog` 可选下发，未下发时面板退化为自由文本输入 |
| 裸 XHR：无取消、无竞态防护 | 自增请求序号**后写胜** + `AbortController` 取消上一请求（宿主函数可接收 `signal`，忽略也不影响正确性） | 依赖字段连续变化时旧响应可能晚于新响应到达，不收敛就会用过期选项覆盖新选项 |
| `{{字段}}` 插值 + `watchData` 深度 watch 全量模板串 + 600ms 防抖 | `{{名路径}}` 插值（`params` 用）+ **显式 `watch`**（名路径数组）+ 默认 300ms 防抖 | 显式声明比隐式扫描模板串更可预测，也与批次 2 `HookRef.watch` 的语义一致；300ms 与表单交互的常规手感匹配 |
| `rule.control = [{ value, condition, rule, method }]`，条件组合表达力更强 | `control: [{ field, operator, value, effects }]`，效果取「或」 | 收敛到「一个依赖字段 + 一个比较 + 一组效果」，面板可直接渲染；条件必填由 `effects: ['required']` 表达，与字段自身 `formItem.required` 取或 |
| 有 `computed`（字段间公式） | **不引入** | 公式求值会牵出依赖图、循环检测与「谁覆盖谁」的语义，收益与风险不成比例；需要派生值时用钩子（`beforeSubmit` / `onFieldChange` + `ctx.setValue`）解决 |

**渲染器契约**（面板与业务页都按这一份口径）：

- `col`：`fieldColProps` 把字段配置转成 antd `Col` 属性并包在字段**最外层**（容器 / 数组容器 / 辅助组件同样适用）；画布外壳经 `shellStyleFromCol` 复用同一份换算，但**只镜像 `span`**（断点由媒体查询驱动，画布没有可依据的视口宽度）。已知限制：`Col` 只在 `Row` 这类 flex 行父容器里才真正并排，顶层字段设 `span` 只表现为「限宽 + 换行」。
- 校验规则：`VALIDATE_RULE_TYPES` 从 5 种扩到 16 种（长度组走 `type: 'string'`、数值组走 `type: 'number'`，避免配错组件恒不通过）；规则级 `trigger` 是字段级时机的**收窄**（`blur` 需要把 `onBlur` 并进 `Form.Item` 的 `validateTrigger`，否则该规则永不执行；`submit` 无字段事件，天然只在提交时生效）；自定义校验**复用批次 2 的公共事件表**（`events.custom`），返回 `true` / `undefined` 通过、字符串作错误消息、`false` 用默认文案、抛错视为不通过并走既有 `notifyError`。
- 数据来源：`useFieldDataSource` 解析 `def`（优先）或 `ref`（查 `schema.dataSources`）→ 取数 → 写 `props.options`；`beforeLoadData`（关键场景，`return false` 中断本次）/ `afterLoadData` 接线；失败 `console.error` + 稳定 key 提示并**保留上一次的选项**（已选值的标签不会消失），`AbortError` 静默；缺注册接口提示「未注册的数据接口：xxx」。
- 联动：`evalControl` 纯函数按当前值求 `{ hidden, disabled, required }`，`FormRenderer` 在首次渲染与值变化时算出**每个字段的有效态**，经既有 `FormHooksProvider`（新增 `controls`，键为节点 id）下发，不新开 provider；`FieldItem` 消费 `hidden` / `required`（`required` 与 `formItem.required` 取或），`FieldControl` 消费 `disabled`（只置真、不回退，面板里显式的 `disabled` 开关仍然有效）；容器的 `disabled` 用同一份 Provider 覆盖 `parentDisabled` 下发给子字段。驱动重算的**值版本号**只由三处自增：挂载（`initialValues` 由 antd 在自己的 effect 里装载）、`onValuesChange`（用户输入）、`ctx.setValue` / `setValues`（钩子改值）—— 最后一条是本轮补的缺口，否则「全局钩子改值 + 联动」要等用户下一次输入才生效；自增不引入循环，因为任何钩子场景都不在值版本号的下游（唯一跨帧链路是数据源 `watch` 的取值比较，按值去重）。
- `ctx.reload`：批次 2 的空实现落地为**重取句柄登记表**——`useFieldDataSource` 挂载时登记 `{ key(名路径), field, reload }`，`ctx.reload()` 重取全部、`ctx.reload(field)` 只重取命中该名路径或字段名的实例，Promise 在取数与随后的 `onReload` 都结束后 resolve；**手动重取才触发 `onReload`**，`watch` 引起的自动重取不触发。

**已知限制（写入使用文档）**：画布不执行钩子 / 联动 / 取数（要看效果得开预览）；`tableForm` 行内字段的联动判定按节点 id 只算一份，多行共享（需要按行取值请在自定义校验 / 钩子里读 `ctx.getValues()`）；`hidden` 与 `required` 同时命中是**死局**（提交被必填拦住，但提示渲染在 `display:none` 的 `Form.Item` 里，面板会红字提示）；`ctx.reload(field)` 按名路径或字段名命中，`tableForm` 行内实例登记的是行相对路径（`0.title`），`ctx.reload('items.0.title')` 命中不到，需用字段名；`await ctx.reload()` 只保证取数、写入选项与 `onReload` 结束，视图更新在随后的渲染帧；只要声明了 `watch` 或 `control`，值变化会重渲染整棵表单；`ctx.reload` 无递归护栏（在 `onReload` 里无条件再次 `reload` 会无限递归）。

**3A 遗留处置**：`validator` 引用的公共事件被删除后，面板就地红字提示「引用的公共事件已不存在」（运行期策略不变：`console.warn` 一次并视为通过）。其余三项重构（拆 `toAntdRules`、`ValidateRule` 改判别联合、长度 / 数值组的元数据表）保持原样，仍记录在实现计划的「3A 收尾轮遗留」中。

**验证**：Vitest 27 文件 / 413 用例全绿；`eslint packages/form-designer src/pages/index/form` 0 error / 4 warning（其中 2 条为既有 `ValidateEditor.tsx` / `OptionsEditor.tsx` 的 `react/no-array-index-key`，另 2 条是本批次新增的 `ControlEditor.tsx` / `DataSourceEditor.tsx` 同类 warning —— 规则列表按索引渲染，与既有编辑器一致）；`tsc --noEmit` 本批次文件 0 条新增（既有报错集中在 `packages/layout` 等无关文件）；`pnpm docs:build` 通过，且文档里的 `FormSchema` / 片段示例抠出来跑过 `parseSchema`。
