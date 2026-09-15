import type { FormInstance } from 'antd'
import type { FieldSchema, FormSchema } from '../types/schema'
import { Button, Form, Space } from 'antd'
import { Fragment } from 'react'
import { pickAntdFormProps } from './formProps'
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
  const { labelWidth, hideRequiredAsterisk, submitBtn, resetBtn, ...passthrough } = schema.form
  const showSubmit = showActions && (submitBtn ?? true)
  const showReset = showActions && (resetBtn ?? true)
  // 垂直/行内布局下标签在字段上方占满宽度，labelWidth 不参与（antd 的 layout 默认 horizontal）
  const isHorizontal = (schema.form.layout ?? 'horizontal') === 'horizontal'

  const renderChild = (child: FieldSchema, parentType?: string): React.ReactNode => (
    <Fragment key={child.id}>{renderField(child, renderChild, parentType)}</Fragment>
  )

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={onSubmit}
      labelCol={labelWidth && isHorizontal ? { style: { width: `${labelWidth}px` } } : undefined}
      requiredMark={hideRequiredAsterisk ? false : undefined}
      {...pickAntdFormProps(passthrough)}
    >
      {schema.children.map(c => renderChild(c))}
      {(showSubmit || showReset) && (
        <Form.Item wrapperCol={passthrough.layout === 'horizontal' ? { offset: 4 } : undefined}>
          <Space>
            {showSubmit && <Button type="primary" htmlType="submit">提交</Button>}
            {showReset && <Button onClick={() => form.resetFields()}>重置</Button>}
          </Space>
        </Form.Item>
      )}
    </Form>
  )
}
