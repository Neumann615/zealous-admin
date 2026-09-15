# 表单全局配置与事件钩子 实现计划（批次 1–2）

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 把 `@zealous-admin/form-designer` 的 `schema.form` 从「antd Form 透传的 5 个字段」升级为真正的**全局配置命名空间**，并新增**可序列化的表单级 + 命名公共事件钩子**，使业务能在 onCreated / onFieldChange / beforeSubmit / beforeLoadData 等场景挂公共逻辑。

**架构：** 三条主线收敛到一处 —— ① schema 升到 `version: 2`，新增 `events` / `dataSources` 两个可选段，所有解析收口到新增的 `parseSchema()`（含 v1→v2 迁移、未知高版本拒绝）；② 钩子以结构化信封 `{ $type: 'fn', args, body }` 持久化，运行时 `compileFn()` 按 `args+body` 记忆化编译，`runHooks()` 逐条 try/catch；③ 设计器右栏「表单」页签拆为 表单配置 / 全局事件 / 公共事件 三段，保存前编译校验，与字段名校验同一套拦截口径。

**技术栈：** React 19 + antd 6 + zustand + Vitest（jsdom）。批次 1–2 **不新增依赖**。

---

## 参照实现与差异说明

设计参照 `../form-manage.web` 的 form-create Pro 设计器：

- 全局配置 `config/base/form.js` 的 `formCreate_event`，九个场景：`onSubmit` / `onReset` / `onCreated` / `onMounted` / `onBeforeUnmount` / `onReload` / `onChange` / `beforeSubmit` / `beforeFetch`
- 命名公共事件表 `globalEvent = { event_x: { label, handle, deletable } }`，字段级用 `$GLOBAL:事件名` 引用复用（`designer/GlobalEventConfig.vue`、`utils/behavior.js`）
- 钩子编写 = 只写函数体、参数签名由配置声明（`designer/FnEditor.vue`），运行时 `new Function` 现场编译

**该软件为商业授权版**（license 明写「未经授权不得使用、修改或移除版权信息」），本计划**只对齐数据模型与能力，不复制其实现代码**。

两处刻意不同（本计划采纳）：

1. **序列化用结构化信封**，不用 `[[FORM-CREATE-PREFIX-…]]` 字符串前后缀 —— 无正则剥壳、不与用户正文混淆、可结构化校验。
2. **编译结果记忆化** —— 参照实现每次触发都重新 `new Function`，我们按 `args+body` 缓存。

## 已接受的风险（2026-09-15 用户决定采用模型 A）

模型 A 允许**有表单设计权限的人写入任意 JS，并在所有终端用户浏览器中执行**，这是权限提升而不只是 XSS。已确认接受，配套缓解：

- 设计器侧语法校验（编译试跑，失败红字提示且**阻止保存**）
- 运行时逐条 try/catch，单条钩子抛错不拖垮表单
- 钩子只接收**单一 ctx 入参**，API 面文档化（降低误用，但不构成沙箱）

**重新评估的触发条件：** 若「表单设计」权限将来开放给更多角色，或表单定义支持外部导入，需改用具名钩子注册表（模型 B）。

---

## 文件结构

**新增**

| 文件 | 职责 |
|---|---|
| `packages/form-designer/events/fnSource.ts` | 函数信封类型、编译（记忆化）、语法校验 |
| `packages/form-designer/events/types.ts` | 场景枚举、`HookRef`、`FormEventConfig`、`FormHookContext` |
| `packages/form-designer/events/runHooks.ts` | 钩子解析与执行（中断语义、抛错兜底） |
| `packages/form-designer/utils/parseSchema.ts` | 单一解析入口、版本迁移、未知版本拒绝 |
| `packages/form-designer/events/fnSource.test.ts` | 编译/缓存/校验单测 |
| `packages/form-designer/events/runHooks.test.ts` | 执行顺序、中断、抛错兜底单测 |
| `packages/form-designer/utils/parseSchema.test.ts` | 迁移与拒绝单测 |
| `packages/form-designer/renderer/hooks.test.tsx` | 渲染器场景触发集成测试（jsdom） |
| `packages/form-designer/renderer/formProps.ts` | antd Form 透传白名单 |
| `packages/form-designer/designer/HookEditor.tsx` | 单个钩子的函数体编辑器 |
| `packages/form-designer/designer/FormEventsPanel.tsx` | 表单配置 / 全局事件 / 公共事件三段面板 |

**修改**

| 文件 | 改动 |
|---|---|
| `packages/form-designer/types/schema.ts` | `SCHEMA_VERSION`、`FormSchema.version`、`FormGlobalConfig` 扩展、`createEmptySchema` |
| `packages/form-designer/designer/store.ts:181-207` | `importSchema` 改走 `parseSchema` |
| `packages/form-designer/designer/RightPanel.tsx` | 「表单」页签改渲染 `FormEventsPanel` |
| `packages/form-designer/designer/FormDesigner.tsx:69-76` | 保存前追加钩子语法校验 |
| `packages/form-designer/renderer/FormRenderer.tsx` | 接入横切场景 + 白名单 + 新配置项 |
| `src/pages/index/form/design.tsx:24`、`src/pages/index/form/render.tsx:26` | 改用 `parseSchema` |
| 7 个测试文件的 `version: 1` fixture | 机械改为 `version: 2`（共 19 处） |

## 执行分阶段

- **任务 1–2（批次 1）** 结束是**检查点**：schema 结构升级完成、迁移可用、全局配置项补齐，可与批次 2 解耦独立验收。
- **任务 3–7（批次 2）** 依赖批次 1 的 `events` 段与 `parseSchema` 入口。
- **批次 3–4**（数据来源 / 校验扩展 / 字段级 span / 联动 / 文档站三篇）不在本计划内，见文末「后续」。

---

## 任务 1：schema 版本迁移与单一解析入口

**文件：**

- 创建：`packages/form-designer/utils/parseSchema.ts`
- 创建：`packages/form-designer/utils/parseSchema.test.ts`
- 修改：`packages/form-designer/types/schema.ts`
- 修改：`packages/form-designer/designer/store.ts:181-207`
- 修改：`src/pages/index/form/design.tsx:24`、`src/pages/index/form/render.tsx:26`

**背景：** 现在 `JSON.parse(res.data.schema)` 散在 `design.tsx` / `render.tsx` / `data.tsx` / `store.importSchema` 四处，且 `importSchema` 严格拒 `version !== 1`、渲染器完全不看版本。新增 `events` / `dataSources` 段是第一次结构变化，正是把机制建起来的时机。

- [ ] **步骤 1：编写失败的测试**

