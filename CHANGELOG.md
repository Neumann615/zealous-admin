# Changelog

## 2026-09-16

- ✨ **字段级栅格 `col`**（`packages/form-designer/types/schema.ts`、`packages/form-designer/renderer/colProps.ts`、`packages/form-designer/renderer/renderField.tsx`、`packages/form-designer/designer/ColEditor.tsx`）：字段自带 `span` 与 `xs/sm/md/lg/xl` 断点，渲染时在最外层包一层 `Col`（容器 / 数组容器 / 辅助组件同样适用）；画布外壳经 `shellStyleFromCol` 复用同一份换算，换算成与轴向无关的 `width / maxWidth / flexShrink`（`flex` 简写在纵向画布根与横向 `Row` 下含义不同）；属性面板新增「布局」分组
- ✨ **校验规则扩展**（`types/schema.ts`、`renderer/toAntdRules.ts`、`designer/ValidateEditor.tsx`、`designer/ruleType.ts`）：`ValidateRule` 从 5 种扩到 16 种（长度组走 `type: 'string'`、数值组走 `type: 'number'`，面板给语境提示）、新增规则级 `trigger`（`blur` 会把 `onBlur` 并进 `Form.Item` 的 `validateTrigger`，`submit` 天然只在提交时生效），并切类型时归一化丢弃无关字段
- ✨ **自定义校验复用公共事件表**（`renderer/toAntdRules.ts`、`designer/ValidateEditor.tsx`）：`validator` 规则内联正文或按名引用 `events.custom`（`fn` 优先），约定 `true` / `undefined` 通过、字符串作消息、`false` 用默认文案、抛错视为不通过并走既有 `notifyError`；引用已删除时面板红字提示「引用的公共事件已不存在」
- ✨ **声明式数据来源**（`renderer/dataApis.ts`、`renderer/interpolate.ts`、`renderer/useFieldDataSource.ts`、`designer/DataSourceEditor.tsx`）：字段级 `dataSource` 支持 `static` / `dict` / `api`，`api` **只接受宿主注册名**（`registerFormDataApis`，不填裸 URL，包本体不发起请求、不依赖 `layout` 与 `src/apis`），字典走约定名 `dict`；`params` 支持 `{{名路径}}` 插值，`watch` 显式声明依赖字段（名路径，含嵌套）并防抖（默认 300ms）重取，依赖值未变不重复请求；竞态收口为「请求序号后写胜 + `AbortController` 取消上一请求」，失败保留上一次选项并提示（稳定 key），`AbortError` 静默；面板新增「数据来源」分组，接口名列清单由 `setFormDataApiCatalog` 可选下发
- 🔧 **`ctx.reload` 落地与数据源三场景接线**（`renderer/FormRenderer.tsx`、`renderer/hooksContext.ts`）：`ctx.reload(field?)` 从空实现改为重取句柄登记表（无参全部、带参按名路径或字段名命中，Promise 在取数与 `onReload` 结束后 resolve），`beforeLoadData`（关键场景，`return false` 中断本次）/ `afterLoadData` / `onReload` 三个场景接线，且**手动重取才触发 `onReload`**
- ✨ **字段联动 `control`**（`renderer/control.ts`、`renderer/FormRenderer.tsx`、`renderer/FieldItem.tsx`、`renderer/FieldControl.tsx`、`renderer/ContainerField.tsx`、`renderer/ListField.tsx`、`designer/ControlEditor.tsx`）：`control: [{ field, operator, value, effects }]`，`eq/neq/in/empty/notEmpty` 五种比较（`empty` 覆盖 `undefined` / `null` / 空串 / 空数组，非法 operator 按 `eq`），效果取「或」、`required` 与 `formItem.required` 取「或」、`hidden` 用 antd `Form.Item hidden`（值仍在表单里）；有效态按节点 id 经既有 `FormHooksProvider` 下发（不新开 provider），容器的 `disabled` 用同一份 Provider 下发到子字段（子表单 / 表格子表单内 input 一并禁用）；面板新增「联动」分组并提示 `required` 冗余
- 🛡️ **字段级形状校验收口**（`utils/parseSchema.ts`、`designer/FormDesigner.tsx`、`designer/Toolbar.tsx`）：`validateFieldRules(children, dataSources?)` 单一 walk 校验栅格、校验规则、`dataSource`、`schema.dataSources` 与 `control`，保存 / 导出拦截与 `parseSchema()` 解析共用同一份口径；`FormSchema.dataSources` 从占位类型收敛为 `Record<string, DataSourceDef>`
- 🐛 **钩子改值重算联动**（`renderer/FormRenderer.tsx`、`renderer/useFieldDataSource.ts`、`designer/ControlEditor.tsx`）：`ctx.setValue` / `setValues` 写值后自增值版本号，全局钩子（如 `onFormMounted`）改的值立刻重算联动有效态，不再等用户下一次输入；`useFieldDataSource` 的挂载取数依赖改为内容序列化键（宿主每次重渲染都传新 schema 引用时不再重复请求）；`hidden` 与 `required` 同时命中会在联动面板红字提示（该组合下提交会被必填拦住，而错误提示渲染在 `display:none` 的 `Form.Item` 里）
- 🐛 **数据来源面板可用性修正**（`designer/DataSourceEditor.tsx`、`designer/dataSourceType.ts`、`registry/registry.ts`、`registry/components/selectFamily.tsx`、`renderer/FieldControl.tsx`、`renderer/useFieldDataSource.ts`）：接口参数名输入框不再每敲一个字符丢焦点（React key 从参数名改为行位置）；切到「静态选项」时用组件属性里的 `props.options` 播种初值（此前落空数组、当场清空已有选项）；`api` 同类型切换保留 `parse`；取数结果只在组件声明了 `optionProp: 'options'` 时写入 `props.options`（下拉 / 单选 / 多选），面板也据此收窄数据来源分组（`input` / `treeSelect` / `transfer` / `cascader` 不再显示）；`static` 来源不再触发 `beforeLoadData` / `afterLoadData`（没有请求）；字典与接口的选项归一化合并成同一份并统一跳过无效项（缺 value 的字典项会告警而不是产出垃圾选项）
- 🐛 **数组行内字段的名路径收口**（`utils/fieldName.ts`、`designer/ControlEditor.tsx`、`designer/DataSourceEditor.tsx`）：`collectFieldNamePaths` 不再列出 `items.title` 这类恒为 `undefined` 的路径（数组容器只给到容器自身，作用域判定复用 `opensNameScope`）；新增 `getFieldPathIssue` 校验名路径，联动的依赖字段与数据源的 `watch` 对解析不了的路径（数组缺行下标 / 字段已不存在 / 往非容器下探）就地红字提示，并注明行内字段要手写 `items.0.title`
- ✅ **验证**：Vitest 27 文件 / 413 用例全绿（新增竞态后写胜、`beforeLoadData` 中断、失败保留旧选项、`AbortError` 静默、缺注册接口提示、`ctx.reload()` / `ctx.reload('field')`、容器禁用下发、钩子改值立即重算联动、面板写回形状与形状校验各分支等用例）；`eslint packages/form-designer src/pages/index/form` 0 error / 4 warning（2 条为既有 `ValidateEditor.tsx` / `OptionsEditor.tsx` 的 index-key，2 条为新增 `ControlEditor.tsx` / `DataSourceEditor.tsx` 同类）；`tsc --noEmit` 本批次文件 0 条新增；`pnpm docs:build` 通过
- 📝 **文档**：新增 `docs/form-designer/render-config.md`（栅格 / 校验 / 数据来源 / 联动与已知限制），`schema.md` 补四项类型与「形状约束」一节，`designer.md` 属性面板补三组说明，`events.md` 改成 `ctx.reload` 的真实语义，设计规格新增 §12.10

## 2026-09-15

