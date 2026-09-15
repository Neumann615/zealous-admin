import type { FormInstance } from 'antd'
import type { FormHookContext } from '../events/types'
import type { FieldSchema, FormSchema } from '../types/schema'
import { App, Button, Form, Space } from 'antd'
import { Fragment, useCallback, useEffect, useRef } from 'react'
import { emitHook, filterRefsForField, runHooks } from '../events/runHooks'
import { findNodeByField } from '../utils/schemaTree'
import { buildFormProps, isHorizontalLayout, resolveLabelWidth } from './formProps'
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
  const { message } = App.useApp()
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

  // 钩子配置经 ref 读取，避免 schema 引用变化时闭包拿到旧事件表
  const eventsRef = useRef(schema.events)
  eventsRef.current = schema.events

  const buildCtx = useCallback((over?: Partial<FormHookContext>): FormHookContext => {
    const current = eventsRef.current
    const ctx: FormHookContext = {
      form,
      values: form.getFieldsValue(true),
      getValues: () => form.getFieldsValue(true),
      setValue: (field, value) => form.setFieldsValue({ [field]: value }),
      setValues: patch => form.setFieldsValue(patch),
      getField: field => findNodeByField(schema.children, field) ?? undefined,
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
  }, [form, message, schema.children])

  /** onFieldChange：只触发 watch 命中（或未声明 watch）的引用 */
  const runFieldChange = useCallback((field: string, value: any) => {
    const refs = filterRefsForField(eventsRef.current?.onFieldChange, field)
    if (refs.length)
      void runHooks('onFieldChange', refs, buildCtx({ changed: { field, value } }), eventsRef.current?.custom)
  }, [buildCtx])

  useEffect(() => {
    void runHooks('onFormCreated', eventsRef.current?.onFormCreated, buildCtx(), eventsRef.current?.custom)
      .then(() => runHooks('onFormMounted', eventsRef.current?.onFormMounted, buildCtx(), eventsRef.current?.custom))
    return () => {
      void runHooks('onFormUnmount', eventsRef.current?.onFormUnmount, buildCtx(), eventsRef.current?.custom)
    }
  }, [buildCtx])

  /** 提交链路：beforeSubmit 可改值/可 return false 中断 → onSubmit → afterSubmit / onSubmitError */
  const handleFinish = (values: Record<string, any>): Promise<void> => {
    const pending = (async () => {
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
    })()
    // antd 不消费 onFinish 的返回值，rethrow 会变成 unhandled rejection（浏览器控制台报错、
    // 测试运行器直接失败）。挂一个空 catch 只为消除噪音，pending 自身仍是 rejected，
    // 任何 await 它的调用方照旧拿得到该异常。
    void pending.catch(() => {})
    return pending
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
      onValuesChange={changed => Object.entries(changed).forEach(([field, value]) => runFieldChange(field, value))}
      {...buildFormProps(schema.form)}
    >
      {schema.children.map(c => renderChild(c))}
      {(showSubmit || showReset) && (
        <Form.Item wrapperCol={actionWrapperCol}>
          <Space>
            {showSubmit && <Button type="primary" htmlType="submit">提交</Button>}
            {showReset && <Button onClick={handleReset}>重置</Button>}
          </Space>
        </Form.Item>
      )}
    </Form>
  )
}
