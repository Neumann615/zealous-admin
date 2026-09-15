import type { FormInstance } from 'antd'
import type { FieldSchema, FormSchema } from '../types/schema'
import { Button, Form, Space } from 'antd'
import { Fragment } from 'react'
import { buildFormProps, isHorizontalLayout, resolveLabelWidth } from './formProps'
import { renderField } from './renderField'

export interface FormRendererProps {
  schema: FormSchema
  initialValues?: Record<string, any>
  onSubmit?: (values: Record<string, any>) => void
  /** 是否显示提交/重置按钮，业务页面可自行接管提交 */
  showActions?: boolean
  /** 外部表单实例，便于业务页提交后 resetFields / setFieldsValue */
  form?: FormInstance
}

export function FormRenderer({ schema, initialValues, onSubmit, showActions = true, form: externalForm }: FormRendererProps) {
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

  const renderChild = (child: FieldSchema, parentType?: string): React.ReactNode => (
    <Fragment key={child.id}>{renderField(child, renderChild, parentType)}</Fragment>
  )

  return (
    <Form form={form} initialValues={initialValues} onFinish={onSubmit} {...buildFormProps(schema.form)}>
      {schema.children.map(c => renderChild(c))}
      {(showSubmit || showReset) && (
        <Form.Item wrapperCol={actionWrapperCol}>
          <Space>
            {showSubmit && <Button type="primary" htmlType="submit">提交</Button>}
            {showReset && <Button onClick={() => form.resetFields()}>重置</Button>}
          </Space>
        </Form.Item>
      )}
    </Form>
  )
}