- ✨ **表单填写数据落库**（`service/src/db/index.ts`、`service/src/routes/formData.ts`、`service/src/db/schema.ts`）：新增 `za_form_data` 表，整份填写值以 JSON 存储，冗余 `form_id` / `form_version` / `submitter` / `status` 列支持查询追溯，幂等建表；新增提交 / 分页查询（按提交人、状态过滤）/ 详情 / 作废恢复 / 删除 5 个接口，`GET /form/list` 相关子查询带出 `dataCount`，删表单级联清数据
- ✨ **表单数据管理页**（`src/pages/index/form/data.tsx`）：表单列表新增「数据量」列与「数据」入口，管理页按 schema 顶层字段生成动态列、容器值 JSON 化、详情抽屉用 `FormRenderer` 只读回显、作废 / 恢复、删除与带 BOM 的 CSV 导出，schema 解析失败时退化为原始数据列
- 🔧 **渲染页提交即落库**（`src/pages/index/form/render.tsx`、`packages/form-designer/renderer/FormRenderer.tsx`）：`FormRenderer` 新增可选 `form?: FormInstance` prop（外部实例接管，提交成功后自动清空表单并展示数据编号），兼容不传时的内部实例
- ✅ **验证**：接口真实后端全链路实测通过（含未鉴权 401、异常分支、级联删除、中文 UTF-8 往返，临时 `DB_PATH` 隔离不污染库文件）；新增 `FormRenderer.form.test.tsx` 2 条交互测试，11 文件 105 用例全绿
- 📝 **文档**：新增 `docs/form-designer/data.md`，`docs/form-designer/designer.md` 补 `form` prop，设计规格新增 §12.7「填写数据落库」
- 🛡️ **字段名校验**（`packages/form-designer/utils/fieldName.ts`、`designer/store.ts`、`designer/RightPanel.tsx`、`designer/FormDesigner.tsx`）：同名字段会绑定到 rc-field-form 的同一槽位、静默产生脏数据，现按「命名作用域」校验唯一性——作用域按渲染器实际的前缀下发规则划分，普通容器（`row`/`col`/`card`/`tabs`…）不产生新作用域，故 `row > col > 输入框` 与根层字段同域；格式上禁止空值、空白与点号。属性面板在「字段名」下方红字提示，保存前整体校验、不通过则中止（不再调用 `onSave`），`importSchema` 改为返回 `ImportResult` 并拒绝带字段名问题的 schema（附具体冲突项），导入提示由通用的「JSON 格式不正确」改为精确原因
- ✅ **验证（字段名校验）**：新增 36 条测试（`utils/fieldName.test.ts` 28 条含作用域展开边界、`store.test.ts` 导入拦截 3 条、设计器交互 4 条含保存拦截与 1 条内置组件无假报守卫）；12 文件 141 用例全绿
- 🔧 **schema v2 与解析迁移收口**（`packages/form-designer/types/schema.ts`、`packages/form-designer/utils/parseSchema.ts`）：`SCHEMA_VERSION` 抬到 2，新增 `events` / `dataSources` 两个可选段；新增 `parseSchema()` 作为唯一解析入口（字符串 / 对象皆可），含 v1→v2 迁移、未知高版本拒绝、`children` / `form` / `events` 形状校验，设计器导入与页面装载统一走它，不再各自 `JSON.parse`
- 🔧 **全局配置项与 antd 透传白名单**（`packages/form-designer/types/schema.ts`、`packages/form-designer/renderer/formProps.ts`、`packages/form-designer/designer/FormEventsPanel.tsx`）：`FormGlobalConfig` 拆为透传白名单（`layout` / `labelAlign` / `size` / `colon` / `disabled`，类型级断言防止漏键）与设计器自有项（`labelWidth` → `labelCol`、`hideRequiredAsterisk` → `requiredMark`、`submitBtn` / `resetBtn`），换算集中到 `buildFormProps` 供画布与运行时共用
- ✨ **事件钩子引擎**（`packages/form-designer/events/fnSource.ts`、`packages/form-designer/events/types.ts`、`packages/form-designer/events/runHooks.ts`、`packages/form-designer/events/validateEvents.ts`）：钩子以结构化信封 `{ $type: 'fn', args, body }` 持久化、按 `args + body` 记忆化编译（统一 `AsyncFunction`，支持顶层 `await`）；12 个表单级场景 + 命名公共事件表（场景用 `{ hook: '名字' }` 引用、钩子内 `await ctx.emit('名字', payload)` 复用），关键场景 `beforeSubmit` / `beforeLoadData` 的 `return false` 或抛错中断流程，其余场景返回值不影响控制流；`watch` 按 `filterRefsForField` 单一实现过滤
- ✨ **渲染器场景接线**（`packages/form-designer/renderer/FormRenderer.tsx`、`packages/form-designer/utils/schemaTree.ts`）：挂载 / 卸载 / 字段变化 / 提交前后 / 校验失败 / 重置逐场景触发，`ctx` 提供 `values`（触发时刻快照）/ `getValues()`（实时）/ `setValue` / `setValues` / `getField` / `emit` / `reload` / `message`，宿主未挂 antd `<App>` 时提示降级到静态 message
- ✨ **设计器事件面板**（`packages/form-designer/designer/FormEventsPanel.tsx`、`packages/form-designer/designer/HookEditor.tsx`、`packages/form-designer/designer/FormDesigner.tsx`、`packages/form-designer/designer/store.ts`）：「表单」页签拆为 表单配置 / 全局事件 / 公共事件 三段，钩子只写函数体、受控渲染、空正文合法（表示「什么都不做」）；保存前与字段名校验并列执行钩子校验（形状 + 语法 + 正文 ≤ 20000 字符），任一不过即中止
- 🛡️ **事件形状与 emit 递归加固**（`packages/form-designer/events/validateEvents.ts`、`packages/form-designer/events/runHooks.ts`、`packages/form-designer/designer/FormEventsPanel.tsx`、`packages/form-designer/renderer/FormRenderer.tsx`）：保存与解析共用同一份 events 校验（消除「保存放行、回读拒绝」）；`ctx.emit` 递归深度上限 5 层、超限截断并按事件名提示一次，错误弹窗按稳定 key 覆盖、`console.error` 按场景 / 事件名去重；清空引用回落空正文并保留 `watch` / `order`，提交取值收回「仅已注册字段」语义
- ✅ **验证（全局配置与事件钩子）**：Vitest 18 文件 243 用例全绿；`eslint packages/form-designer src/pages/index/form` 0 error（两条既有 `react/no-array-index-key` warning 除外）；`tsc --noEmit` 本批次文件 0 条新增；`pnpm docs:build` 通过
- 📝 **文档（全局配置与事件钩子）**：新增 `docs/form-designer/events.md`（场景清单 / `ctx` API / 公共事件复用 / 模型 A 风险与已知限制），`schema.md` 补 schema v2、`events` / `dataSources` 段、解析迁移与形状校验，`designer.md` 补「表单」页签三段与 `HookEditor` 写法，设计规格新增 §12.9

## 2026-09-11

- 📝 **表单设计器文档对齐**（`docs/superpowers/plans/2026-09-07-form-designer.md`、`docs/superpowers/specs/2026-09-07-form-designer-design.md`）：P1–P4 计划的 72 个步骤复选框回填为已完成并补状态说明；规格新增 §12「实现偏差与落地状态」，回写分期完成情况、组件数 36→37、接口形态与表结构偏差、后端技术栈纠正、测试覆盖与遗留项，并在 §6 / §7 / §11 加指向 §12 的说明

## 2026-09-10

- 🔧 **表单设计器画布布局优化**（`Canvas.tsx`、`design.tsx`）：画布改为撑满容器宽度，空态落点撑满整块画布，页面容器高度改为 `100%`
- 🔧 **服务默认端口调整**（`index.ts`）：3001 → 3508
- ✨ **表单设计器 P5：高级组件与子表单**（`advanced.tsx`、`subForm.tsx`、`components/index.ts`）：新增上传 / 金额输入 / 图标选择器与子表单 / 表格子表单 / 分步表单共 6 个组件，左侧面板增加「高级组件」「子表单」两个分组，内置组件达 37 个
- ✨ **渲染器嵌套名路径**（`namePrefix.ts`、`FieldItem.tsx`、`ContainerField.tsx`、`ListField.tsx`、`renderField.tsx`）：子表单提交 `{ 字段名: { 子字段 } }`，表格子表单走 `Form.List` 提交 `[{ 子字段 }]` 并支持行增删；`descriptions` / `tableForm` 的子节点不再重复渲染 label
- ✨ **注册表支持值绑定容器**（`registry.ts`、`helpers.ts`、`RightPanel.tsx`）：`ComponentDef` 新增 `nestObject` / `nestList` / `renderList`，`MenuGroup` 扩展 `advanced` / `subform`，新增 `groupSchema`，属性面板对值绑定容器开放「字段名」配置
- ✨ **表单发布 / 下线**（`list.tsx`）：操作列按 `status` 切换发布态，复用 `updateFormAPI`
- 🔧 **容器删除二次确认**（`useRemoveField.ts`、`CanvasItem.tsx`、`FormDesigner.tsx`）：含子字段的容器删除前弹窗确认，画布删除按钮与 Delete 快捷键共用入口，删除后仍可撤销
- 🐛 **设计页保存失败兜底**（`design.tsx`）：`handleSave` 吞掉 rejection，本地 schema 保留可直接重试，失败提示由 http 拦截器统一弹出
- ✅ **渲染器测试补齐**（`FormRenderer.smoke.test.tsx`、`namePrefix.test.ts`、`nestedValue.test.tsx`、`test/setupDom.ts`）：覆盖全部注册组件默认渲染、嵌套提交结构与数组行增删；新增 devDeps `jsdom`、`@testing-library/react`
- ✅ **设计器交互测试**（`FormDesigner.interaction.test.tsx`）：左栏「高级组件 / 子表单」分组、6 个新组件的画布设计态外壳、值绑定容器与普通容器的属性面板差异、预览弹窗内表格子表单增删行与嵌套提交结构、容器删除二次确认与撤销
- 📝 **文档站新增表单设计器章节**（`docs/form-designer/`、`docs/.vitepress/config.ts`）：总览 / Schema 结构 / 组件清单 / 设计器与渲染器四篇，导航与侧边栏同步挂载
- 📝 **P5 实现计划**（`docs/superpowers/plans/2026-09-10-form-designer-p5.md`）：P5 任务拆解与 P1–P4 遗留项处置
- 📝 **CLAUDE.md 描述纠正**（`CLAUDE.md`）：后端实际为 Express 5 + `node:sqlite`、默认端口 3508，同步真实目录结构与开发约定

## 2026-09-07

