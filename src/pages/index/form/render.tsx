import { FormRenderer } from '@zealous-admin/form-designer/index'
import { useAppMessage } from '@zealous-admin/layout/index'
import { Card, Form, Tag } from 'antd'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { submitFormDataAPI } from '@/apis/form'

export default function FormRenderPage() {
  const { message } = useAppMessage()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('id'))
  const [form] = Form.useForm()
  const [submitted, setSubmitted] = useState<{ dataId: number, values: Record<string, any> } | null>(null)

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      const res = await submitFormDataAPI({ formId: id, data: values })
      setSubmitted({ dataId: res.data.id, values })
      message.success(`提交成功，数据编号 #${res.data.id}`)
      form.resetFields()
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
  }

  return (
    <div className="app-container">
      <Card title={`表单 #${id}`} style={{ maxWidth: 860, margin: '0 auto' }}>
        <FormRenderer formId={id} form={form} onSubmit={handleSubmit} />
        {submitted && (
          <div style={{ marginTop: 16 }}>
            <Tag color="green">
              {`已落库 #${submitted.dataId}`}
            </Tag>
            <pre style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 6, maxHeight: 320, overflow: 'auto' }}>
              {JSON.stringify(submitted.values, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </div>
  )
}
