import type { FormInstance } from 'antd'
import type { FieldPermission, FieldSchema, FormSchema } from '../types/schema'
import { Alert, App, Button, Flex, Form, Spin, message as staticMessage } from 'antd'
import { createStyles } from 'antd-style'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { filterRefsForField, runHooks } from '../events/runHooks'
import { getComponent } from '../registry/registry'
import { nodeBindsField, opensNameScope } from '../utils/fieldName'
import { parseSchema } from '../utils/parseSchema'
import { getByPathName } from '../utils/path'
import { getFormDataApi } from './dataApis'
import { buildFormProps } from './formProps'
import { createFormulaRowScope, evalFormula, getFormulaReferences } from './formula'
import { FormHooksProvider } from './hooksContext'
import { renderField } from './renderField'
import { useFormRuntime } from './useFormRuntime'

const useStyles = createStyles(({ css, token }) => ({
  actions: css`
    position: sticky;
    bottom: 0;
    z-index: 1;
    margin-top: ${token.marginLG}px;
    margin-bottom: 0;
    padding: ${token.marginSM}px 0;
    background: ${token.colorBgContainer};
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
}))

interface ComputedField {
  expression: string
  /** 普通字段的绝对输出路径 */
  namePath?: string[]
  /** 表格行内字段：数组绝对路径 + 当前行内的相对路径 */
  row?: {
    listPath: string[]
    childPath: string[]
  }
}

function collectComputedFields(
  children: FieldSchema[],
  context: { path: string[], row?: { listPath: string[], childPath: string[] } } = { path: [] },
  out: ComputedField[] = [],
): ComputedField[] {
  for (const node of children) {
    const path = node.field ? [...context.path, node.field] : context.path
    const childPath = node.field && context.row ? [...context.row.childPath, node.field] : context.row?.childPath
    if (node.computed?.expression && nodeBindsField(node)) {
      if (context.row && childPath?.length)
        out.push({ expression: node.computed.expression, row: { listPath: context.row.listPath, childPath } })
      else if (path.length)
        out.push({ expression: node.computed.expression, namePath: path })
    }
    if (node.children?.length)
      collectComputedFields(node.children, childContextOf(node, context, path, childPath), out)
  }
  return out
}

function childContextOf(
  node: FieldSchema,
  context: { path: string[], row?: { listPath: string[], childPath: string[] } },
  path: string[],
  childPath?: string[],
) {
  if (node.field && getComponent(node.type)?.nestList)
    return { path, row: { listPath: path, childPath: [] } }
  if (opensNameScope(node) && context.row && childPath)
    return { path, row: { listPath: context.row.listPath, childPath } }
  return context
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** antd 首次装载 initialValues 前，公式也需要能算：store 已有值优先，缺失处回落 initial 值 */
function mergeInitialValues(values: Record<string, any>, initialValues: Record<string, any>): Record<string, any> {
  const walk = (current: unknown, initial: unknown): any => {
    if (Array.isArray(current) && Array.isArray(initial))
      return current.map((item, index) => walk(item, initial[index]))
    if (isRecord(current) && isRecord(initial)) {
      const merged: Record<string, any> = { ...current }
      for (const [key, initialValue] of Object.entries(initial)) {
        merged[key] = key in current ? walk(current[key], initialValue) : initialValue
      }
      return merged
    }
    return current
  }
  return walk(values, initialValues)
}

/**
 * 公式可以引用公式字段。按引用关系排序后，同一轮就能得到确定的链式结果；
 * 循环引用保留原有顺序，执行时引用缺失会走统一的运行时降级。
 */
function orderComputedFields(fields: ComputedField[]): ComputedField[] {
  const byName = new Map(fields.filter(item => item.namePath).map(item => [item.namePath!.join('.'), item]))
  const rowGroups = new Map<string, Map<string, ComputedField>>()
  for (const item of fields.filter(item => item.row)) {
    const groupKey = item.row!.listPath.join('.')
    const group = rowGroups.get(groupKey) ?? new Map<string, ComputedField>()
    group.set(item.row!.childPath.join('.'), item)
    rowGroups.set(groupKey, group)
  }
  const dependencyOf = (item: ComputedField, reference: string) => {
    if (item.row)
      return rowGroups.get(item.row.listPath.join('.'))?.get(reference)
    for (const [listPath, group] of rowGroups.entries()) {
      const prefix = listPath ? `${listPath}.` : ''
      if (!reference.startsWith(prefix))
        continue
      const childPath = reference.slice(prefix.length).replace(/^\d+\./, '')
      const target = group.get(childPath)
      if (target)
        return target
    }
    return byName.get(reference)
  }
  const visited = new Set<ComputedField>()
  const visiting = new Set<ComputedField>()
  const ordered: ComputedField[] = []

  const visit = (item: ComputedField) => {
    if (visited.has(item))
      return
    if (visiting.has(item))
      return
    visiting.add(item)
    for (const reference of getFormulaReferences(item.expression)) {
      const target = dependencyOf(item, reference)
      if (target)
        visit(target)
    }
    visiting.delete(item)
    visited.add(item)
    ordered.push(item)
  }

  fields.forEach(visit)
  return ordered
}

export interface FormRendererProps {
  /** 通道①：调用方已有 FormSchema，直接传入（零网络请求） */
  schema?: FormSchema

  /** 通道②：传表单 ID，渲染器通过宿主注册的 `__render` API 自动加载 */
  formId?: number

  /** 通道③：FormSchema JSON 字符串直传（调试 / 降级路径） */
  schemaJson?: string

  initialValues?: Record<string, any>
  /** 整体只读（叠加在权限 editable: false 之上） */
  readonly?: boolean
  onSubmit?: (values: Record<string, any>) => void | Promise<void>
  /** 是否显示提交/重置按钮，业务页面可自行接管提交 */
  showActions?: boolean
  /** 外部表单实例，便于业务页提交后 resetFields / setFieldsValue */
  form?: FormInstance
}

/** 三通道收敛后的就绪状态 */
interface ResolvedSchema {
  schema: FormSchema
  data?: Record<string, any>
}

/**
 * 把后端 permissions 就地应用到 schema 树（调用方已 deep clone）：
 * visible:false → hidden；editable:false → disabled；required:true → required
 */
function applyPermissions(
  children: FieldSchema[],
  permissions: Record<string, FieldPermission> | undefined,
  prefixes: string[][] = [[]],
): void {
  if (!permissions)
    return
  for (const node of children) {
    const paths = prefixes.map(prefix => node.field ? [...prefix, node.field] : prefix)
    const keys = [...new Set(paths.map(path => path.join('.')))]
    const perm = keys.length ? keys.map(key => permissions[key]).find(Boolean) : undefined
    if (perm?.visible === false)
      node.formItem = { ...node.formItem, hidden: true }
    if (perm?.editable === false)
      node.props = { ...node.props, disabled: true }
    if (perm?.required === true)
      node.formItem = { ...node.formItem, required: true }
    if (node.children?.length) {
      applyPermissions(
        node.children,
        permissions,
        paths.flatMap((path) => {
          if (!path.length)
            return [path]
          return [path, [...path, '*']]
        }),
      )
    }
  }
}

/**
 * 三通道收敛 hook：schema 直传 > formId API > schemaJson 降级。
 * formId 模式走宿主注册的 `__render` API（与数据源 api 共用注册机制），
 * 后端合并 schema + 回显数据 + 权限后返回 RenderContract。
 */
function useFormRendererLoader(
  props: FormRendererProps,
): { resolved: ResolvedSchema | null, loading: boolean, error: string } {
  const { schema, formId, schemaJson, initialValues } = props
  const [resolved, setResolved] = useState<ResolvedSchema | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 序列化 key 避免调用方每次渲染传新引用导致重复加载
  const schemaKey = schema ? JSON.stringify(schema) : ''
  const schemaJsonKey = schemaJson || ''
  const initialDataKey = initialValues ? JSON.stringify(initialValues) : ''

  useEffect(() => {
    if (schema) {
      const clone: FormSchema = JSON.parse(JSON.stringify(schema))
      applyPermissions(clone.children, clone.permissions)
      setResolved({ schema: clone, data: initialValues })
      setError('')
      return
    }
    if (schemaJson) {
      try {
        const parsed = parseSchema(schemaJson)
        setResolved({ schema: parsed, data: initialValues })
        setError('')
      }
      catch (e: any) {
        setError(e?.message || 'Schema 解析失败')
        setResolved(null)
      }
      return
    }
    if (formId) {
      const renderApi = getFormDataApi('__render')
      if (!renderApi) {
        setError('formId 模式需要在宿主注册 __render 数据接口（registerFormDataApis）')
        setResolved(null)
        return
      }
      setLoading(true)
      setError('')
      renderApi({ formId, data: initialValues })
        .then((contract: any) => {
          if (!contract?.schema)
            throw new Error('render 接口返回缺少 schema')
          const parsed = typeof contract.schema === 'string' ? parseSchema(contract.schema) : contract.schema as FormSchema
          const clone: FormSchema = JSON.parse(JSON.stringify(parsed))
          applyPermissions(clone.children, {
            ...parsed.permissions,
            ...contract.permissions,
          })
          setResolved({ schema: clone, data: contract.data ?? initialValues })
        })
        .catch((e: any) => {
          setError(e?.message || '表单加载失败')
          setResolved(null)
        })
        .finally(() => setLoading(false))
    }
  }, [formId, schemaKey, schemaJsonKey, initialDataKey])

  return { resolved, loading, error }
}

/**
 * 对外组件：三通道加载 + 加载态/错误态展示；
 * 加载完成后把 schema 和回显数据交给 FormRendererInner 渲染。
 */
export function FormRenderer(props: FormRendererProps) {
  const { resolved, loading, error } = useFormRendererLoader(props)

  if (loading)
    return <Spin style={{ display: 'block', margin: '80px auto' }} />
  if (error)
    return <Alert type="error" showIcon message={error} style={{ margin: '80px auto', maxWidth: 500 }} />
  if (!resolved)
    return null

  return <FormRendererInner {...props} schema={resolved.schema} initialValues={resolved.data} />
}

/** 内部渲染组件：只负责渲染已就绪的 schema */
function FormRendererInner({
  schema,
  initialValues,
  onSubmit,
  showActions = true,
  readonly,
  form: externalForm,
}: FormRendererProps & { schema: FormSchema }) {
  const { styles } = useStyles()
  const app = App.useApp()
  // 缺 <App> 祖先时 antd 只返回 { message: {} }（无降级、无告警），钩子里 ctx.message.xxx 会
  // 直接 TypeError 并从 runHooks 的 catch 里逃逸。降级到静态 message。
  const message = typeof app.message?.error === 'function' ? app.message : staticMessage
  const [innerForm] = Form.useForm()
  const form = externalForm ?? innerForm
  const computedFields = useMemo(() => orderComputedFields(collectComputedFields(schema.children)), [schema.children])
  const {
    buildCtx,
    bumpValuesVersion,
    controls,
    registerDataSource,
    schemaRef,
    valuesVersion,
  } = useFormRuntime({ schema, form, message, hasComputedFields: computedFields.length > 0 })

  const { submitBtn, resetBtn } = schema.form
  const showSubmit = showActions && !readonly && (submitBtn ?? true)
  const showReset = showActions && !readonly && (resetBtn ?? true)
  // labelWidth 是像素、offset 是栅格列数，两者无法互相换算；
  // 设了标签宽度就用 marginLeft 对齐，否则沿用原来的 offset: 4
  useEffect(() => {
    if (!computedFields.length)
      return
    const values = initialValues ? mergeInitialValues(form.getFieldsValue(true), initialValues) : form.getFieldsValue(true)
    const patch: Record<string, any> = {}
    const setPatch = (namePath: (string | number)[], value: any) => {
      const keys = namePath.map(String)
      let current: Record<string, any> = patch
      let source: unknown = values
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          current[key] = value
          return
        }
        const sourceNext = isRecord(source) || Array.isArray(source) ? (source as any)[key] : undefined
        const next = Array.isArray(sourceNext) ? [...sourceNext] : isRecord(sourceNext) ? { ...sourceNext } : {}
        current[key] = next
        current = next
        source = sourceNext
      })
    }
    for (const item of computedFields) {
      if (item.namePath) {
        try {
          setPatch(item.namePath, evalFormula(item.expression, values))
        }
        catch (error) {
          if (form.getFieldValue(item.namePath) !== undefined) {
            setPatch(item.namePath, undefined)
            console.warn('[form-designer] 计算字段执行失败', item.namePath.join('.'), error)
          }
        }
        continue
      }
      if (!item.row)
        continue
      const rows = getByPathName(values, item.row.listPath.join('.'))
      if (!Array.isArray(rows))
        continue
      rows.forEach((row, rowIndex) => {
        const namePath = [...item.row!.listPath, rowIndex, ...item.row!.childPath]
        try {
          const result = evalFormula(item.expression, createFormulaRowScope(row, values))
          setPatch(namePath, result)
        }
        catch (error) {
          if (form.getFieldValue(namePath) !== undefined) {
            setPatch(namePath, undefined)
            console.warn('[form-designer] 计算字段执行失败', namePath.join('.'), error)
          }
        }
      })
    }
    if (Object.keys(patch).length)
      form.setFieldsValue(patch)
  }, [computedFields, form, initialValues, valuesVersion])

  /** onFieldChange：只触发 watch 命中（或未声明 watch）的引用 */
  const runFieldChange = useCallback((field: string, value: any) => {
    const events = schemaRef.current.events
    const refs = filterRefsForField(events?.onFieldChange, field)
    if (refs.length)
      void runHooks('onFieldChange', refs, buildCtx({ changed: { field, value } }), events?.custom)
  }, [buildCtx])

  useEffect(() => {
    const events = schemaRef.current.events
    void runHooks('onFormCreated', events?.onFormCreated, buildCtx(), events?.custom)
      .then(() => runHooks('onFormMounted', schemaRef.current.events?.onFormMounted, buildCtx(), schemaRef.current.events?.custom))
    return () => {
      const leaving = schemaRef.current.events
      void runHooks('onFormUnmount', leaving?.onFormUnmount, buildCtx(), leaving?.custom)
    }
  }, [buildCtx])

  /**
   * 提交链路：beforeSubmit（可改值、可 return false 中断）→ 以改后的表单状态提交 →
   * afterSubmit / onSubmitError
   */
  const handleFinish = async (values: Record<string, any>) => {
    const events = schemaRef.current.events
    const custom = events?.custom
    if (!await runHooks('beforeSubmit', events?.beforeSubmit, buildCtx({ values }), custom))
      return
    // beforeSubmit 里可能用 ctx.setValue / ctx.setValues 改过值：antd 传进来的 values 只是校验时的
    // 快照，这里重新取一次，钩子的改值才真的进 onSubmit。
    // 不传 true：无参取值只回已注册字段，与改造前 onFinish 收到的值一致；传 true 会把整个 store
    // （未注册字段、preserve 保留值、钩子注入的键）带进提交报文
    const submitted = form.getFieldsValue()
    try {
      await onSubmit?.(submitted)
      await runHooks('afterSubmit', schemaRef.current.events?.afterSubmit, buildCtx({ values: submitted }), custom)
    }
    catch {
      // 不往外抛：rc-field-form 忽略 onFinish 的返回值，抛出去只会变成没有消费者的 unhandled
      // rejection（控制台报错 / 测试运行器失败）；业务页的失败提示由 http 拦截器统一负责
      await runHooks('onSubmitError', schemaRef.current.events?.onSubmitError, buildCtx({ values: submitted }), custom)
    }
  }

  const handleReset = () => {
    form.resetFields()
    bumpValuesVersion()
    const events = schemaRef.current.events
    void runHooks('onReset', events?.onReset, buildCtx(), events?.custom)
  }

  const handleValuesChange = (changed: Record<string, any>) => {
    Object.entries(changed).forEach(([field, value]) => runFieldChange(field, value))
    bumpValuesVersion()
  }

  const renderChild = (child: FieldSchema, parentType?: string): React.ReactNode => (
    <Fragment key={child.id}>{renderField(child, renderChild, parentType)}</Fragment>
  )

  // 字段级自定义校验要读公共事件表与完整 ctx（ctx.payload = { value, formValue }）；
  // 逐层透传会污染 renderField 的签名，这里用 context 下发
  const hooksRuntime = useMemo(() => ({
    custom: schema.events?.custom,
    events: schema.events,
    dataSources: schema.dataSources,
    valuesVersion,
    controls,
    registerDataSource,
    buildCtx,
  }), [schema.events, schema.dataSources, valuesVersion, controls, registerDataSource, buildCtx])

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={handleFinish}
      onFinishFailed={() => {
        const events = schemaRef.current.events
        void runHooks('onValidateFail', events?.onValidateFail, buildCtx(), events?.custom)
      }}
      onValuesChange={handleValuesChange}
      {...buildFormProps(schema.form)}
    >
      <FormHooksProvider value={hooksRuntime}>
        {schema.children.map(c => renderChild(c))}
        {(showSubmit || showReset) && (
          <Form.Item className={styles.actions} wrapperCol={{ span: 24 }}>
            <Flex justify="center" gap="small">
              {showSubmit && <Button type="primary" htmlType="submit">提交</Button>}
              {showReset && <Button onClick={handleReset}>重置</Button>}
            </Flex>
          </Form.Item>
        )}
      </FormHooksProvider>
    </Form>
  )
}