- ✨ **新增 form-designer 包**（`packages/form-designer/`）：React + antd 6 自研低代码表单方案，声明式组件注册表，设计器画布与运行时渲染共用同一份 `FormSchema`
- ✨ **设计器骨架与工具栏**（`FormDesigner.tsx`、`Toolbar.tsx`、`store.ts`）：三栏布局、撤销 / 重做（历史栈上限 50）、导入导出 JSON、清空、实时预览、保存，Delete / Ctrl+Z / Ctrl+Shift+Z / Ctrl+D 快捷键
- ✨ **画布拖拽与容器嵌套**（`Canvas.tsx`、`CanvasItem.tsx`、`DropGap.tsx`、`LeftPanel.tsx`）：`@dnd-kit/react` 间隙落点、选中 / 复制 / 删除、组件面板分组搜索、布局容器外壳镜像样式与横向落点
- ✨ **31 个内置组件**（`registry/components/`）：17 个基础输入 + 5 个辅助 + 9 个布局，全部经 `registerComponent` 声明式注册
- ✨ **右侧配置面板**（`RightPanel.tsx`、`ConfigFormRenderer.tsx`、`OptionsEditor.tsx`、`ValidateEditor.tsx`）：属性 / 校验规则 / 全局表单配置三段式，文本类配置连续编辑合并撤销历史（`coalesceKey`）
- ✨ **表单存取闭环**（`service/src/routes/form.ts`、`src/apis/form.ts`、`src/pages/index/form/`）：新增 `za_form` 表与 list / detail / create / update / delete 五个接口，表单管理 / 设计 / 渲染三个演示页打通
- ✅ **Vitest 单测**（`utils/`、`store.test.ts`、`registry.test.ts`、`toAntdRules.test.ts`）：schema 树操作、store mutation 语义、注册表分组、校验规则映射
- 📝 **设计规格与实现计划**（`docs/superpowers/specs/2026-09-07-form-designer-design.md`、`docs/superpowers/plans/2026-09-07-form-designer.md`）

## 2026-08-26

- ✨ **全局快捷键落地**（`useGlobalShortcuts.ts`、`Layout.tsx`、`index.ts`）：Ctrl+K 唤起搜索、Ctrl+I 查看系统信息、Alt 组合键切换/关闭标签页与最大化，复用 `useControlTab` 方法
- ✨ **新增系统信息弹窗**（`SystemInfoModal.tsx`、`topBar.ts`、`locales/`）：展示浏览器/系统/分辨率/视口等信息，搜索弹窗状态收拢至 store 支持全局唤起
- 🔧 **快捷键弹窗布局调整**（`ShortcutsModal.tsx`）：两列展示（左列全局+页面、右列标签栏），移除主导航切换条目
- ✨ **配置面板工具栏拖拽排序**（`ConfigPanel.tsx`）：工具栏卡片底部新增真实样式预览，复用 `@dnd-kit/react` 拖拽调整 `toolbarOrder` 渲染顺序
- 🔧 **工具栏按配置排序渲染**（`Toolbar.tsx`）：右侧功能项按 `toolbarOrder` 顺序渲染，替代原硬编码顺序

## 2026-08-19

- 🔧 **标签栏拖拽库迁移**（`TabBar.tsx`、`useControlTab.ts`、`vite.config.ts`）：`@hello-pangea/dnd` 替换为 `@dnd-kit/react`，改用 `DragDropProvider` + `useSortable`，排序改为插入语义 `moveTab`
- 🔧 **依赖变更**（`package.json`、`pnpm-workspace.yaml`）：移除 `@hello-pangea/dnd`，新增 `@dnd-kit/react`，antd 升级至 ^6.6.1
- 📝 **文档同步更新**（`docs/`、`TechMarquee.vue`）：拖拽排序相关描述改用 `@dnd-kit/react`

## 2026-08-15

- 📝 **文档站同步更新**（`docs/`）：CHANGELOG 补全 07-30~08-14 记录，同步国际化、水印 store、i18n 配置、顶栏定位等新特性文档

## 2026-08-14

- ✨ **新增 locales 包统一国际化文案**（`packages/locales/`）：整合 layout 与示例应用两处文案，全量中英文案统一从 `@zealous-admin/locales` 读取，`App.tsx` 移除外部 messages 注入，补齐 13 个遗漏菜单路径
- ✨ **components 包接入国际化**（`locale/`、4 个组件、11 个 demo）：新增 `ZaConfigProvider` Context 统一注入，主组件与演示页文案全部 `useT` 动态翻译
- 🔧 **配置面板国际化与 i18n 配置迁移**（`ConfigPanel.tsx`、`data.ts`、`config.d.ts`）：选项列表改用 `labelKey` 动态翻译，i18n 配置收拢至 `topBar.toolbar.i18n`
- 🔧 **import 排序与代码格式统一**（`docs/`、`layout`、`components`、`src` 页面）：import/类型分隔符/注释对齐，移除未使用导入，`public/geo` 行尾符统一
- 🔧 **依赖目录与工具微调**（`pnpm-workspace.yaml`、`utils/time`、`dict.tsx`）：catalog 按字母序重排，debounce trailing 简化为 `!leading`，类型编码正则简化为 `\w+`
- 🐛 **修复 antd 组件语言不生效**（`useAntdLocale.ts`、`Layout.tsx`）：嵌套 `ConfigProvider` 未传 locale 重置为英文，新增 hook 统一注入 antd 语言包
- 🐛 **修复切换语言菜单不刷新**（`MainNav.tsx`、`Menu.tsx`、`LayoutProvider.tsx`）：antd Menu 加 `key` 强制重建，子菜单数据兜底刷新
- 🔧 **升级 antd 至 6.6.0**（`pnpm-workspace.yaml`）
- ✨ **新增反馈弹窗**（`FeedbackModal.tsx`、`UserInfo.tsx`、`locales/`）：modern-screenshot 全屏截图预览 + 富文本描述编辑 + 模拟提交，头像菜单新增反馈入口

## 2026-08-13

- ✨ **新增国际化功能**（`store/i18n.ts`、`locales/`、`LayoutProvider.tsx`、`Toolbar.tsx`）：`useI18nStore` 集中管理语言状态并持久化，antd locale 动态懒加载，菜单/标签页/面包屑按语言解析，工具栏语言切换器，layout 内置中英文案替换硬编码
- ✨ **示例应用接入国际化**（`src/locales/`、`App.tsx`）：前端统一维护菜单多语言映射，通过 `messages` prop 注入 `LayoutProvider`

## 2026-08-12

- ✨ **新增快捷键弹窗**（`ShortcutsModal.tsx`、`UserInfo.tsx`）：两列网格展示全局/主导航/标签栏/页面快捷键，样式对齐配置面板（`rootClassName` 全局样式 + 内层 `content` 包裹）

## 2026-08-11

- ✨ **新增个人信息弹窗**（`ProfileModal.tsx`、`UserInfo.tsx`）：个人资料展示 + 修改密码功能，从用户头像菜单「用户信息」触发，弹窗样式对齐配置面板（无内边距、无关闭按钮、body 内滚动）
- 🔧 **修改密码接口规范化**（`admin.ts`）：响应改为标准 `success/failed` 格式，身份改用认证 token 而非信任 body

## 2026-08-09

- 📝 **文档同步更新**（`README.md`、`docs/`）：组件数量更新为 12 个，新增 `ZaSignaturePad` 文档页与侧边栏入口，README 目录/组件表格移除已不存在的 `QrCode` 并补全 `RichTextEditor`、`SignaturePad`

## 2026-08-07

- ✨ **新增富文本编辑器组件**（`RichTextEditor/`、`packages/components`）：基于 Quill 2 的轻量级编辑器，支持受控/非受控、自定义工具栏、只读模式，样式接入 antd 主题变量自动适配明暗模式
- ✨ **新增 Iframe 演示组件**（`IframeDemo.tsx`、`iframe.tsx`）：网址切换 + iframe 嵌入预览，注册 `ZaIframeDemo` 导出
- 🔧 **Demo 边框统一去除**（9 个 `*Demo.tsx`）：移除演示组件外层 wrapper 边框
- ✨ **新增签名板组件**（`SignaturePad/`）：canvas 实现手写签名，支持重签、生成图片、下载图片，接入 antd 主题 token、高 DPI 适配、中点连续法平滑笔迹
- ✨ **新增路由传参示例**（`route-params/`）：演示页面间通过 URL 参数传递数据，A 页面使用 `openTab` 跳转并携带用户信息，B 页面通过 `useSearchParams` 读取参数
- 🔧 **风格实验室页面重构**（`style.tsx`）：布局调整为 wrapper + container 双层结构，卡片改为 2 列布局，移除 Tag 组件，优化间距和字号

## 2026-08-05

- ✨ **动态标题接入配置项**（`Layout.tsx`）：`isEnableDynamicTitle` 开关控制标题是否随路由动态更新，关闭时固定为应用名称
- ✨ **水印配置本地缓存**（`watermark.ts`）：zustand persist 持久化水印配置，跟随存储方式写入 localStorage/sessionStorage
- 🔧 **水印细节调整**（`Layout.tsx`、`watermark.ts`）：颜色跟随主题 `colorTextDisabled`，字号/宽度调整

## 2026-08-04