```ts
// packages/form-designer/utils/parseSchema.test.ts
import { describe, expect, it } from 'vitest'
import { parseSchema } from './parseSchema'

describe('parseSchema', () => {
  it('v1 schema 迁移到当前版本并补齐可选段', () => {
    const v1 = JSON.stringify({
      version: 1,
      form: { layout: 'vertical', labelAlign: 'left' },
      children: [{ id: 'a', type: 'input', field: 'name', props: {} }],
    })
    const schema = parseSchema(v1)
    expect(schema.version).toBe(2)
    expect(schema.form.layout).toBe('vertical')
    expect(schema.children).toHaveLength(1)
  })

  it('当前版本原样通过', () => {
    expect(parseSchema(JSON.stringify({ version: 2, form: {}, children: [] })).version).toBe(2)
  })

  it('缺少 version 视为 v1 迁移', () => {
    expect(parseSchema(JSON.stringify({ form: {}, children: [] })).version).toBe(2)
  })

  it('更高的未知版本抛出可展示的错误', () => {
    const future = JSON.stringify({ version: 99, form: {}, children: [] })
    expect(() => parseSchema(future)).toThrow('不支持的表单版本 v99')
  })

  it('非法 JSON 抛出可展示的错误', () => {
    expect(() => parseSchema('{bad json')).toThrow('表单结构解析失败')
  })

  it('children 非数组时抛错', () => {
    expect(() => parseSchema(JSON.stringify({ version: 2, form: {}, children: {} }))).toThrow('表单结构解析失败')
  })

  it('也接受已解析的对象（后端可能直出对象快照）', () => {
    expect(parseSchema({ version: 1, form: {}, children: [] } as unknown).version).toBe(2)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/utils/parseSchema.test.ts`
预期：FAIL，报错 `Cannot find module './parseSchema'`

- [ ] **步骤 3：改 `types/schema.ts` 的版本常量**

```ts
/** 当前 schema 版本；新增结构段时递增，并在 parseSchema 里补迁移分支 */
export const SCHEMA_VERSION = 2

export type SchemaVersion = typeof SCHEMA_VERSION

export interface FormSchema {
  version: SchemaVersion
  form: FormGlobalConfig
  children: FieldSchema[]
}

export function createEmptySchema(): FormSchema {
  return {
    version: SCHEMA_VERSION,
    form: { layout: 'horizontal', labelAlign: 'right', size: 'middle', colon: true },
    children: [],
  }
}
```

> `events` / `dataSources` 字段分别在任务 4 / 批次 3 加入，本任务不引入，保证可独立通过。

- [ ] **步骤 4：实现 `parseSchema`**

```ts
// packages/form-designer/utils/parseSchema.ts
import type { FormSchema } from '../types/schema'
import { createEmptySchema, SCHEMA_VERSION } from '../types/schema'

/** v1 → v2：纯增量（新增 events / dataSources 可选段），只需抬版本号；
 *  保留该函数作为后续结构变更的挂载点 */
function migrateV1toV2(raw: Record<string, any>): Record<string, any> {
  return { ...raw, version: 2 }
}

const MIGRATIONS: Record<number, (raw: Record<string, any>) => Record<string, any>> = {
  1: migrateV1toV2,
}

/**
 * 单一解析入口：字符串或已解析对象 → 当前版本的 FormSchema。
 * 失败一律抛错，消息面向用户可直接展示。
 */
export function parseSchema(input: string | unknown): FormSchema {
  let raw: any
  try {
    raw = typeof input === 'string' ? JSON.parse(input) : input
  }
  catch {
    throw new Error('表单结构解析失败：不是合法的 JSON')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('表单结构解析失败：应为对象')

  let version = Number(raw.version) || 1
  if (version > SCHEMA_VERSION)
    throw new Error(`不支持的表单版本 v${version}，请升级表单设计器`)
  while (version < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version]
    if (!migrate)
      throw new Error(`表单结构解析失败：缺少 v${version} 的迁移`)
    raw = migrate(raw)
    version = Number(raw.version)
  }

  if (!Array.isArray(raw.children))
    throw new Error('表单结构解析失败：children 应为数组')
  if (raw.form !== undefined && (typeof raw.form !== 'object' || raw.form === null))
    throw new Error('表单结构解析失败：form 应为对象')

  const empty = createEmptySchema()
  return {
    ...empty,
    ...raw,
    form: { ...empty.form, ...raw.form },
    children: raw.children,
    version: SCHEMA_VERSION,
  }
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/utils/parseSchema.test.ts`
预期：PASS（7 条）

- [ ] **步骤 6：把解析调用点收口**

`designer/store.ts` 的 `importSchema` 改为（保持既有次序：先迁移解析 → 过滤脏节点 → 字段名校验）：

```ts
    importSchema: (json) => {
      let parsed: FormSchema
      try {
        parsed = parseSchema(json)
      }
      catch (e: any) {
        return { ok: false, reason: e?.message || 'JSON 格式不正确，未导入' }
      }
      // 过滤缺 id/type 的脏节点（深层递归校验留给后续）；校验只针对真正会装载的节点
      const children = parsed.children.filter(
        (c: any) => typeof c?.id === 'string' && typeof c?.type === 'string',
      )
      const issues = validateSchemaFieldNames({ ...parsed, children })
      if (issues.length) {
        const brief = issues.slice(0, 3).join('；')
        return { ok: false, reason: `字段名校验未通过，未导入：${brief}${issues.length > 3 ? ' 等' : ''}` }
      }
      mutate((draft) => {
        draft.form = parsed.form
        draft.children = children
      })
      set({ selectedId: null })
      return { ok: true }
    },
```

`src/pages/index/form/design.tsx:24` 与 `render.tsx:26` 的 `JSON.parse(res.data.schema)` 改为 `parseSchema(res.data.schema)`，catch 分支沿用现有的「已存 schema 解析失败」提示文案。

- [ ] **步骤 7：批量更新 fixture 版本号**

`packages/form-designer` 下 7 个测试文件共 19 处 `version: 1` → `version: 2`（勿动 `packages/layout/store/topBar.ts`，那是无关的 store 版本字段）。

运行：`node ./node_modules/.bin/vitest.CMD run`
预期：全部 PASS

- [ ] **步骤 8：提交**

```bash
git add packages/form-designer/types/schema.ts packages/form-designer/utils/parseSchema.ts packages/form-designer/utils/parseSchema.test.ts packages/form-designer/designer/store.ts src/pages/index/form/design.tsx src/pages/index/form/render.tsx
git commit -m "feat(form-designer): schema 升到 v2 并收口解析入口"
```

