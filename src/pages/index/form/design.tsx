import type { FormSchema } from '@zealous-admin/form-designer/index'
import { createEmptySchema, FormDesigner, parseSchema } from '@zealous-admin/form-designer/index'
import { useAppMessage } from '@zealous-admin/layout/index'
import { Empty, Spin } from 'antd'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getFormDetailAPI, updateFormAPI } from '@/apis/form'

export default function FormDesignPage() {
  const { message } = useAppMessage()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('id'))
  const [loading, setLoading] = useState(!!id)
  const [notFound, setNotFound] = useState(false)
  const [initialSchema, setInitialSchema] = useState<FormSchema>()

  useEffect(() => {
    if (!id)
      return
    getFormDetailAPI(id).then((res) => {
      // 无条件重置设计器 store：空 schema 用空模板，避免画布残留上一张表单字段
      if (res.data.schema) {
        try {
          setInitialSchema(parseSchema(res.data.schema))
        }
        catch (e: any) {
          message.warning(`已存 schema 解析失败，将重新设计（${e?.message}）`)
          setInitialSchema(createEmptySchema())
        }
      }
      else {
        setInitialSchema(createEmptySchema())
      }
    }).catch(() => {
      message.error('表单加载失败')
      setNotFound(true)
    }).finally(() => setLoading(false))
  }, [id])

  const handleSave = async (schema: FormSchema) => {
    try {
      await updateFormAPI({ id, schema: JSON.stringify(schema) })
      message.success('保存成功')
    }
    catch {
      // 失败提示由 http 拦截器统一弹出；此处吞掉 rejection，本地 schema 保留可直接重试
    }
  }

  if (loading)
    return <Spin style={{ display: 'block', margin: '120px auto' }} />
  if (notFound)
    return <Empty description="表单不存在或已被删除" style={{ marginTop: 120 }} />

  return (
    <div style={{ height: '100%' }}>
      <FormDesigner key={id} initialSchema={initialSchema} onSave={id ? handleSave : undefined} />
    </div>
  )
}