- 🔧 **主题代码清理**（`hackerTheme.ts`、`index.ts`）：移除过时注释，统一文件末尾分号与换行
- 🔧 **依赖升级**（`pnpm-workspace.yaml`）：antd ^6.4.4 → ^6.5.3，antd-style ^3.6.2 → ^3.6.3
- ✨ **新增水印功能**（`watermark.ts`、`Layout.tsx`、`store/index.ts`）：antd Watermark 按配置包裹布局，文案自动追加当前用户名，颜色跟随主题
- 🔧 **菜单边框条件化**（`Menu.tsx`）：`menuData` 为空时隐藏右边框

## 2026-08-03

- 🔧 **搜索框美化**（`Search.tsx`、`Toolbar.tsx`）：触发器改为小输入框样式（圆角边框 + 搜索图标 + 文字），弹窗输入框圆角化、字号缩小
- 🔧 **配置面板三列布局**（`ConfigPanel.tsx`）：三列展示，底部按钮与提示移至右上角，组件逐个 `size="small"` 缩小
- 🔧 **页面过渡动画精简**（`data.ts`、`config.d.ts`、`reset.css`）：移除滑动/闪动/滚动，保留淡入淡出及四方向，进入慢退出快
- 🔧 **居中布局结构优化与过渡**（`Content.tsx`、`Layout.tsx`）：固定外层容器层级避免配置变化导致页面重挂载，布局宽度切换增加 `max-width` 平滑过渡
- ✨ **居中布局演示页面**（`center-layout/layout-in.tsx`、`layout-out.tsx`）：进入页面自动触发居中布局配置，离开时恢复进入前的配置

## 2026-08-02
- ✨ **顶部定位模式**（`Header.tsx`、`Content.tsx`、`Layout.tsx`）：`topBar.position` 支持 `static`/`fixed`/`sticky` 三种模式，Header 移入 Content 参与整体滚动，fixed 时内容区独立滚动，sticky 时向下滚动收起、向上滚动展开
- 🐛 **KeepAlive 刷新修复**（`Content.tsx`）：缓存页按路径记录刷新版本号，刷新时仅重建当前页缓存节点，普通切换不再影响缓存状态；非缓存页过渡层 key 拼接 `refreshKey` 强制重挂载
- 🔧 **TabBar 宽度模式适配**（`TabBar.tsx`、`defaultSetting.ts`、`config.d.ts`）：支持 `fixed`/`auto`/`auto-min`/`auto-max` 四种宽度模式，`width` 改为数字（默认 150px），标题宽度随标签自适应
- 🔧 **配置面板与交互细节**（`ConfigPanel.tsx`、`Toolbar.tsx`、`data.ts`）：标签宽度 Slider 范围调整、工具栏文字防选中、双击事件"新窗口打开"文案

## 2026-08-01
- 🔧 **TabBar 多风格适配**（`TabBar.tsx`）：支持 `default` / `card` / `block` 三种标签样式，根据 `tabBar.style` 配置动态切换

## 2026-07-30
- 🔧 **TabBar 图标显示配置化**（`TabBar.tsx`）：根据 `tabBar.showIcon` 配置控制图标显示
- 🔧 **TabBar 图标激活态支持**（`useControlTab.ts`、`TabBar.tsx`）：`findIconByPath` 同时返回 `selectIcon`，标签页激活时显示对应图标
- 🔧 **仓库统计排除 AI 辅助文件**（`.gitattributes`）：`.claude/` 目录标记为 `linguist-vendored`，不参与语言统计

## 2026-07-29 

- 🔧 **面包屑导航优化**（`useControlTab.ts`）：根据路径前缀关系自动判断面包屑追加或替换模式
- 🔧 **TabBar 图标动态查找**（`TabBar.tsx`、`useControlTab.ts`）：新增 `findIconByPath` 函数支持根据路径查找菜单图标，提取 `renderTabIcon` 渲染函数
- 📝 **文档站完善**（`docs/`）：新增 utils 工具函数文档（data/env/file/parse/time 五大模块），新增 ZaIframe 组件文档，精简 README 和指南文档，删除冗余 installation 页面

## 2026-07-28

- ✨ **新增 utils 工具包**（`packages/utils/`、`package.json`）：data/env/time/file/parse 五大模块通用工具函数（深拷贝、防抖节流、日期格式化、环境检测、文件处理、身份证解析等），添加独立构建脚本
- ✨ **新增 Iframe 外链嵌入组件**（`Iframe.tsx`、`link/`）：`ZaIframe` 通用 iframe 组件（自动撑满+加载状态），新增 5 个官网嵌入演示页面（antd/react/vue/typescript/vite）
- 🔧 **菜单图标取消必填校验**（`menu.tsx`、`sqlite.db`）：表单 icon 字段改为非必填，新增外链演示菜单种子数据
- ♻️ **代码重构使用utils工具函数**（`useControlTab.ts`、`topBar.ts`、`App.tsx`、`dashboard1/3.tsx`）：替换手写深拷贝/分组/排序逻辑为 `deepClone`/`groupBy`/`sortBy`，dashboard 页面代码格式规范化
- 🔧 **utils包配置优化**（`utils/index.ts`、`utils/package.json`、`utils/parse/index.ts`、`utils/tsconfig.lib.json`）：导出按字母排序、添加 `./index` 导出入口、修复未使用变量、编译目标升级 ES2022

## 2026-07-27

- 🔧 **背景色全站统一**（`login.tsx`、`ui/index.tsx`、`dashboard1/2`、`PatternBg`、8 个 `*Demo.tsx`）：`colorBgLayout` → `colorBgBase` + `colorBorderSecondary` 边框，层次由边框表达
- 🔧 **Demo 布局标准化**（7 个 `*Demo.tsx`）：header 改 `colorBgBase` + `borderBottom`，content 补 flex + gap，css 模板改对象语法
- 🔧 **首页重设计**（`index.tsx`）：BorderBeam 欢迎卡片、功能特性 2×2 卡片、应用场景 4 列卡片，全 token 化
- ✨ **驼峰转换工具**（`camel.ts`）：snake_case → camelCase 键名转换，字典接口全量接入
- 🔧 **字典接口优化**（`dict.ts`）：全量驼峰转换，新增 `/type/all` 路由
- 🔧 **随机风格精简**（`useLayoutSetting.ts`）：注释子菜单折叠/进度条/标签栏等低频随机配置
- 🐛 **字典空状态修复**（`dict.tsx`）：未选类型时清空列表，`listLoading` 初始值修正
- 🔧 **菜单滚动条隐藏**（`Menu.tsx`）：`asideMenuContent` 加 `scrollbar-width: none` + webkit 伪元素隐藏，内容可滚动但不显示滚动条
- 🔧 **彩带庆祝效果重构**（`useFireworks.ts`、`fireworks.tsx`）：分阶段空气阻力物理模型（上升大阻力快速到顶、下落小阻力缓慢飘散）、粒子属性随机化均匀散开，修复内存泄漏和重复动画
- 🔧 **数据库种子数据扩充**（`db/index.ts`）：新增 test 测试用户、演示测试员角色、大屏/导航图标激活/UI 演示菜单，角色菜单双分配
- ✨ **useReLoginStore 导出**（`layout/index.ts`）：重新登录状态 store 对外暴露

## 2026-07-26

- 🔧 **系统管理页面标准化**（`admin.tsx`、`role.tsx`、`menu.tsx`、`dict.tsx`）：Form.useForm + rules 验证、createStyles 主题化、工具栏对齐、Modal 宽度统一 560px
- 🔧 **Dashboard 代码重构**（`dashboard1.tsx`、`dashboard3.tsx`）：提取 shared hooks/data/styles/mapUtils，代码量 791→190、1419→370 行，消除 ~80% 重复
- 🔧 **登录页全面重写**（`login.tsx`）：token 化 border-radius/font-weight/spacing、新增错误反馈 message.error、800ms 导航延迟、aria-label、响应式卡片
- 🔧 **系统管理页面布局精简**（`admin.tsx`、`role.tsx`、`dict.tsx`）：搜索与数据列表合并到单 Card，Flex space-between 布局将添加按钮移至右侧
- 📝 **设计系统文档**（`DESIGN.md`、`PRODUCT.md`、`.impeccable/`）：建立 token-only 规则、三档字重体系、8 主题骨架契约、10 组件 snippet
- 🔧 **Vite 排除 shared 目录**（`vite.config.ts`）：防止 `vite-plugin-pages` 将 shared/ 内文件解析为路由页面
- 🐛 **MCP Accept 头修复**（`mcp.ts`）：nginx 剥离 `text/event-stream` 导致连接失败，新增 `fixMcpHeaders()` 直接注入 `rawHeaders`
- 🔧 **MCP 重连支持**（`mcp.ts`）：`initTransport()` 检测新 initialize 请求自动重建 transport，解决连续 `/mcp` 报 HTTP 400 问题
- 🔧 **MCP 位置固定**（`mcp.ts`）：`get_location` 改为固定返回东京坐标，不再依赖 IP 定位
- 🔧 **MCP 地址改本地**（`.mcp.json`）：线上 TLS 兼容问题暂未解决，切回 `localhost:3508`

## 2026-07-25

