import type { FormSchema } from '@zealous-admin/form-designer/index'
import { FormRenderer } from '@zealous-admin/form-designer/index'
import { parseSchema } from '@zealous-admin/form-designer/utils/parseSchema'
import { useAppMessage } from '@zealous-admin/layout/index'
import { Card, Empty, Form, Spin, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getFormDetailAPI, submitFormDataAPI } from '@/apis/form'

export default function FormRenderPage() {
  const { message } = useAppMessage()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('id'))
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(!!id)
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState<{ dataId: number, values: Record<string, any> } | null>(null)

  useEffect(() => {
    if (!id)
      return
    getFormDetailAPI(id).then((res) => {
      setName(res.data.name)
      if (res.data.schema) {
        try {
          setSchema(parseSchema(res.data.schema))
        }
        catch {
          message.warning('表单数据解析失败')
        }
      }
    }).finally(() => setLoading(false))
  }, [id])

  // 提交即落库，成功后清空表单并记录本次数据编号
  const handleSubmit = async (values: Record<string, any>) => {
    try {
      const res = await submitFormDataAPI({ formId: id, data: values })
      setSubmitted({ dataId: res.data.id, values })
      message.success(`提交成功，数据编号 #${res.data.id}`)
      form.resetFields()
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
  }

  if (loading)
    return <Spin style={{ display: 'block', margin: '120px auto' }} />
  if (!schema)
    return <Empty description="未找到表单或尚未保存设计" />

  return (
    <div className="app-container">
      <Card title={`渲染测试：${name}`} style={{ maxWidth: 860, margin: '0 auto' }}>
        <FormRenderer form={form} schema={schema} onSubmit={handleSubmit} />
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