## 任务 2：全局配置项补齐与 antd 透传白名单

**文件：**

- 创建：`packages/form-designer/renderer/formProps.ts`
- 修改：`packages/form-designer/types/schema.ts`
- 修改：`packages/form-designer/renderer/FormRenderer.tsx`
- 修改：`packages/form-designer/designer/RightPanel.tsx:61-120`
- 测试：`packages/form-designer/renderer/FormRenderer.form.test.tsx`

**背景：** 现在 `FormRenderer` 用 `{...schema.form}` 直接展开到 `<Form>`。一旦加入 `labelWidth` / `submitBtn` 这类**非 antd 属性**，React 会把它们当未知属性透传并告警。必须先立白名单。

- [ ] **步骤 1：编写失败的测试**

```tsx
// 追加到 packages/form-designer/renderer/FormRenderer.form.test.tsx
it('全局配置里的非 antd 字段不会透传到 form 元素上', () => {
  const node = pick('input').defaultSchema()
  const schema: FormSchema = {
    version: 2,
    form: { layout: 'vertical', labelWidth: 120, submitBtn: true },
    children: [node],
  }
  const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
  const form = container.querySelector('form')!
  expect(form.hasAttribute('labelwidth')).toBe(false)
  expect(form.hasAttribute('submitbtn')).toBe(false)
})

it('labelWidth 转成标签列宽', () => {
  const node = pick('input').defaultSchema()
  const schema: FormSchema = {
    version: 2,
    form: { layout: 'horizontal', labelWidth: 120 },
    children: [node],
  }
  const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
  const label = container.querySelector('.ant-form-item-label') as HTMLElement
  expect(label.getAttribute('style')).toContain('120px')
})

it('submitBtn 为 false 时不渲染提交按钮', () => {
  const node = pick('input').defaultSchema()
  const schema: FormSchema = {
    version: 2,
    form: { layout: 'vertical', submitBtn: false },
    children: [node],
  }
  const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
  expect(container.querySelector('button[type="submit"]')).toBeNull()
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/renderer/FormRenderer.form.test.tsx`
预期：FAIL —— 透视出 `labelwidth` 属性、标签无 120px、`submitBtn: false` 仍渲染按钮

- [ ] **步骤 3：扩展 `FormGlobalConfig` 并实现白名单**

```ts
// packages/form-designer/types/schema.ts
/** 可透传给 antd Form 的属性（白名单，须与 pickAntdFormProps 保持一致） */
export interface AntdFormPassthrough {
  layout?: 'horizontal' | 'vertical' | 'inline'
  labelAlign?: 'left' | 'right'
  size?: 'large' | 'middle' | 'small'
  colon?: boolean
  disabled?: boolean
}

/** 表单全局配置：antd 透传项 + 设计器自有项 */
export interface FormGlobalConfig extends AntdFormPassthrough {
  /** 标签宽度（px），水平布局下转为 labelCol 列宽 */
  labelWidth?: number
  /** 标签后缀，如「：」 */
  labelSuffix?: string
  /** 隐藏必填星号（true → requiredMark={false}） */
  hideRequiredAsterisk?: boolean
  /** 是否渲染提交按钮；FormRenderer 的 showActions 传 false 时优先级更高 */
  submitBtn?: boolean
  /** 是否渲染重置按钮 */
  resetBtn?: boolean
}
```

```ts
// packages/form-designer/renderer/formProps.ts
import type { FormGlobalConfig } from '../types/schema'

const ANTD_FORM_KEYS = ['layout', 'labelAlign', 'size', 'colon', 'disabled'] as const

/** 只把 antd Form 认识的键透传出去，其余（labelWidth 等）由渲染器自行消费 */
export function pickAntdFormProps(form: FormGlobalConfig) {
  const picked: Record<string, unknown> = {}
  for (const key of ANTD_FORM_KEYS) {
    if (form[key] !== undefined)
      picked[key] = form[key]
  }
  return picked
}
```

- [ ] **步骤 4：`FormRenderer` 消费新配置**

```tsx
  const { labelWidth, labelSuffix, hideRequiredAsterisk, submitBtn, resetBtn, ...passthrough } = schema.form
  const showSubmit = showActions && (submitBtn ?? true)
  const showReset = showActions && (resetBtn ?? false)
```

`<Form>` 传参：

```tsx
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={handleFinish}
      labelCol={labelWidth ? { style: { width: `${labelWidth}px` } } : undefined}
      labelSuffix={labelSuffix}
      requiredMark={hideRequiredAsterisk ? false : undefined}
      {...pickAntdFormProps(passthrough)}
    >
```

按钮区按 `showSubmit` / `showReset` 渲染，两者皆为 false 时整块不渲染。

- [ ] **步骤 5：运行测试验证通过**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/renderer`
预期：PASS

- [ ] **步骤 6：右栏「表单」页签补配置项**

`RightPanel.tsx` 的 `FormConfig` 追加：标签宽度（`InputNumber`，20–300）、标签后缀（`Input`）、隐藏必填星号（`Switch`）、提交按钮 / 重置按钮（`Switch`）。写回沿用既有的 `updateFormConfig`。

- [ ] **步骤 7：提交**

```bash
git add packages/form-designer/types/schema.ts packages/form-designer/renderer packages/form-designer/designer/RightPanel.tsx
git commit -m "feat(form-designer): 全局配置项补齐并隔离 antd 透传白名单"
```

> **检查点：** 批次 1 到此可独立验收。建议先跑 `node ./node_modules/.bin/vitest.CMD run` 与 `node ./node_modules/.bin/eslint.CMD packages/form-designer` 再进批次 2。

## 任务 3：钩子函数信封的编译与校验

**文件：**

- 创建：`packages/form-designer/events/fnSource.ts`
- 创建：`packages/form-designer/events/fnSource.test.ts`

**背景：** 钩子的持久化形态与执行引擎。参考实现把源码包进 PREFIX 字符串，我们改用结构化信封（差异 1）。

- [ ] **步骤 1：编写失败的测试**

```ts
// packages/form-designer/events/fnSource.test.ts
import { describe, expect, it, vi } from 'vitest'
import { compileFn, isFnSource, makeFnSource, validateFnSource } from './fnSource'

describe('isFnSource', () => {
  it('识别合法信封', () => {
    expect(isFnSource({ $type: 'fn', args: ['ctx'], body: 'return 1' })).toBe(true)
  })

  it('拒绝缺字段、类型不符或非对象', () => {
    expect(isFnSource({ $type: 'fn', args: ['ctx'] })).toBe(false)
    expect(isFnSource({ $type: 'fn', args: 'ctx', body: '' })).toBe(false)
    expect(isFnSource({ $type: 'other', args: [], body: '' })).toBe(false)
    expect(isFnSource(null)).toBe(false)
  })
})