- ✨ **Ant Design 全组件展示页**（`src/pages/index/ui/index.tsx`，~1655 行）：覆盖 76 个 antd 6.x 组件，按通用/布局/导航/数据录入/数据展示/反馈/其他 7 类分区，全部颜色接入主题系统
- 🐛 **selectIcon DOM 泄露**（`Menu.tsx`）：`generatorMenuData` 用完后 `delete v[i].selectIcon`，避免残留在 items 中被 AntdMenu 透传到 DOM
- 🔧 **废弃 API 迁移**（`Search.tsx`、`ReLoginModal.tsx`）：`maskClosable` → `mask={{ closable }}`，`destroyOnClose` → `destroyOnHidden`
- 🔧 **插画主题补全**（`illustrationTheme.ts`）：新增 Notification/Layout/Menu/Progress 等 token，补全未定义但需要的空组件 token，修正 deps 数组
- ✨ **MCP StreamableHTTP 服务**（`mcp.ts`、`.mcp.json`）：新增 `get_location` 和 `get_weather` 两个 tool，基于 IP 自动定位 + wttr.in 天气查询，支持 stateful session 管理和请求级日志
- 🔧 **auth 中间件范围限制**（`admin.ts`、`app.ts`）：`router.use(authMiddleware)` → `router.use('/admin', authMiddleware)`，MCP 路由前置避免被 401 拦截

## 2026-07-24

- ✨ **页面 KeepAlive 缓存**（`Content.tsx`、`page.ts`）：双层渲染架构（cachedLayer + transitionLayer），缓存页保持组件状态不丢失，非缓存页保留过渡动画
- ✨ **缓存配置外部化**（`LayoutProvider.tsx`、`App.tsx`）：新增 `cachedPages` prop，由外部决定缓存页面列表，通过 `setCachedPages` 同步到 store
- 🔧 **HTTP/用户/权限基础设施集成至 layout**（`http.ts`、`user.ts`、`useAuth.ts`）：Axios 实例、用户 store、登录登出 Hook 迁入 layout 包，新增 `loginAction`/`logoutAction` 命令式方法
- ✨ **401 过期模式分流与重新登录弹窗**（`http.ts`、`ReLoginModal.tsx`、`reLogin.ts`）：`expireMode=logout` 直接退出，`expireMode=prompt` 弹窗重新输入用户名密码；2s 延时确保用户看到错误提示后再执行
- 🔧 **外部引用收敛**（`Layout.tsx`、`UserInfo.tsx`、7 个页面文件）：api/类型/工具统一从 `@zealous-admin/layout` 导入，UserInfo 移除 props 内部闭环，`Layout` 零参数渲染
- 🗑️ **src/utils/、src/types/、src/store/mall/ 清空**（15 个文件，~672 行）：所有已迁移文件全部删除
- ✨ **多主题类型系统**（`themeMap.ts`、`config.d.ts`、`data.ts`）：新增 `ThemeType` 类型和 `useThemeByType` 映射 Hook，支持 default/mui/bootstrap/glass/illustration/cartoon/shadcn/hacker 八种主题
- ✨ **主题类型选择器与权限控制**（`ConfigPanel.tsx`）：新增主题类型下拉框；非 default 主题时禁用主题色选择和暗色模式切换
- 🔧 **LayoutProvider 主题路由**（`LayoutProvider.tsx`）：default 沿用原逻辑（主题色 + 暗色可切换），其他主题透传固定主题配置
- ✨ **theme 包新增 3 套主题**（`cartoonTheme.ts`、`hackerTheme.ts`、`shadcnTheme.ts`）：卡通漫画风重写为珊瑚红 + 粗描边 + 偏移投影风格，黑客/Shadcn

## 2026-07-23

- 🔧 **大屏图表优化**（`dashboard1.tsx`、`dashboard3.tsx`）：数据刷新间隔 2s→1.5s，板块资金流向/恐慌贪婪指数列宽调整，净流出饼图外环放大
- 🔧 **各股分布饼图重构**（`dashboard3.tsx`）：分类逻辑从按行业分组改为按涨跌幅动态分类（强势/温和上涨、震荡整理、温和/强势下跌），图例移至底部水平布局，饼图尺寸调小
- 🐛 **初始化卡顿与图表显示不全修复**（`dashboard3.tsx`）：合并 `useStyles`/`useTheme` 减少多余渲染，新增 `requestAnimationFrame` 延迟 resize 确保 flex 容器尺寸就绪后再初始化 ECharts
- ✨ **金融可视化大屏 dashboard3**（`dashboard3.tsx`）：整合 dashboard1/2 内容，Three.js 3D 中国地图 GDP 热力图、省份下钻、多指标动态数据模拟、ECharts 趋势/饼图/仪表盘/柱状图/各股分布、三列布局
- ✨ **大屏演示2 3D 中国地图**（`dashboard2.tsx`）：Three.js 实现 Lambert 等角圆锥投影、GDP 热力图配色、省份挤出体立体效果、省级下钻回退、OrbitControls 拖拽旋转/滚轮缩放、悬停 tooltip
- ✨ **新增依赖**（`package.json`、`pnpm-workspace.yaml`）：`echarts ^6.1`、`three ^0.185`、`@types/three`
- 🔧 **菜单种子数据更新**（`sqlite.db`）：demo 模块添加大屏演示路由
- 🐛 **GeoJSON 数据源改为本地静态文件**（`dashboard2.tsx`）：HTTPS 部署时 DataV API 防盗链报 403，改用 `/geo/` 本地文件

## 2026-07-22

- ✨ **菜单图标激活态**（`MenuIcon.tsx`、`MainNav.tsx`、`Menu.tsx`、`TabBar.tsx`）：选中菜单项时自动切换 `activeIcon`，父节点链路级联切换，精确选中项白色高亮
- ✨ **菜单 path 自动计算**（`menu.ts`、`db/index.ts`）：后端 `computePath()` 根据 name 层级自动生成完整 path，修改 name/parentId 时级联更新子孙
- ✨ **首页美化**（`index.tsx`）：顶部加 Logo + Zealous-admin 项目名称，导出 `Logo` 组件
- ✨ **激活图标演示页面**（`menu-active-children.tsx`、`menu-active-parent-test.tsx`）：导航图标激活栏对应路由页面
- 🔧 **导航管理优化**（`menu.tsx`）：新增前端名称列，path 列父节点隐藏，弹窗去 path 输入改为后端自动计算
- 📝 **文档全面更新**（`docs/`）：首页新增激活图标和后端服务特性卡片，补全 `selectIcon` API 文档，更新快速开始、安装、布局模块文档
- 🐛 **MainNav 顶层导航白色文字修复**（`MainNav.tsx`）：`generatorMenuItem` color 改回 `isActive` 链路判断，确保选中子级时顶层导航按钮文字正常变白

## 2026-07-21

- 🗑️ **Mall 模块全面清除**（73 个文件，~15000 行）：删除 `src/pages/index/mall/` 全部页面、26 个 API 文件、21 个类型定义、2 个工具函数、3 个 store 文件
- ✨ **4 个管理系统页面**（`system/admin/role/menu/dict.tsx`）：用户管理、角色管理、导航管理、字典管理完整 CRUD
- ✨ **字典管理**（`dict.tsx`、`apis/dict.ts`、`types/dict.d.ts`）：字典类型 + 字典数据双 Tab 管理
- 🔧 **日期格式化统一**（`lib/date.ts`）：所有 `new Date().toISOString()` → `now()`，格式 `YYYY-MM-DD HH:mm:ss`
- 🔧 **菜单 API 优化**（`menu.ts`）：驼峰映射 `mapMenu`、空 `children` 不返回、路由顺序修复 `/menu/all` 在 `:id` 之前
- 🔧 **角色 API 优化**（`role.ts`）：驼峰映射 `mapRole`、路由顺序修复 `/role/all` 在 `:id` 之前
- 🔧 **za_menu 新增 active_icon 字段**：支持激活态图标，默认 NULL
- 🔧 **导航对齐修复**（`MainNav.tsx`）：弹窗子菜单添加 flex 布局，图标尺寸统一为 19，主菜单图标 22，弹窗位置调整
- 🔧 **侧边菜单图标**（`Menu.tsx`）：图标尺寸从 18 调整为 19
- 🔧 **工具栏布局**（`Toolbar.tsx`）：面包屑 span=16，工具栏 span=8，移动端按钮包装
- 🔧 **头像生成**（`UserInfo.tsx`）：头像 seed 使用用户名，不同用户不同头像
- 🔧 **导航按钮位置**（`system/menu.tsx`）：添加按钮移出 Card title，放入内容区
- 🐛 **演示账号**（`login.tsx`）：账号名修正为 admin/test，与数据库一致
- 📝 **Skill 文档**（`SKILL.md`）：更新分类说明和写入规则
- 🐛 **图标回显修复**（`IconPicker.tsx`）：新增 useEffect 自动加载 value 指定的图标库，修复 useMemo 依赖导致加载后不重新渲染
- 🗑️ **移除添加子级按钮**（`menu.tsx`）：删除操作列中的"添加子级"按钮，添加导航已支持选择上级菜单
- 🔧 **按钮文字调整**（`menu.tsx`）："添加主导航" → "添加导航"

## 2026-07-20

