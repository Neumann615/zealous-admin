import type { FormInstance } from 'antd'
import type { FormHookContext } from '../events/types'
import type { FieldPermission, FieldSchema, FormSchema } from '../types/schema'
import type { EffectiveState } from './control'
import type { DataSourceReloadHandle } from './hooksContext'
import { Alert, App, Button, Flex, Form, Spin, message as staticMessage } from 'antd'
import { createStyles } from 'antd-style'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emitHook, filterRefsForField, runHooks } from '../events/runHooks'
import { parseSchema } from '../utils/parseSchema'
import { findNodeByField } from '../utils/schemaTree'
import { evalControl } from './control'
import { getFormDataApi } from './dataApis'
import { buildFormProps } from './formProps'
import { FormHooksProvider } from './hooksContext'
import { renderField } from './renderField'

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

/**
 * 是否有字段依赖表单值：数据源的 `watch`（依赖重跑）或联动 `control`（有效态重算）。
 * 有依赖才需要值版本号 —— 其余表单保持原有的「值变化不重渲染」行为。
 */
function consumesValues(children: FieldSchema[]): boolean {
  return children.some(node =>
    !!node.dataSource?.watch?.length || !!node.control?.length || consumesValues(node.children ?? []),
  )
}

/**
 * 收集每个字段的有效态，键为节点 id（FieldItem / FieldControl / 容器分支都按 id 查表）。
 * 嵌套字段一并收进来：容器的 disabled 由容器分支消费后向子字段下发。
 */
