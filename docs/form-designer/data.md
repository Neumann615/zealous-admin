# 表单版本与数据落库

表单定义使用「稳定表单 + 不可变发布版本」两层模型：`za_form` 保存业务身份与当前生效版本，`za_form_version` 保存草稿、发布历史和字段契约。填写数据仍在 `za_form_data` 中以 JSON 主存，并关联提交时的版本行。

## 生命周期

```text
新建 → v1 草稿 → 发布 → 派生 v2 草稿 → 发布 v2
                         └── 退役 → 恢复
```

- 状态：`0=草稿`、`1=已发布`、`2=已退役`；版本内部另有 `3=已放弃草稿`。
- 已发布版本不可直接修改；进入设计页会派生下一版草稿。
- Schema 保存仅允许草稿行，并携带 `lockVersion` 乐观锁。
- 纯草稿表单可软删除；已发布表单只能退役，已退役表单保留历史数据。
- 已发布且有草稿时，删除动作只放弃草稿。

## 表结构

| 表 | 关键列 | 说明 |
|---|---|---|
| `za_form` | `form_key`、`current_version_id`、`deleted_at` | 稳定身份、当前/最近生效版本指针、软删除标记 |
| `za_form_category` | `parent_id`、`name`、`sort_order`、`status` | 最多两级的表单分类树 |
| `za_form_version` | `schema`、`field_contract`、`status`、`is_current`、`lock_version` | 草稿与发布历史；同一表单最多一个草稿和一个当前版 |
| `za_form_data` | `form_version_id`、`form_version`、`data` | 提交数据关联版本行；旧 `form_version` 继续保留追溯 |

老库启动时会自动补列、生成首个版本行，并把存量填写数据回填到该版本。早期历史版本原本只存版本号、不存 Schema 快照，因此这批 legacy 记录只能关联迁移时的结构；新提交会严格关联真实版本。

## 宽松字段契约

服务端保存 Schema 时只做硬性结构校验：

- 必须是合法 JSON 对象，`children` 必须是数组。
- 节点必须有唯一 `id` 与组件 `type`。
- 绑定字段的字段名必须非空、路径唯一，且不允许 `__proto__` 等危险段。

设计器属性、布局配置、事件、数据源、联动、公式和未来扩展字段原样保留，不做属性白名单。发布前至少要有一个可提交字段；提交时仅兜底校验必填与明显值形态（数字、布尔、对象、数组），未知扩展数据不拦截。自定义 JavaScript 钩子不会在服务端执行。

## 接口

表单定义与生命周期接口位于 `service/src/modules/form/form.routes.ts`，填写数据接口位于 `service/src/modules/form/formData.routes.ts`，均经过登录态与权限标识校验。

| 方法与路径 | 说明 |
|---|---|
| `POST /form/create` | 创建表单与 v1 草稿 |
| `POST /form/update` | 编辑元信息；保存 Schema 仅限草稿并携带 `lockVersion` |
| `POST /form/draft` | 已发布表单派生下一版草稿 |
| `POST /form/publish` | 发布草稿并切换当前生效版本 |
| `POST /form/retire` | 退役当前生效版本，保留历史数据 |
| `POST /form/revive` | 恢复已退役表单 |
| `POST /form/delete` | 纯草稿软删除，或放弃已发布表的草稿 |
| `GET /form/versions` | 查看版本历史 |
| `GET /form/categories/tree` | 查看两级分类树 |
| `POST /form/categories/create` | 新建分类；父级必须启用且不能是二级分类 |
| `POST /form/categories/:id/update` | 编辑分类名称 / 排序 / 层级 |
| `POST /form/categories/:id/status` | 启用 / 停用分类 |
| `POST /form/categories/:id/delete` | 删除无子分类、无表单引用的分类 |
| `POST /form/data/submit` | 仅当前发布版可提交；写入版本关联 |
| `POST /form/render` | 新填写取发布版；按 `dataId` 回显时取提交时版本 |

## 分类与检索

- 表单列表支持按名称 / `formKey` 关键字、状态、分类筛选；选择一级分类时会包含其二级分类下的表单。
- 新建和编辑表单时可选择启用状态的分类；停用分类不会影响已挂载表单，但不能再新挂载。
- 分类最多两级；同级名称唯一，分类不能挂载到自己或自己的子分类下。
- 删除分类前必须确认没有子分类和未软删除表单引用。

## 数据页版本化

- 数据列表支持按版本筛选，默认使用当前发布版；切换版本后动态列按该版本 Schema 生成。
- 详情抽屉通过 `dataId` 走统一渲染接口，每条记录始终按提交时的版本 Schema 回显。
- CSV 导出跟随当前版本与提交人筛选，前端按每页 100 条分页聚合，并对以 `=`、`+`、`-`、`@` 开头的单元格做公式注入防护。

## 已知限制

| 限制 | 说明 |
|---|---|
| 字段级查询 | 数据仍整份 JSON 存储，数据库侧不能直接按字段索引或聚合 |
| Legacy 历史 | 旧系统未保存每版 Schema，迁移前提交只能关联迁移时结构 |
| 文件上传 | `upload` 仍缺少服务端上传与下载闭环，`File` JSON 化后是 `{}` |
| CSV 导出 | 超大数据量仍在浏览器内存聚合，后续可演进为后端流式导出 |