- ✨ **移动端响应式布局**（`Layout.tsx`）：新增移动端专属布局，使用 Drawer 组件实现侧边菜单抽屉
- 📝 **文档更新**（5 个文件）：更新特性描述、新增移动端布局模式文档、添加 `mobileDrawerOpen` 状态说明
- 🔧 **Service 全面重构**（`service/`）：Hono → Express 迁移，MySQL → `node:sqlite`，数据库精简为 7 张核心表，表前缀 `ums_` → `za_`
- 🔧 **依赖集中管理**（`pnpm-workspace.yaml`）：service 依赖统一纳入 workspace catalog，移除 drizzle-orm、drizzle-kit、hono、@hono/node-server
- 🗑️ **删除业务路由**（5 个文件，~2400 行）：移除 brand、category、product、order、marketing 路由模块

## 2026-07-19

- ✨ **AppMessageProvider 组件**（`layout` 包）：新增独立组件统一注入 antd 的 message/modal 实例，在 `LayoutProvider` 中应用扩大影响范围
- 📦 **全局消息工具迁移至 layout 包**：`useAppMessage`、`getGlobalMessage`、`getGlobalModal` 从 `@zealous-admin/layout` 导出
- 🗑️ **删除 AppMessageInit 组件**：移除 `src/components/AppMessageInit.tsx`，用户无需手动初始化
- 🔧 **http.ts 错误处理优化**：错误信息改为 `new Error(res.message)`，移除冗余 console.log

## 2026-07-18

- 🔧 **组件命名统一改为 Za 前缀**（约 40 个文件）：`ZIcon`→`ZaIcon`、`ZIconPicker`→`ZaIconPicker`、`ZLinkPreview`→`ZaLinkPreview`、`ZMarquee`→`ZaMarquee`、`ZPatternBg`→`ZaPatternBg` 等所有组件
- 📝 **文档同步更新**（10 个文件）：README.md、docs/ 下所有组件文档、配置文件
- ✨ **MobileBlock 组件**：新增移动端访问控制，不支持时显示图案背景提示页
- 🗑️ **删除 createMenuIconMap 函数**（`utils/index.ts`）：移除约 38 行的 SVG 图标映射工具函数

## 2026-07-17

- 🗑️ **移除快乐模式和紧凑模式**（`LayoutProvider.tsx`、`Toolbar.tsx`、`ConfigPanel.tsx`、`useLayoutSetting.ts`）：移除 `HappyProvider`、`compactAlgorithm`、下拉菜单项、配置面板开关和随机样式生成，配置项保留
- ✨ **工具栏页面刷新功能**（`page.ts`、`Content.tsx`、`Toolbar.tsx`）：点击刷新图标触发内容区域页面重新渲染初始化，整体页面不刷新

## 2026-07-15

- ✨ **动态网站标题**（`Layout.tsx`）：切换路由时 `document.title` 自动更新为 `菜单名称 - app.name`
- ✨ **菜单图标悬停放大**（`MenuIcon.tsx`）：悬停菜单条目时图标 `scale(1.25)` 过渡放大，移走恢复；新增 `gap` prop 控制右侧间距
- 🔧 **菜单图标间距**（`Menu.tsx`、`MainNav.tsx`）：MenuIcon 传入 `gap={theme.marginSM}` 防止放大后遮盖文本

## 2026-07-14

- ✨ **路由搜索功能**（`Search.tsx`、`Toolbar.tsx`）：工具栏新增搜索按钮；弹窗无标题三区域（搜索框 + 结果列表 + 操作提示），支持标题/URL模糊匹配；↑↓ 切换选中（循环滚动）+ 鼠标悬停切换，Enter/点击跳转，ESC关闭；空状态 SmileOutlined"输入你要搜索的导航"，无结果 FrownOutlined"没有找到你想要的"

## 2026-07-13

- 📝 **README.md 全面更新**：组件 7→9（补充 ZaIcon/ZaMarkdown/ZaPatternBg），技术栈新增图表/图标分类，pnpm 命令 `run` 统一简写，Git 分支 master→main，国际化描述修正
- 📝 **docs/ 文档整理**（6 个文件）：guide/index.md 移除后端引用（Hono/Drizzle/service）；components/index.md 组件 7→9 补全 ZaMarkdown/ZaPatternBg；index.md 首页同步；layout/index.md 新增居中布局特性
- 🐛 **layout-config.md 类型修正**：`ToolBar`→`Toolbar`（与 `TopBarOrder` 定义一致）
- 🐛 **layout-modes.md width 类型修正**：`"1200px"`→`1200`（string→number）

## 2026-07-12

- 🔧 **全局背景色层级统一**（16个文件）：`colorBgContainer` → `colorBgBase`（Layout/Menu/MainNav/TabBar/Toolbar/Footer/Content + 8个Demo页面），增强视觉层次感
- 🔧 **Demo 页面样式规范化**（8个 `*Demo.tsx`）：统一容器/头部背景色，新增 header 分割线，内容区新增 flex 列布局 + gap 间距
- 🔧 **Footer 样式优化**（`Footer.tsx`）：高度 40→50px，新增上分割线，flex 居中，font-weight 加强
- 🔧 **Menu 组件微调**（`Menu.tsx`）：新增右侧分割线，`overflow` 拆分为 `overflowX: hidden; overflowY: auto`，修复重复 `overflow: hidden` 声明
- 🔧 **TabBar 上下布局适配**（`TabBar.tsx`）：容器背景改为 `colorBgContainerDisabled`；根据 `order` 判断 TabBar 位置，动态调整标签圆角方向和右键菜单弹出方向
- 🔧 **defaultSetting 更新**（`defaultSetting.ts`）：GitHub 地址更新为 `Neumann615/zealous-admin`
- ✨ **布局居中显示**（`Layout.tsx`、`Content.tsx`、`ConfigPanel.tsx`）：实现 `layoutScope` outside/inside 两种居中模式 — outside 包裹整个布局容器（含侧边栏+内容区），inside 仅包裹页面内容区；根据 `width` 配置动态调整 `maxWidth`；两侧 `border` + `boxShadow` 分隔视觉层次
- 🐛 **ConfigPanel 居中显示开关修复**（`ConfigPanel.tsx`）："居中显示" Switch 从错误绑定 `isEnableHomePage` 修复为 `layout.isCenter`
- 🐛 **mergeAttribute 数据污染修复**（`utils/index.ts`）：从逐 key 赋值改为 `{ ...obj1, ...obj2 }` spread，缺失 key 保留默认值而非设为 `undefined`，解决随机切换后配置面板值与 store 不一致、面包屑消失等数据错乱
- 🔧 **randomStyle 新增布局配置**（`useLayoutSetting.ts`）：`app.layout`（isCenter / layoutScope / width）纳入随机切换覆盖范围
- 🔧 **外部居中样式微调**（`Layout.tsx`）：背景色 `colorBgLayout` → `colorBgBase`，容器高度 `100vh` → `100%`，移除 `boxShadow`
- 📝 **文档全面更新**（`README.md`、`docs/` 7个文件）：README 重写功能特性（新增居中布局、风格实验室），修正配置示例，React 18→19；stores 文档补全 `app.layout` 和 `usePageStore` API；layout-config 修正 `width` 类型；TechMarquee 更新技术栈列表；GitHub 链接统一为 `Neumann615/zealous-admin`；修复 clone URL 格式

## 2026-07-11

- 🐛 **风格实验室随机数据修复**（`useLayoutSetting.ts`）：修复 `'ToolBar'` → `'Toolbar'` 拼写错误导致 order 值不匹配；扩充 `randomStyle` 覆盖 ConfigPanel 中除 app/色弱模式 外的全部配置项（主题快乐特效、菜单手风琴/折叠、页面进度条、标签栏开关/图标/宽度/双击事件、工具栏面包屑开关/5个功能按钮），解决随机切换后数据对不上的问题

## 2026-07-10

- 🔧 **ConfigPanel 工具栏配置简化**（`ConfigPanel.tsx`）：移除拖拽排序逻辑，保留开关配置，简化为 Row + Switch 形式
- 🔧 **ESLint 规则调整**（`eslint.config.js`）：关闭 `jsx-wrap-multilines` 和 `jsx-curly-brace-presence` 规则
- 🔧 **SliderCaptcha 样式优化**（`SliderCaptcha.tsx`）：新增 `--rcsc-button-bg-color` CSS 变量，移除注释导入
- 🔧 **UserInfo 组件布局兼容**（`UserInfo.tsx`）：根据 `menuType` 区分渲染方式
- ✨ **ConfigPanel 复制配置功能**（`ConfigPanel.tsx`）：点击"复制配置"按钮，将当前配置导出为完整 TypeScript 文件格式并复制到剪贴板

## 2026-07-09

- 🔧 **Header 组件动态渲染**（`Header.tsx`）：根据 `topBarStore.order` 配置动态渲染 TabBar 和 Toolbar，支持自定义顺序
- 🔧 **Toolbar 按钮可配置化**（`Toolbar.tsx`）：全屏、主题切换、页面刷新按钮改为根据 `topBarStore.toolbar` 配置控制显示
- 🐛 **修复拼写错误**（`defaultSetting.ts`、`config.d.ts`）：`ToolBar` → `Toolbar`，保持命名一致性
- 🔧 **哀悼模式数据源迁移**（`LayoutProvider.tsx`）：从 `themeStore.mourningMode` 改为 `appStore.isEnableMourningMode`，合并色弱/哀悼模式的 useEffect
- 🐛 **菜单数据安全处理**（`LayoutProvider.tsx`）：`setMainNavData(menuData)` → `setMainNavData(menuData || [])`，避免空值报错
- 🔧 **上级菜单选择改为树形**（`menu.tsx`）：`Select` → `TreeSelect`，支持层级展示和自动计算 level