function collectControlStates(
  children: FieldSchema[],
  values: Record<string, any>,
  out: Record<string, EffectiveState> = {},
): Record<string, EffectiveState> {
  for (const node of children) {
    if (node.control?.length) {
      const state = evalControl(node.control, values)
      if (Object.keys(state).length)
        out[node.id] = state
    }
    if (node.children?.length)
      collectControlStates(node.children, values, out)
  }
  return out
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
function applyPermissions(children: FieldSchema[], permissions: Record<string, FieldPermission> | undefined): void {
  if (!permissions)
    return
  for (const node of children) {
    if (!node.field)
      continue
    const perm = permissions[node.field]
    if (!perm)
      continue
    if (perm.visible === false)
      node.formItem = { ...node.formItem, hidden: true }
    if (perm.editable === false)
      node.props = { ...node.props, disabled: true }
    if (perm.required === true)
      node.formItem = { ...node.formItem, required: true }
    if (node.children?.length)
      applyPermissions(node.children, permissions)
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
          applyPermissions(clone.children, contract.permissions)
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
  // 表单值版本号：数据源的 watch 重跑以它为信号（只有真的声明了 watch 才自增，
  // 其余表单保持原有的「值变化不重渲染」行为）
  const [valuesVersion, setValuesVersion] = useState(0)
  const hasControls = useMemo(() => schema.children.some(node => !!node.control?.length), [schema.children])
  const watchesValues = useMemo(() => consumesValues(schema.children), [schema.children])
  /** 数据源重取句柄：ctx.reload 的目标集合（Form.List 行内字段会登记多个实例） */
  const reloadHandlesRef = useRef(new Map<number, DataSourceReloadHandle>())
  const reloadSeqRef = useRef(0)
  const registerDataSource = useCallback((handle: DataSourceReloadHandle) => {
    const id = ++reloadSeqRef.current
    reloadHandlesRef.current.set(id, handle)
    return () => {
      reloadHandlesRef.current.delete(id)
    }
  }, [])

  /** 值版本号自增：没有消费者（schema 里没声明 watch / control）时不自增，避免无谓的整树重渲染 */
  const bumpValuesVersion = useCallback(() => {
    if (watchesValues)
      setValuesVersion(v => v + 1)
  }, [watchesValues])

  const { submitBtn, resetBtn } = schema.form
  const showSubmit = showActions && !readonly && (submitBtn ?? true)
  const showReset = showActions && !readonly && (resetBtn ?? true)
  // labelWidth 是像素、offset 是栅格列数，两者无法互相换算；
  // 设了标签宽度就用 marginLeft 对齐，否则沿用原来的 offset: 4
  // 事件表与 children 都经 ref 读取：schema 引用变化时既不重建 buildCtx（否则业务页内联传
  // schema 时父组件每次渲染都会让挂载 effect 重跑），也不会拿到旧配置
  const schemaRef = useRef(schema)
  schemaRef.current = schema

  /**
   * 联动有效态：按当前表单值求值，键为字段节点 id。
   * 没有字段声明 control 时不下发（`undefined`），FieldItem / FieldControl 沿用原配置。
   * 首次渲染读到的值可能还没包含 initialValues（antd 在自己的 effect 里装载初始值），
   * 故挂载后再自增一次值版本号强制重算，否则「初始值命中规则」的隐藏 / 必填会漏掉。
   */
  const controls = hasControls ? collectControlStates(schema.children, form.getFieldsValue(true)) : undefined
  useEffect(() => {
    // 首次渲染时 initialValues 可能还没进 store（antd 在自己的 effect 里装载），
    // 这里挂载后强制重算一次联动有效态；只在真的声明了 control 时触发这一次重渲染。
    if (hasControls)
      // eslint-disable-next-line react/set-state-in-effect -- 见上：刻意的挂载后重算，只在有联动规则时触发一次
      setValuesVersion(v => v + 1)
  }, [hasControls])

  const buildCtx = useCallback((over?: Partial<FormHookContext>): FormHookContext => {
    const current = schemaRef.current.events
    const ctx: FormHookContext = {
      form,
      values: form.getFieldsValue(true),
      getValues: () => form.getFieldsValue(true),
      /**
       * 改值后立刻自增值版本号：联动的有效态与数据源 watch 的依赖比较都以它为信号，
       * 否则钩子（例如 onFormMounted 里）改的值要等用户下一次输入才生效。
       *
       * 为什么不会自增成环：值版本号只驱动两件纯计算 —— 「重算联动有效态」与「数据源依赖取值比较」，
       * 任何钩子场景都不在它的下游（场景只在挂载、用户输入、提交链、重置与手动 ctx.reload 上触发），
       * 因此 setValue → 自增 → 重算 不会再触发 setValue。唯一跨帧的链路是数据源 watch：它按
       * 依赖值去重（值没变就不重新取数），只有「钩子在每次取数后又写下一个不同的依赖值」这种
       * 自造反馈才会继续（链路是 取数 → beforeLoadData / afterLoadData → setValue → 自增），
       * 并受防抖与请求序号限流为一次一个在飞请求。
       *
       * 代价（有意选择无条件自增）：写到未注册字段（只进 store 的键）也会多一次重算 + 重渲染。
       * 换来的是不漏算 —— control 规则与 watch 都可以依赖只存在于 store 里的键（钩子算出来的标记位
       * 就是常见用法），按「schema 里声明的字段」过滤会静默漏掉这类联动。
       */
      setValue: (field, value) => {
        form.setFieldsValue({ [field]: value })
        bumpValuesVersion()
      },
      setValues: (patch) => {
        form.setFieldsValue(patch)
        bumpValuesVersion()
      },
      getField: field => findNodeByField(schemaRef.current.children, field) ?? undefined,
      /**
       * 重跑数据源：无参 → 所有挂了 dataSource 的字段；带参 → 命中该字段（名路径或字段名）的实例。
       * 返回的 Promise 在取数（以及随后的 onReload）结束后 resolve；手动重取才触发 onReload，
       * watch 引起的自动重取不触发（区别见 docs/form-designer/events.md）。
       */
      reload: async (field?: string) => {
        const targets = [...reloadHandlesRef.current.values()]
          .filter(handle => !field || handle.key === field || handle.field === field)
        await Promise.all(targets.map(handle => handle.reload()))
        await runHooks('onReload', schemaRef.current.events?.onReload, buildCtx({ payload: { field } }), current?.custom)
      },
      message,
      // emit 必须转发 ctx 自身，先占位、构造完成后立刻绑定（见下）
      emit: async () => {},
      ...over,
    }
    // emit 必须转发「接收者自身」而不是新建 ctx：scene（以及 onFieldChange 的 changed）
    // 是 runHooks 写在它收到的那份 ctx 上的，另建一份就会全丢——而「写一次、多场景复用」
    // 的命名公共事件恰恰最需要知道自己被谁触发。
    ctx.emit = (name, payload) => emitHook(name, ctx, current?.custom, payload)
    return ctx
  }, [form, message, bumpValuesVersion])

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
