# 数据落库与查询

设计器产出的表单最终要收数据。填写值统一走 `za_form_data` 单表：**整份 values 以 JSON 存储**，只把查询与追溯所需的字段抽成冗余列。这样表结构不随表单变化，同时还能按表单、提交人、状态检索。

## 表结构

| 列 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 自增主键 |
| `form_id` | INTEGER | 所属表单，建了 `(form_id, id)` 索引 |
| `form_version` | INTEGER | 提交时的 `za_form.version`，用于追溯当时的表单结构 |
| `submitter` | TEXT | 提交人用户名，取自 JWT（`req.username`） |
| `status` | INTEGER | `1` 有效 / `0` 已作废（作废是软删） |
| `data` | TEXT | 整份填写值的 JSON 字符串 |
| `create_time` | TEXT | `YYYY-MM-DD HH:mm:ss`，走 `lib/date.ts` 的 `now()` |

DDL 在 `service/src/db/index.ts` 的 `initDb()` 里，`CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`，老库启动即自动补齐，不需要手工迁移。`POST /form/delete` 删表单时会级联清掉该表单的全部填写数据。

## 接口

全部在 `service/src/routes/formData.ts`，与表单接口一样只过 `authMiddleware`（没有角色级权限）。

| 方法与路径 | 入参 | 返回 |
|------|------|------|
| `POST /form/data/submit` | `{ formId, data }` | `{ id }` |
| `GET /form/data/list` | `formId`、`pageNum`、`pageSize`、`submitter?`、`status?` | `{ list, total, pageSize, pageNum }` |
| `GET /form/data/detail` | `id` | 单条记录 |
| `POST /form/data/updateStatus` | `{ id, status }` | `null` |
| `POST /form/data/delete` | `{ id }` | `null` |

几条约定：

- `data` 必须是非数组对象，否则返回「提交数据格式不正确」；`formId` 查不到表单返回「表单不存在」。
- 提交不校验发布态，草稿也能收数据，方便设计期联调。
- `list` 按 `id DESC` 排序，`data` 以字符串下发，前端自行 `JSON.parse`（和 `schema` 的处理方式一致）。
- `GET /form/list` 会额外带出 `dataCount`（相关子查询统计已收集条数）。

## 前端

`src/apis/form.ts` 对应 `submitFormDataAPI`、`getFormDataListAPI`、`getFormDataDetailAPI`、`updateFormDataStatusAPI`、`deleteFormDataAPI`，记录类型是 `FormDataRecord`。

### 提交

渲染页把 `FormRenderer` 的表单实例交给外部持有，提交成功后就能自己清空表单：

```tsx
const [form] = Form.useForm()

const handleSubmit = async (values: Record<string, any>) => {
  const res = await submitFormDataAPI({ formId: id, data: values })
  message.success(`提交成功，数据编号 #${res.data.id}`)
  form.resetFields()
}

<FormRenderer form={form} schema={schema} onSubmit={handleSubmit} />
```

### 查看与管理

`/form/data?id=表单id`（`src/pages/index/form/data.tsx`）是数据管理页，从表单管理列表的「数据」按钮进入：

- **动态列**：读表单 `schema`，取顶层带 `field` 的节点当列、`label` 作表头；容器（子表单 / 嵌套对象）的值整体按 JSON 展示，超长截断 + Tooltip。
- **兜底**：schema 缺失或解析失败时退化为单列「原始数据」。
- **详情抽屉**：用 `FormRenderer` 只读回显——把 `schema.form.disabled` 置真并传 `initialValues`，嵌套结构也能原样展示。
- **作废 / 恢复**与**删除**（二次确认）。
- **导出 CSV**：前端拼全量数据并带 BOM，Excel 打开中文不乱码。

## 已知限制

| 限制 | 说明 |
|------|------|
| 不按字段拆列 | JSON 存储换来零迁移成本，代价是数据库侧无法按字段建索引与聚合，需要统计时得在应用层展开 |
| 无版本迁移 | `form_version` 只做记录，老数据不会随新 schema 补字段；结构变更后旧记录可能缺 key |
| 无角色权限 | 与表单接口一致，只校验登录态 |
| `upload` 值仍会丢 | 上传组件提交的是 `File`，`JSON.stringify` 后为 `{}`，要先补上传接口，见[设计器与渲染器的已知限制](./designer.md#已知限制) |
| 导出上限 | CSV 一次拉 9999 条，更大数据量需要改成后端流式导出 |