## 2026-07-08

- 🔧 **类型定义更新**（`package.json`）：`@types/react` ^18.2.15→^19.2.17，`@types/react-dom` ^18.2.7→^19.2.3
- 🔧 **清理调试日志**（`Layout.tsx`）：注释掉 `menuCurrentKeys`/`openKeys`/`mainNavCurrentKeys` 的 console.log
- 🗑️ **删除旧文件**（`keep-alive.tsx`）：删除 7 行旧版 KeepAlive 演示页面
- 🔧 **TabBar 标签关闭交互优化**（`TabBar.tsx`）：点击关闭按钮区域统一处理，固定标签切换状态，普通标签关闭，添加 `stopPropagation` 防止事件冒泡

## 2026-07-06

- 🐛 **浏览器后退路由同步**（`useControlTab.ts`、`Layout.tsx`）：新增 `syncTabFromUrl` 方法，监听 `popstate` 自动同步 tab 高亮与面包屑；修复同 tab 重复点击不导航的问题
- 🔧 **菜单分配弹窗化**（`allocMenu.tsx`、`role.tsx`）：从路由页面改为 `Modal` 弹窗，修复 antd v5 `Tree.checkedNodes` 废弃 API 报错；保存时向上追溯完整祖先链，避免只勾叶子节点导致 `mainNav` 为空
- 🔧 **操作栏布局优化**（`role.tsx`）：改为单行 flex + `whiteSpace: nowrap` 防止按钮换行，列宽 200→260
- 🔧 **用户信息补全**（`admin.ts`）：`/admin/info` 返回全部字段（email/nickName/note/loginTime 等），仅排除 password
- 🔧 **移除 seed 脚本**（`service/package.json`）：删除 `db:generate`/`db:push`
- 🐛 **datetime 修复**（`menu.ts`、`role.ts`）：`createTime` 改用 `Date` 对象，修复 MySQL strict 模式不兼容
- ✨ **UserInfo 信息完善**（`UserInfo.tsx`、`index.tsx`）：展示真实昵称/邮箱/头像，新增退出登录按钮（清除全部 localStorage 配置后硬刷新跳转）
- 🔧 **全局 message/modal 主题同步**（`LayoutProvider.tsx`、全站 41 个组件 + `http.ts`）：`<App>` 包裹提供上下文，`message.xxx()` → `App.useApp().message`，`Modal.confirm()` → `modal.confirm()`
- 🔧 **退出登录配置清除**（`index.tsx`）：`window.location.replace('/login')` 清除所有 `zealous-admin-` prefix 持久化数据
- 🔧 **userInfo store 扩展**（`user.ts`、`admin.d.ts`）：新增 `nickName` 字段，loginTime/status/email 持久化
- 🐛 **simple 模式手风琴异常**（`Menu.tsx`）：`onOpenChange` 增加 `menuType !== 'simple'` 判断，精简模式下主导航不受手风琴限制
- 📝 **文档更新**（`docs/`）：同步项目最新架构（React 19、Hono、Drizzle ORM），修正端口号 3509，更新 stores 文档字段名，移除已删除的 `vite-config/`/`ts-config/` 目录引用
- 🔧 **默认配置调整**（`defaultSetting.ts`）：主题色 `#1677ff` → `#2f54eb`，暗色模式默认 `'auto'`（跟随系统）
- 🔧 **登录页清理**（`login.tsx`）：移除未使用的 `App` 导入
- ✨ **useMaximize 页面全屏 hook**（`useMaximize.ts`、`maximize-page.tsx`）：导出 `{ isMaximize, enterMaximize, exitMaximize, toggleMaximize }`，demo 页面演示三种操作方式
- 🐛 **全局进度条状态修正**（`Layout.tsx`）：`isAnimating` 从配置开关 `isEnablePageLoadProgress` 改为实际加载状态 `globalProgressLoading`，解决进度条一直不消失的问题
- 📝 **CLM.md**：新增项目级 Claude Code 指引文件，覆盖架构分层、关键模式、常用命令

## 2026-07-05

- ✨ **菜单弹窗化**（`menu.tsx`）：添加/编辑改用 `Modal`+`Form`，集成 `ZaIconPicker`，表格 `ZaIcon` 回显，删除 `addMenu.tsx`(141行) 和 `updateMenu.tsx`(146行)
- ✨ **图标系统重构**：`MenuIcon` 改为 `ZaIcon` 渲染，`size`/`color` 转 `style` 透传，两组件均 `React.memo` 包裹，移除 `menuIconMap`/`createMenuIconMap`/`svgModules`
- ✨ **登录优化**（`login.tsx`）：`message.success` 提示后延时 1.5s 跳转首页
- 🐛 **`convertMenus` 空数组**（`App.tsx`）：`Number()` 包裹 `parentId`/`id`/`hidden`/`sort`，解决字符串 `"0"` 与数字 `0` 的 Map 匹配失败
- 🐛 **路径双重 `/mall` 前缀**（`App.tsx`）：移除硬编码，由 `menu.name` 驱动
- 🐛 **`ZaIcon` 样式不更新**（`Icon.tsx`）：`style` 补入 `useMemo` 依赖数组
- 🐛 **"查看下级"误禁用**（`menu.tsx`）：`level !== 0` → `level >= 2`
- 🔧 **`LayoutProvider` 响应式菜单**：`menuData` 加入 effect 依赖，登录后自动刷新
- 🔧 **启动同步数据**（`App.tsx`）：mount 时有 token 则调用 `getUserInfo()`
- 🔧 **菜单全后端驱动**（`App.tsx`）：移除硬编码演示菜单，全部来自 `/admin/info`
- 🔧 **`ums_menu` 图标初始化**：按 `title` 语义分配 `ai:AiOutline*` 图标

## 2026-07-04

- 🔧 修复 7 个后端路由文件中的 INSERT 操作逻辑
- 🛣️ 重新排序 4 个路由模块中的路由定义
- 🎨 修正 13 个前端组件的导航路径
- 🔄 **面包屑导航重构** - 从基于URL的导航改为基于状态累积的导航，支持精确的菜单高亮
- 🎨 **搜索表单UI统一** - 19个页面的搜索表单统一采用Flexbox布局和Card extra按钮
- 🆕 **商品管理重构** - 新增 `ProductDetail.tsx` 组件，整合添加/编辑商品逻辑
- 🔧 **类型安全增强** - 修正Table多选回调函数签名，移除未使用的路由依赖
- 📍 **菜单/分类导航优化** - 从URL参数改为状态管理，添加"返回上级"功能
- 🔄 **项目重命名**：将项目从 `z-admin` 重命名为 `zealous-admin`，包括包名、路径别名、localStorage key、文档引用等

## 2026-07-03

