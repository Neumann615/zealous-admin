import type { FormInstance } from 'antd'
import type { FormHookContext } from '../events/types'
import type { FieldSchema, FormSchema } from '../types/schema'
import { App, Button, Form, Space, message as staticMessage } from 'antd'
import { Fragment, useCallback, useEffect, useMemo, useRef } from 'react'
import { emitHook, filterRefsForField, runHooks } from '../events/runHooks'
import { findNodeByField } from '../utils/schemaTree'
import { buildFormProps, isHorizontalLayout, resolveLabelWidth } from './formProps'
import { FormHooksProvider } from './hooksContext'
import { renderField } from './renderField'

export interface FormRendererProps {
  schema: FormSchema
  initialValues?: Record<string, any>
  onSubmit?: (values: Record<string, any>) => void | Promise<void>
  /** 是否显示提交/重置按钮，业务页面可自行接管提交 */
  showActions?: boolean
  /** 外部表单实例，便于业务页提交后 resetFields / setFieldsValue */
  form?: FormInstance
}

export function FormRenderer({ schema, initialValues, onSubmit, showActions = true, form: externalForm }: FormRendererProps) {
  const app = App.useApp()
  // 缺 <App> 祖先时 antd 只返回 { message: {} }（无降级、无告警），钩子里 ctx.message.xxx 会
  // 直接 TypeError 并从 runHooks 的 catch 里逃逸。降级到静态 message。
  const message = typeof app.message?.error === 'function' ? app.message : staticMessage
  const [innerForm] = Form.useForm()
  const form = externalForm ?? innerForm
  const { submitBtn, resetBtn } = schema.form
  const showSubmit = showActions && (submitBtn ?? true)
  const showReset = showActions && (resetBtn ?? true)
  // labelWidth 是像素、offset 是栅格列数，两者无法互相换算；
  // 设了标签宽度就用 marginLeft 对齐，否则沿用原来的 offset: 4
  const labelWidth = resolveLabelWidth(schema.form)
  const actionWrapperCol = labelWidth
    ? { style: { marginLeft: `${labelWidth}px` } }
    : (isHorizontalLayout(schema.form) ? { offset: 4 } : undefined)

  // 事件表与 children 都经 ref 读取：schema 引用变化时既不重建 buildCtx（否则业务页内联传
  // schema 时父组件每次渲染都会让挂载 effect 重跑），也不会拿到旧配置
  const schemaRef = useRef(schema)
  schemaRef.current = schema

  const buildCtx = useCallback((over?: Partial<FormHookContext>): FormHookContext => {
    const current = schemaRef.current.events
    const ctx: FormHookContext = {
      form,
      values: form.getFieldsValue(true),
      getValues: () => form.getFieldsValue(true),
      setValue: (field, value) => form.setFieldsValue({ [field]: value }),
      setValues: patch => form.setFieldsValue(patch),
      getField: field => findNodeByField(schemaRef.current.children, field) ?? undefined,
      // 数据源在批次 3 接入；此处保留空实现，钩子里调用不会抛错
      reload: async () => {},
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
  }, [form, message])

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
    const events = schemaRef.current.events
    void runHooks('onReset', events?.onReset, buildCtx(), events?.custom)
  }

  const renderChild = (child: FieldSchema, parentType?: string): React.ReactNode => (
    <Fragment key={child.id}>{renderField(child, renderChild, parentType)}</Fragment>
  )

  // 字段级自定义校验要读公共事件表与完整 ctx（ctx.payload = { value, formValue }）；
  // 逐层透传会污染 renderField 的签名，这里用 context 下发
  const hooksRuntime = useMemo(() => ({ custom: schema.events?.custom, buildCtx }), [schema.events?.custom, buildCtx])

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={handleFinish}
      onFinishFailed={() => {
        const events = schemaRef.current.events
        void runHooks('onValidateFail', events?.onValidateFail, buildCtx(), events?.custom)
      }}
      onValuesChange={changed => Object.entries(changed).forEach(([field, value]) => runFieldChange(field, value))}
      {...buildFormProps(schema.form)}
    >
      <FormHooksProvider value={hooksRuntime}>
        {schema.children.map(c => renderChild(c))}
        {(showSubmit || showReset) && (
          <Form.Item wrapperCol={actionWrapperCol}>
            <Space>
              {showSubmit && <Button type="primary" htmlType="submit">提交</Button>}
              {showReset && <Button onClick={handleReset}>重置</Button>}
            </Space>
          </Form.Item>
        )}
      </FormHooksProvider>
    </Form>
  )
}