describe('validateFnSource', () => {
  it('语法正确返回 null', () => {
    expect(validateFnSource(makeFnSource(['ctx'], 'ctx.message.success("ok")'))).toBeNull()
  })

  it('语法错误返回可展示消息', () => {
    expect(validateFnSource(makeFnSource(['ctx'], 'ctx.'))).toContain('语法错误')
  })

  it('形参名非法返回可展示消息', () => {
    expect(validateFnSource({ $type: 'fn', args: ['1bad'], body: '' })).toContain('参数名不合法')
  })
})

describe('compileFn', () => {
  it('编译后可执行并返回值', () => {
    expect(compileFn(makeFnSource(['a', 'b'], 'return a + b'))(1, 2)).toBe(3)
  })

  it('相同 args+body 命中缓存（返回同一函数引用）', () => {
    const src = makeFnSource(['a'], 'return a * 2')
    expect(compileFn(src)).toBe(compileFn({ ...src }))
  })

  it('不同函数体不复用', () => {
    expect(compileFn(makeFnSource([], 'return 1'))).not.toBe(compileFn(makeFnSource([], 'return 2')))
  })

  it('入参对象可用', () => {
    const spy = vi.fn()
    compileFn(makeFnSource(['ctx'], 'ctx.message.success("hi")'))({ message: { success: spy } })
    expect(spy).toHaveBeenCalledWith('hi')
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/events/fnSource.test.ts`
预期：FAIL，`Cannot find module './fnSource'`

- [ ] **步骤 3：实现 `fnSource.ts`**

```ts
/** 可序列化函数信封：schema 里只存源码，运行时编译 */
export interface FnSource {
  $type: 'fn'
  args: string[]
  body: string
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

export function isFnSource(value: unknown): value is FnSource {
  if (!value || typeof value !== 'object')
    return false
  const v = value as Record<string, unknown>
  return v.$type === 'fn'
    && Array.isArray(v.args)
    && v.args.every(a => typeof a === 'string')
    && typeof v.body === 'string'
}

export function makeFnSource(args: string[], body: string): FnSource {
  return { $type: 'fn', args, body }
}

/** 形参名与语法校验，通过返回 null（保存拦截与内联提示共用） */
export function validateFnSource(src: FnSource): string | null {
  const bad = src.args.find(a => !IDENTIFIER.test(a))
  if (bad)
    return `参数名不合法：${bad}`
  try {
    // eslint-disable-next-line no-new-func -- 模型 A 的既定实现，见计划头部风险说明
    new Function(...src.args, src.body)
    return null
  }
  catch (e: any) {
    return `语法错误：${e?.message || '无法编译'}`
  }
}

const cache = new Map<string, (...args: any[]) => any>()
/** 缓存上限，超出整体清空（表单钩子数量级很小，无需 LRU） */
const CACHE_LIMIT = 500

/** 编译并记忆化（与参照实现的差异 2） */
export function compileFn(src: FnSource): (...args: any[]) => any {
  const key = `${src.args.join(',')}\u0000${src.body}`
  const hit = cache.get(key)
  if (hit)
    return hit
  // eslint-disable-next-line no-new-func -- 模型 A 的既定实现，见计划头部风险说明
  const fn = new Function(...src.args, src.body) as (...args: any[]) => any
  if (cache.size >= CACHE_LIMIT)
    cache.clear()
  cache.set(key, fn)
  return fn
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/events/fnSource.test.ts`
预期：PASS（10 条）

- [ ] **步骤 5：提交**

```bash
git add packages/form-designer/events
git commit -m "feat(form-designer): 钩子函数信封的编译与校验"
```

## 任务 4：钩子场景、上下文与执行器

**文件：**

- 创建：`packages/form-designer/events/types.ts`
- 创建：`packages/form-designer/events/runHooks.ts`
- 创建：`packages/form-designer/events/runHooks.test.ts`
- 修改：`packages/form-designer/types/schema.ts`（引入 `events` 段）
- 修改：`packages/form-designer/utils/parseSchema.ts`（透传 `events`）

**背景：** 场景命名对齐参照实现但做取舍：保留 `onCreated` / `onChange` / `onReload` / `beforeSubmit`，把 `beforeFetch` 更名为 `beforeLoadData`（批次 3 的声明式数据源叫 loadData，避免与「提交时 fetch」混淆），新增 `onSubmitError` / `onValidateFail`。

- [ ] **步骤 1：编写失败的测试**

```ts
// packages/form-designer/events/runHooks.test.ts
import type { FormHookContext } from './types'
import { describe, expect, it, vi } from 'vitest'
import { makeFnSource } from './fnSource'
import { runHooks } from './runHooks'

const message = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }

function ctx(over: Partial<FormHookContext> = {}): FormHookContext {
  return {
    form: {} as any,
    values: {},
    getValues: () => ({}),
    setValue: vi.fn(),
    setValues: vi.fn(),
    getField: () => undefined,
    emit: vi.fn(),
    reload: async () => {},
    message,
    ...over,
  } as FormHookContext
}

describe('runHooks', () => {
  it('按 order 升序执行', async () => {
    const calls: string[] = []
    const refs = [
      { order: 2, fn: makeFnSource(['ctx'], 'globalThis.__trace("b")') },
      { order: 1, fn: makeFnSource(['ctx'], 'globalThis.__trace("a")') },
    ]
    ;(globalThis as any).__trace = (s: string) => calls.push(s)
    await runHooks('onFormCreated', refs, ctx())
    expect(calls).toEqual(['a', 'b'])
  })

  it('所有钩子都能拿到 ctx 上的值快照', async () => {
    const spy = vi.fn()
    await runHooks(
      'onFormCreated',
      [{ fn: makeFnSource(['ctx'], 'globalThis.__trace(ctx.values.x)') }],
      ctx({ values: { x: 7 } }),
    )
    ;(globalThis as any).__trace = spy
    expect(spy).toHaveBeenCalledWith(7)
  })

  it('关键场景返回 false 会中断后续钩子并向上传 false', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    const refs = [
      { fn: makeFnSource(['ctx'], 'return false') },
      { fn: makeFnSource(['ctx'], 'globalThis.__trace("after")') },
    ]
    expect(await runHooks('beforeSubmit', refs, ctx())).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })

  it('非关键场景返回 false 不影响流程', async () => {
    expect(await runHooks('onFormCreated', [{ fn: makeFnSource(['ctx'], 'return false') }], ctx())).toBe(true)
  })

  it('非关键场景钩子抛错：继续执行后续钩子', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    const refs = [
      { fn: makeFnSource(['ctx'], 'throw new Error("boom")') },
      { fn: makeFnSource(['ctx'], 'globalThis.__trace("next")') },
    ]
    expect(await runHooks('onFormCreated', refs, ctx())).toBe(true)
    expect(spy).toHaveBeenCalledWith('next')
  })

  it('关键场景钩子抛错：中断并返回 false', async () => {
    const refs = [{ fn: makeFnSource(['ctx'], 'throw new Error("boom")') }]
    expect(await runHooks('beforeSubmit', refs, ctx())).toBe(false)
  })

  it('按名引用公共事件表', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    const custom = { syncDept: { label: '同步部门', fn: makeFnSource(['ctx'], 'globalThis.__trace("synced")') } }
    await runHooks('onFieldChange', [{ hook: 'syncDept' }], ctx(), custom)
    expect(spy).toHaveBeenCalledWith('synced')
  })

  it('引用不存在的公共事件不抛错', async () => {
    await expect(runHooks('onFieldChange', [{ hook: 'ghost' }], ctx(), {})).resolves.toBe(true)
  })

  it('异步钩子被 await', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    const refs = [{ fn: makeFnSource(['ctx'], 'await Promise.resolve(); globalThis.__trace("done")') }]
    await runHooks('onFormCreated', refs, ctx())
    expect(spy).toHaveBeenCalledWith('done')
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/events/runHooks.test.ts`
预期：FAIL，`Cannot find module './runHooks'`

- [ ] **步骤 3：实现 `types.ts`**

```ts
import type { FormInstance } from 'antd'
import type { FieldSchema } from '../types/schema'
import type { FnSource } from './fnSource'

/** 表单级场景（命名对齐参照实现，beforeFetch 更名为 beforeLoadData） */
export type HookScene
  = | 'onFormCreated'
    | 'onFormMounted'
    | 'onFormUnmount'
    | 'onFieldChange'
    | 'beforeLoadData'
    | 'afterLoadData'
    | 'beforeSubmit'
    | 'onValidateFail'
    | 'afterSubmit'
    | 'onSubmitError'
    | 'onReset'
    | 'onReload'

/** 关键场景：钩子抛错即中断流程（其余场景抛错只跳过该条） */
export const CRITICAL_SCENES: HookScene[] = ['beforeSubmit', 'beforeLoadData']

export interface HookRef {
  /** 引用公共事件表；与 fn 同时存在时 fn 优先 */
  hook?: string
  /** 内联函数体 */
  fn?: FnSource
  /** 仅 onFieldChange 生效：只在这些字段变化时触发；空/未填 = 任意字段 */
  watch?: string[]
  order?: number
}

export interface CustomHookDef {
  label?: string
  fn: FnSource
}

export type FormEventConfig
  = Partial<Record<HookScene, HookRef[]>> & {
    /** 命名公共事件表：写一次、表单级与字段级都可按名引用 */
    custom?: Record<string, CustomHookDef>
  }

/** 钩子执行上下文（单一入参，API 面即文档面） */
export interface FormHookContext {
  /** antd 表单实例 */
  form: FormInstance
  /** 触发时刻的值快照 */
  values: Record<string, any>
  /** onFieldChange 场景：本次变化的字段与值 */
  changed?: { field: string, value: any }
  getValues: () => Record<string, any>
  setValue: (field: string, value: any) => void
  setValues: (patch: Record<string, any>) => void
  /** 按 field 查节点（读 label / props 等） */
  getField: (field: string) => FieldSchema | undefined
  /** 触发一个命名公共事件 */
  emit: (name: string, payload?: any) => void
  /** 重跑数据源（批次 3 接入；未接入时为空实现） */
  reload: (field?: string) => Promise<void>
  message: { success: (s: string) => void, error: (s: string) => void, warning: (s: string) => void, info: (s: string) => void }
}
```

- [ ] **步骤 4：在 `types/schema.ts` 引入 `events` 段并让 `parseSchema` 透传**

```ts
// types/schema.ts
import type { FormEventConfig } from '../events/types'

export interface FormSchema {
  version: SchemaVersion
  form: FormGlobalConfig
  /** 表单级场景钩子与命名公共事件 */
  events?: FormEventConfig
  /** 命名全局数据源（批次 3） */
  dataSources?: Record<string, unknown>
  children: FieldSchema[]
}
```

`utils/parseSchema.ts` 的返回值补 `events: raw.events` 与 `dataSources: raw.dataSources`。

- [ ] **步骤 5：实现 `runHooks.ts`**

```ts
import type { CustomHookDef, FormHookContext, HookRef, HookScene } from './types'
import { compileFn } from './fnSource'
import { CRITICAL_SCENES } from './types'

/** 解析引用：内联 fn 优先，其次按名查公共事件表 */
function resolveFn(ref: HookRef, custom?: Record<string, CustomHookDef>) {
  if (ref.fn)
    return ref.fn
  if (ref.hook)
    return custom?.[ref.hook]?.fn
  return undefined
}

/**
 * 执行某场景下的全部钩子。
 * 返回 false 表示中断：钩子显式 return false，或关键场景下钩子抛错。
 */
export async function runHooks(
  scene: HookScene,
  refs: HookRef[] | undefined,
  ctx: FormHookContext,
  custom?: Record<string, CustomHookDef>,
): Promise<boolean> {
  if (!refs?.length)
    return true
  const critical = CRITICAL_SCENES.includes(scene)
  const ordered = [...refs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  for (const ref of ordered) {
    const src = resolveFn(ref, custom)
    if (!src)
      continue
    try {
      const result = await compileFn(src)(ctx)
      if (result === false && critical)
        return false
    }
    catch (e) {
      console.error(`[form-designer] 钩子执行失败（${scene}）`, e)
      ctx.message.error(`表单钩子执行失败：${scene}`)
      if (critical)
        return false
    }
  }
  return true
}
```

同文件再加一个按名执行公共事件的入口，供 `ctx.emit` 使用（非关键场景，抛错只提示不中断）：

```ts
/** 执行命名公共事件（ctx.emit 的实现） */
export async function emitHook(
  name: string,
  ctx: FormHookContext,
  custom?: Record<string, CustomHookDef>,
): Promise<void> {
  const def = custom?.[name]
  if (!def)
    return
  try {
    await compileFn(def.fn)(ctx)
  }
  catch (e) {
    console.error(`[form-designer] 公共事件执行失败（${name}）`, e)
    ctx.message.error(`公共事件执行失败：${name}`)
  }
}
```

- [ ] **步骤 6：运行测试验证通过**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/events`
预期：PASS（19 条）

- [ ] **步骤 7：提交**

```bash
git add packages/form-designer/events packages/form-designer/types/schema.ts packages/form-designer/utils/parseSchema.ts
git commit -m "feat(form-designer): 钩子场景、上下文与执行器"
```

## 任务 5：渲染器接入场景触发

**文件：**

- 修改：`packages/form-designer/renderer/FormRenderer.tsx`
- 创建：`packages/form-designer/renderer/hooks.test.tsx`
- 修改：`packages/form-designer/utils/schemaTree.ts`（新增 `findNodeByField`）

**背景：** 场景触发点收敛在 `FormRenderer`。**画布（设计态）不执行钩子**；预览弹窗与业务渲染页执行 —— 预览是显式动作，也是联调钩子的唯一手段。

- [ ] **步骤 1：编写失败的测试**

```tsx
// packages/form-designer/renderer/hooks.test.tsx
// @vitest-environment jsdom
/* eslint-disable perfectionist/sort-imports -- dnd-kit 兜底需先于其它 import */
import '../test/setupDom'
import type { FormEventConfig } from '../events/types'
import type { FormSchema } from '../types/schema'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeFnSource } from '../events/fnSource'
import { FormRenderer } from './FormRenderer'
import '../registry/components'

afterEach(cleanup)

/** 钩子通过 globalThis.__trace 回传，避免依赖 ctx 上的测试专用方法 */
function trace() {
  const calls: any[] = []
  ;(globalThis as any).__trace = (v: any) => calls.push(v)
  return calls
}

function schemaWith(events: FormEventConfig): FormSchema {
  return {
    version: 2,
    form: { layout: 'vertical' },
    events,
    children: [{ id: 'a', type: 'input', field: 'name', label: '姓名', props: {} }],
  }
}

describe('FormRenderer 钩子接入', () => {
  it('挂载时依次触发 onFormCreated 与 onFormMounted', async () => {
    const calls = trace()
    render(
      <App>
        <FormRenderer
          schema={schemaWith({
            onFormCreated: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("created")') }],
            onFormMounted: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("mounted")') }],
          })}
          onSubmit={vi.fn()}
        />
      </App>,
    )
    await waitFor(() => expect(calls).toEqual(['created', 'mounted']))
  })

  it('字段变化触发 onFieldChange 并带上字段名', async () => {
    const calls = trace()
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ onFieldChange: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace(ctx.changed.field)') }] })}
          onSubmit={vi.fn()}
        />
      </App>,
    )
    fireEvent.change(container.querySelector('input')!, { target: { value: '张三' } })
    await waitFor(() => expect(calls).toEqual(['name']))
  })

  it('beforeSubmit 返回 false 时不调用 onSubmit', async () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ beforeSubmit: [{ fn: makeFnSource(['ctx'], 'return false') }] })}
          onSubmit={onSubmit}
        />
      </App>,
    )
    fireEvent.click(container.querySelector('button[type="submit"]')!)
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled())
  })

  it('onSubmit 拒绝时触发 onSubmitError', async () => {
    const calls = trace()
    const fail = vi.fn().mockRejectedValue(new Error('boom'))
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ onSubmitError: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("error")') }] })}
          onSubmit={fail}
        />
      </App>,
    )
    fireEvent.click(container.querySelector('button[type="submit"]')!)
    await waitFor(() => expect(calls).toEqual(['error']))
  })

  it('非关键场景钩子抛错不影响提交', async () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ onFormMounted: [{ fn: makeFnSource(['ctx'], 'throw new Error("boom")') }] })}
          onSubmit={onSubmit}
        />
      </App>,
    )
    fireEvent.click(container.querySelector('button[type="submit"]')!)
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })

  it('按名引用公共事件表', async () => {
    const calls = trace()
    render(
      <App>
        <FormRenderer
          schema={schemaWith({
            custom: { ping: { label: '探针', fn: makeFnSource(['ctx'], 'globalThis.__trace("pong")') } },
            onFormMounted: [{ hook: 'ping' }],
          })}
          onSubmit={vi.fn()}
        />
      </App>,
    )
    await waitFor(() => expect(calls).toEqual(['pong']))
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/renderer/hooks.test.tsx`
预期：FAIL —— 场景未实现，`calls` 为空

- [ ] **步骤 3：在 `FormRenderer` 内组装 ctx 并接线场景**

先在 `utils/schemaTree.ts` 增加按字段名查找（`getField` 需要，现有 `findNode` 是按 id 查）：

```ts
/** 按字段名在树中查找节点（容器内字段也可命中） */
export function findNodeByField(children: FieldSchema[], field: string): FieldSchema | null {
  for (const node of children) {
    if (node.field === field)
      return node
    if (node.children) {
      const found = findNodeByField(node.children, field)
      if (found)
        return found
    }
  }
  return null
}
```

再改写 `FormRenderer.tsx`（完整替换既有实现；`renderChild` 与按钮区保留原样，仅按任务 2 的 `showSubmit` / `showReset` 分支）：

```tsx
import type { FormInstance } from 'antd'
import type { FormHookContext, HookRef } from '../events/types'
import type { FieldSchema, FormSchema } from '../types/schema'
import { App, Button, Form, Space } from 'antd'
import { Fragment, useCallback, useEffect, useRef } from 'react'
import { emitHook, runHooks } from '../events/runHooks'
import { findNodeByField } from '../utils/schemaTree'
import { pickAntdFormProps } from './formProps'
import { renderField } from './renderField'

export interface FormRendererProps {
  schema: FormSchema
  initialValues?: Record<string, any>
  onSubmit?: (values: Record<string, any>) => void | Promise<void>
  /** 是否显示提交 / 重置按钮，业务页面可自行接管提交 */
  showActions?: boolean
  /** 外部表单实例，便于业务页提交后 resetFields / setFieldsValue */
  form?: FormInstance
}

export function FormRenderer({ schema, initialValues, onSubmit, showActions = true, form: externalForm }: FormRendererProps) {
  const { message } = App.useApp()
  const [innerForm] = Form.useForm()
  const form = externalForm ?? innerForm
  const { labelWidth, labelSuffix, hideRequiredAsterisk, submitBtn, resetBtn, ...passthrough } = schema.form
  const showSubmit = showActions && (submitBtn ?? true)
  const showReset = showActions && (resetBtn ?? false)

  // 钩子配置经 ref 读取，避免 schema 引用变化时闭包拿到旧事件表
  const eventsRef = useRef(schema.events)
  eventsRef.current = schema.events

  const buildCtx = useCallback((over?: Partial<FormHookContext>): FormHookContext => {
    const current = eventsRef.current
    const base: FormHookContext = {
      form,
      values: form.getFieldsValue(true),
      getValues: () => form.getFieldsValue(true),
      setValue: (field, value) => form.setFieldsValue({ [field]: value }),
      setValues: patch => form.setFieldsValue(patch),
      getField: field => findNodeByField(schema.children, field) ?? undefined,
      emit: (name, payload) => {
        void emitHook(name, buildCtx({ values: { ...base.values, payload } }), current?.custom)
      },
      // 数据源在批次 3 接入；此处保留空实现，钩子里调用不会抛错
      reload: async () => {},
      message,
    }
    return { ...base, ...over }
  }, [form, message, schema.children])

  /** onFieldChange：只触发 watch 命中（或未声明 watch）的引用 */
  const runFieldChange = useCallback((field: string, value: any) => {
    const refs = (eventsRef.current?.onFieldChange || []).filter(
      (ref: HookRef) => !ref.watch?.length || ref.watch.includes(field),
    )
    if (refs.length) {
      void runHooks('onFieldChange', refs, buildCtx({ changed: { field, value } }), eventsRef.current?.custom)
    }
  }, [buildCtx])

  useEffect(() => {
    void runHooks('onFormCreated', eventsRef.current?.onFormCreated, buildCtx(), eventsRef.current?.custom)
      .then(() => runHooks('onFormMounted', eventsRef.current?.onFormMounted, buildCtx(), eventsRef.current?.custom))
    return () => {
      void runHooks('onFormUnmount', eventsRef.current?.onFormUnmount, buildCtx(), eventsRef.current?.custom)
    }
  }, [buildCtx])

  /** 提交链路：beforeSubmit 可改值/可 return false 中断 → onSubmit → afterSubmit / onSubmitError */
  const handleFinish = async (values: Record<string, any>) => {
    const custom = eventsRef.current?.custom
    if (!await runHooks('beforeSubmit', eventsRef.current?.beforeSubmit, buildCtx({ values }), custom))
      return
    try {
      await onSubmit?.(values)
      await runHooks('afterSubmit', eventsRef.current?.afterSubmit, buildCtx({ values }), custom)
    }
    catch (e) {
      await runHooks('onSubmitError', eventsRef.current?.onSubmitError, buildCtx({ values }), custom)
      // 继续抛出：失败提示仍由 http 拦截器统一弹出，此处不重复弹窗
      throw e
    }
  }

  const handleReset = () => {
    form.resetFields()
    void runHooks('onReset', eventsRef.current?.onReset, buildCtx(), eventsRef.current?.custom)
  }

  const renderChild = (child: FieldSchema, parentType?: string): React.ReactNode => (
    <Fragment key={child.id}>{renderField(child, renderChild, parentType)}</Fragment>
  )

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={handleFinish}
      onFinishFailed={() => {
        void runHooks('onValidateFail', eventsRef.current?.onValidateFail, buildCtx(), eventsRef.current?.custom)
      }}
      onValuesChange={(_changed, all) => {
        Object.entries(_changed).forEach(([field, value]) => runFieldChange(field, value))
        // 同步一次快照，供 onValuesChange 之后的钩子读到最新值
        void all
      }}
      labelCol={labelWidth ? { style: { width: `${labelWidth}px` } } : undefined}
      labelSuffix={labelSuffix}
      requiredMark={hideRequiredAsterisk ? false : undefined}
      {...pickAntdFormProps(passthrough)}
    >
      {schema.children.map(c => renderChild(c))}
      {(showSubmit || showReset) && (
        <Form.Item wrapperCol={schema.form.layout === 'horizontal' ? { offset: 4 } : undefined}>
          <Space>
            {showSubmit && <Button type="primary" htmlType="submit">提交</Button>}
            {showReset && <Button onClick={handleReset}>重置</Button>}
          </Space>
        </Form.Item>
      )}
    </Form>
  )
}
```

> `onValuesChange` 里不要再用第二个参数（`allValues`）回灌 state：`buildCtx()` 每次都从 `form.getFieldsValue(true)` 现取，避免多一份可能与表单不同步的副本。上面留 `void all` 仅为显式标注该参数未使用（实现时可直接省略形参）。

- [ ] **步骤 4：运行测试验证通过**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/renderer`
预期：PASS

- [ ] **步骤 5：提交**

```bash
git add packages/form-designer/renderer
git commit -m "feat(form-designer): 渲染器接入表单钩子场景"
```

## 任务 6：设计器全局事件与公共事件编辑

**文件：**

- 创建：`packages/form-designer/designer/HookEditor.tsx`
- 创建：`packages/form-designer/designer/FormEventsPanel.tsx`
- 修改：`packages/form-designer/designer/RightPanel.tsx`
- 修改：`packages/form-designer/designer/FormDesigner.tsx:69-76`
- 修改：`packages/form-designer/designer/store.ts`
- 测试：`packages/form-designer/designer/FormDesigner.interaction.test.tsx`

**背景：** 编辑器先用 monospace `Input.TextArea`（与既有 `json` 配置项一致），校验走 `validateFnSource`；CodeMirror 升级见「后续」。

- [ ] **步骤 1：编写失败的测试**

```tsx
// 追加到 FormDesigner.interaction.test.tsx 末尾
it('全局事件里写入语法错误的钩子时保存被拦截', async () => {
  const onSave = vi.fn()
  renderDesigner(schemaOf(['input']), onSave)
  act(() => {
    useDesignerStore.getState().updateEvents({
      onFormCreated: [{ fn: { $type: 'fn', args: ['ctx'], body: 'ctx.' } }],
    })
  })
  clickSave()
  expect(onSave).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.getByText(/语法错误/)).toBeTruthy())
})

it('表单页签可新增命名公共事件', () => {
  renderDesigner(createEmptySchema())
  fireEvent.click(screen.getByRole('tab', { name: /表\s*单/ }))
  fireEvent.click(screen.getByRole('button', { name: /新增公共事件/ }))
  const custom = useDesignerStore.getState().schema.events?.custom
  expect(custom).toBeTruthy()
  expect(Object.keys(custom!).length).toBe(1)
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/designer/FormDesigner.interaction.test.tsx`
预期：FAIL —— `updateEvents is not a function`，找不到「新增公共事件」按钮

- [ ] **步骤 3：store 增加事件写入接口**

```ts
    updateEvents: (patch: Partial<FormEventConfig>) => mutate((draft) => {
      draft.events = { ...(draft.events || {}), ...patch }
    }, true),
    updateCustomHooks: (custom: Record<string, CustomHookDef>) => mutate((draft) => {
      draft.events = { ...(draft.events || {}), custom }
    }, true),
```

- [ ] **步骤 4：实现 `HookEditor` 与 `FormEventsPanel`**

```tsx
// HookEditor.tsx
import type { FnSource } from '../events/fnSource'
import { Input } from 'antd'
import { useState } from 'react'
import { validateFnSource } from '../events/fnSource'

/** 钩子可用形参：模型 A 下由配置声明，运行时按声明顺序注入 */
export const HOOK_ARGS = ['ctx']

export function HookEditor({ value, onChange }: { value?: FnSource, onChange: (v?: FnSource) => void }) {
  const [text, setText] = useState(value?.body ?? '')
  const error = value ? validateFnSource(value) : null
  return (
    <div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
        {`可用参数：${HOOK_ARGS.join(' / ')}`}
      </div>
      <Input.TextArea
        rows={4}
        value={text}
        style={{ fontFamily: 'monospace', fontSize: 12 }}
        onChange={(e) => {
          setText(e.target.value)
          onChange(e.target.value.trim() ? { $type: 'fn', args: HOOK_ARGS, body: e.target.value } : undefined)
        }}
      />
      {error && <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>{error}</div>}
    </div>
  )
}
```

`FormEventsPanel.tsx` 是纯布局组合（`HookEditor` 已在上方完整给出，其余只是 antd `Select` / `Input` / `Button` 的常规用法，按以下结构直接实现即可）：

- 「表单配置」段：复用任务 2 的既有配置项
- 「全局事件」段：按场景清单（场景名 + 中文说明 + 入参提示）逐场景渲染；每场景一个「添加钩子」按钮与已添加列表（`HookEditor` + 引用公共事件的下拉 + 上移 / 删除）
- 「公共事件」段：命名表，每项 `label` + `HookEditor` + 删除；「新增公共事件」按钮生成 `event_${n}` 键名

`RightPanel.tsx` 的「表单」页签改为渲染 `FormEventsPanel`（两个页签结构不变）。

- [ ] **步骤 5：保存前拦截**

`FormDesigner.tsx` 的 `handleSave` 在字段名校验之后追加：

```ts
    const hookIssues: string[] = []
    for (const [scene, refs] of Object.entries(schema.events || {})) {
      if (scene === 'custom')
        continue
      for (const ref of (refs as HookRef[]) || []) {
        if (ref.fn && !ref.hook) {
          const issue = validateFnSource(ref.fn)
          if (issue)
            hookIssues.push(`${scene}：${issue}`)
        }
      }
    }
    for (const [name, def] of Object.entries(schema.events?.custom || {})) {
      const issue = validateFnSource(def.fn)
      if (issue)
        hookIssues.push(`公共事件 ${name}：${issue}`)
    }
    if (issues.length || hookIssues.length) {
      message.error([...issues, ...hookIssues].join('；'))
      return
    }
```

- [ ] **步骤 6：运行测试验证通过**

运行：`node ./node_modules/.bin/vitest.CMD run packages/form-designer/designer`
预期：PASS

- [ ] **步骤 7：提交**

```bash
git add packages/form-designer/designer
git commit -m "feat(form-designer): 全局事件与公共事件编辑面板"
```

## 任务 7：文档与变更日志

**文件：**

- 创建：`docs/form-designer/events.md`
- 修改：`docs/form-designer/schema.md`、`docs/form-designer/designer.md`
- 修改：`docs/.vitepress/config.ts`（sidebar 加「事件钩子」）
- 修改：`docs/superpowers/specs/2026-09-07-form-designer-design.md`（新增 §12.9）
- 修改：`CHANGELOG.md`、`docs/CHANGELOG.md`（`## 2026-09-15` 追加条目）

- [ ] **步骤 1：写文档**（`events.md` 需含完整场景表、`ctx` API 表、公共事件复用写法、模型 A 的风险与重新评估条件）

- [ ] **步骤 2：验证文档站构建**

运行：`pnpm docs:build`
预期：`✓ building client + server bundles` / `✓ rendering pages`

- [ ] **步骤 3：全量验证**

运行：`node ./node_modules/.bin/vitest.CMD run`、`node ./node_modules/.bin/eslint.CMD packages/form-designer src/pages/index/form`
预期：测试全绿；lint 0 error（`OptionsEditor` / `ValidateEditor` 两条既有 warning 除外）

- [ ] **步骤 4：提交**

```bash
git add docs CHANGELOG.md
git commit -m "docs(form-designer): 全局配置与事件钩子文档"
```

---

## 后续（不在本计划内）

**批次 3：渲染项配置补齐**（需另出计划）

- 数据来源：`field.dataSource = { type: 'static' | 'dict' | 'api', ... }`；`api` 引用宿主注册名（`registerFormDataApis({ 'common.getOrgTree': params => ... })`），走统一 `http` 实例保证鉴权与错误处理一致；`{{字段}}` 插值 + 依赖字段变化重跑 + `AbortController` 取消 + 后写胜（优于参照实现的裸 XHR，其无取消无竞态防护）
- 校验扩展：`ValidateRule` 补 `min/max/len/minLen/maxLen/phone/ip/integer/uppercase/lowercase`、`trigger: 'blur' | 'change' | 'submit'`、具名 `validator`（引用公共事件表）、条件必填
- 字段级 `col.span`（已确认引入）：`field.col = { span, xs?, sm?, md?, lg?, xl? }`，渲染时自动包 `<Col>`（现在必须拖 `row` + `col` 容器）；画布外壳样式复用 `canvasShellStyle` 的 span 换算
- 联动：`field.control = [{ value, condition, target, method: 'hidden' | 'display' | 'required' | 'disabled' }]`

**批次 4：增强与收尾**

- `HookEditor` 升级为 CodeMirror 6（JS 语法高亮 + `ctx` API 补全 + lint）；`@codemirror/state`、`view`、`language`、`lint`、`autocomplete` 目前只是 `@codemirror/lang-javascript` 的传递依赖，需显式加入 `package.json` 与 catalog
- 字段级钩子（`field.hooks`）与按名引用公共事件的字段级入口
- 预览弹窗增加「执行钩子」开关（当前设计为预览默认执行，便于联调；若担心误触发真实接口再补开关）
- 依赖 §12.3 的 `GET /form/:id/schema` 免鉴权消费方（发布态渲染）