- ✨ 新增 **service/** 后端服务模块，使用 Hono + Drizzle ORM + MySQL
- 📦 更新 **pnpm-workspace.yaml**，集成后端服务到 Monorepo
- 🔧 调整环境配置，API 地址指向本地开发服务器
- 🌐 前端添加中文语言包支持
- 🛠️ 优化 TypeScript 配置和包管理配置
- 📁 **配置文件迁移**：将 `ts-config/` 和 `vite-config/` 目录下的配置文件移动到对应的 `packages/` 包目录中：
  - `tsconfig.components.lib.json` → `packages/components/tsconfig.lib.json`
  - `tsconfig.layout.lib.json` → `packages/layout/tsconfig.lib.json`
  - `tsconfig.theme.lib.json` → `packages/theme/tsconfig.lib.json`
  - `vite.components.config.ts` → `packages/components/vite.config.ts`
  - `vite.layout.config.ts` → `packages/layout/vite.config.ts`
  - `vite.theme.config.ts` → `packages/theme/vite.config.ts`
- 📦 **更新构建脚本**：修改 `package.json` 中 `build:lib:*` 脚本路径指向新配置位置
- 🗑️ **删除旧目录**：移除 `ts-config/` 和 `vite-config/` 目录
- 🐛 **修复类型错误**：`useLayoutSetting` 的 `updateSetting` 函数参数类型从 `Partial<LayoutConfig>` 改为 `DeepPartial<LayoutConfig>`，解决嵌套对象部分更新时的类型检查问题
- ✨ **新增 PatternBg 组件**：支持 grid/dot 图案、尺寸、动画方向和遮罩方向配置，包含 `PatternBg.tsx` 核心组件和 `PatternBgDemo.tsx` 演示页面

## 2026-07-02

- 🔧 **Header 组件彻底重构**：从 819 行精简至 21 行，仅负责渲染 TabBar 和 Toolbar 的布局结构，移除所有业务逻辑
- ✨ **新增 TabBar 组件**：接管所有标签页相关逻辑（标签渲染、拖拽排序、右键菜单、标签管理），完整集成 `@hello-pangea/dnd` 拖拽功能
- ✨ **新增 Breadcrumb 组件**：独立的面包屑组件，支持 modern/default 两种模式，使用 `clip-path` 实现三角形切角效果
- ✨ **新增 ConfigPanel 组件**：从 Setting 中抽离配置面板内容，供 Setting 和 UserInfo 复用
- 🔧 **Toolbar 组件重构**：集成面包屑渲染，布局改为左右两列（左侧面包屑、右侧工具按钮）
- 🐛 **修复面包屑样式问题**：主题切换时全局视图过渡动画（`::view-transition-old/new(root)` 的 clip-path 动画）覆盖了面包屑的 `clip-path` 切角样式，解决方案包括：
  - 为面包屑容器添加 `isolation: isolate` 和 `viewTransitionName: none`
  - 为面包屑芯片的 `clip-path` 样式添加 `!important` 优先级
- 📱 **UserInfo 组件增强**：点击"偏好设置"时显示 ConfigPanel 配置面板
- 🔧 **ESLint 配置调整**：关闭 `style/eol-last` 和 `react/exhaustive-deps` 规则
- 📝 **README.md 更新**：按照当前 Monorepo 项目结构重新生成文档

## 2026-07-01

- ✨ **新增** **`useLayoutSetting`** **Hook**：封装布局配置的读取、更新与随机风格切换能力，并从 `@zealous-admin/layout` 导出。
- ✨ **新增「风格实验室」页面**（`style.tsx`）：一键随机切换框架的所有视觉风格组合，并接入主菜单路由。
- 🔄 **Markdown 组件库化迁移**：将 `src/components/Markdown` 下的本地实现迁移至 `packages/components/Markdown`，以 `ZaMarkdown` / `ZaMarkdownDemo` 形式从组件库统一导出。
- 🗑️ **清理** **`src/components`** **旧组件**：移除 `Icon`、`PluginsDemo`、`Result` 及 6 个插件演示页面，减少冗余代码。
- 🔧 **Setting 面包屑配置重构**：将独立的「面包屑配置卡片」合并进「工具栏功能配置」区域；同时修复菜单 store 持久化逻辑。
- 🎨 **全局代码风格统一**：文档与源码中的 import 排序、对齐空格、自闭合标签等大规模格式化。
- 🎨 **首页重构**：使用 Ant Design 组件和主题样式重新设计首页，适配亮/暗色模式。
- ✨ **Tailwind CSS 集成**：添加 `tailwind.config.js` 和 `postcss.config.js` 配置，首页实现响应式布局。
- 🎨 **加载动画主题同步**：修改 `index.html`，页面加载时读取 localStorage 主题配置，确保加载遮罩与用户设置的主题一致。
- 🔧 **Vite 打包优化**：修复 pnpm 路径识别问题，统一打包目录结构为 `vendors/包名/包名`。

## 2026-06-30

- ✨ 新增专用的 `Logo` 组件，替代原有的 `Avatar` 方案
- 🎨 重构加载页面，使用新 Logo + 进度条设计
- ⚙️ 调整默认配置：关闭持久化、启用自动深色模式
- 🐛 修复菜单状态管理回调参数问题
- 🖱️ 优化菜单点击事件和交互动画

## 2026-06-29

- 🎨 全项目统一代码格式化（单引号、尾随逗号、import 排序）
- 🔧 ESLint 升级到 v10，采用 `@antfu/eslint-config` 规范
- 📦 核心依赖更新（ahooks、antd、eslint 等）
- 🚀 Vite 构建优化：改进代码分割策略和文件命名
- 🔄 TypeScript 类型定义从 `type` 统一改为 `interface`
- 🗑️ 删除未使用的 `hover.css` 文件

## 2026-06-26

- ✨ 新增 `IconPicker` 图标选择器组件，支持 32+ 个主流图标库（Ant Design、FontAwesome、Material Design 等）
- ✨ 新增 `Icon` 图标渲染组件，支持动态加载和缓存机制
- 📦 添加 `react-icons` 依赖并配置 Vite externals

## 2026-06-25

- ✨ 新增完整的 **UserInfo** 用户信息组件，支持弹出菜单
- 🎨 菜单布局模式从 `side` 切换为 `simple`，优化视觉效果
- 📐 统一调整各组件尺寸（Footer高度、MainNav宽度等）

## 2026-06-24

- ✨ 新增 **ShinyText（流光文字）** 组件及其演示页面
- 📁 重构目录结构：`demo/component` → `demo/components`（复数形式）
- 🗑️ 清理废弃页面：删除 information、abnormal、status 相关页面
- 🎨 优化菜单样式：引入流光文字效果，调整高度和样式

## 2026-06-23

- ✨ 新增 **LinkPreview** 组件：通过 Microlink API 实现链接悬停预览功能
- ✨ 新增 **SliderCaptcha** 组件：支持三种模式的滑块验证码（纯滑块、拼图、触发式拼图）

## 2026-06-23

- ✅ 将 `react-beautiful-dnd` 升级为 `@hello-pangea/dnd`（维护中的 fork）
- 🏗️ 重构菜单初始化逻辑，从页面组件移至应用入口
- 🎨 增强 `SparklesTextDemo` 组件，支持交互式配置
- ⚙️ 新增 `defaultSetting.ts` 配置文件，支持外部传入布局配置

## 2026-06-21

- ✅ 为 layout 和 theme 包添加了 TypeScript 类型声明生成步骤
- 🔄 将相对路径导入改为包名导入（`@zealous-admin/*`）
- 📦 扩展了构建配置中的外部依赖（external）列表
- 🛠️ 新增了专用的 TypeScript 配置文件用于类型生成

## 2026-06-17

### 子包构建优化
- 为 components、layout、theme 创建独立的 Vite 配置文件
- 修复 `preserveModulesRoot` 不生效问题，使用函数方式动态处理输出路径
- 实现相对子包目录的结构输出，避免多余的 `packages/layout/` 前缀

## 2026-06-15

### 图标系统重构
- 新增 `createMenuIconMap` 工具函数，简化外部 SVG 图标导入

## 2026-06-14

### 架构优化
- **创建 AppLayout 组件**：将全局配置提升到路由层面
- **组件职责分离**：
  - `App.tsx`：最精简的路由配置，只保留路由守卫和路由生成
  - `AppLayout.tsx`：包含所有全局配置（StyleProvider、ConfigProvider、HappyProvider、Suspense）
  - `Layout.tsx`：只负责页面布局结构（侧边栏、顶部导航等）
- **主题全局生效**：修复因 Layout 只在首页使用导致其他页面主题配置不生效的问题
- **为独立包做准备**：AppLayout 组件可独立打包，方便在其他项目中复用

## 2026-06-12

### 新增
- 暗色模式支持跟随系统自动切换（亮色/暗色/跟随系统三种模式）
- 系统主题模式监听，自动响应系统深色/浅色模式变化

### 优化
- 配置面板模块统一改写成卡片渲染函数形式，使用 Card 组件包裹
- 自定义 Modal 的 header 和 footer，复制配置按钮移至 footer
- 主题色列表改为三列 grid 布局展示
- 复制配置按钮添加复制图标
- 状态切换添加平滑过渡动画（cubic-bezier 缓动曲线）
- 使用 @ant-design/colors 官方颜色定义主题色列表

### 修复
- 暗色模式分段控制器值类型兼容（支持 "false"、"true"、"auto"）

## 2024-03-10

### 新增
- 强大的 layout 组件，包含主题、布局、工具栏等相关信息
- 字体以及图标的标准解决方案
- 错误日志收集打印功能
- 国际化支持
- 基于 Plop.js 的代码文件自动生成
- 基于文件系统的路由
- 登录页面模板
- Dashboard 首页模板
- 工具栏模块
- 主题编辑器
- 页面过渡动画（多种效果）
- 全局加载进度条
- 状态页面、异常页面模板
- Markdown 预览组件
- 拖拽功能 Demo
- 虚拟列表 Demo

### 优化
- 完善菜单逻辑
- 完善全局加载进度条
- 完善页面过渡动画
- 图标渲染的异常处理判断
- 框架运行时数据本地缓存
- 调整 tab 栏只剩一个时不显示关闭按钮
- tab 栏数量过多时自动调整定位到合适位置
- 调整菜单缩放按钮位置

### 修复
- 修复设置面板修改配置对不上当前页面设置的情况
- 修复菜单手动拖动宽度后缩放不正常的问题
- 修复首次登录首页状态异常的问题


## 2024-03-10
- 整合 Markdown 预览 Demo 及完善组件逻辑

## 2024-02-25
- 整合拖动 Demo 以及虚拟列表 Demo
- 修复首次登录首页状态异常的问题
- 调整菜单缩放按钮位置

## 2024-01-21
- 调整 tab 栏只剩一个时不应该有关闭按钮
- tab 栏数量过多时需要调整定位到合适位置
- 完善登陆页模板
- 完成首页模板

## 2023-12-13
- 修复设置面板修改配置对不上当前页面设置的情况
- 修复菜单手动拖动宽度后缩放不正常的问题
- 优化菜单收缩展开动画

## 2023-11-15
- 框架运行时数据本地缓存

## 2023-11-09
- 完善页面模板里面的状态页面、异常页面模块
- 图标渲染的异常处理判断

## 2023-11-08
- 列举菜单基本页面
- 调整进度条以及全局设置界面样式

## 2023-11-07
- 完善全局加载进度条
- 完善页面过渡动画

## 2023-11-06
- 完善菜单逻辑

## 2023-10-23
- 新增工具栏模块
- 新增主题编辑器

## 2023-10-15
- 对接全局配置

## 2023-10-05
- 封装 layout 组件以及结合状态管理
- 制作登录页面以及 Dashboard 首页
