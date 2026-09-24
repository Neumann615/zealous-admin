import type { FormSchema } from '@zealous-admin/form-designer/index'
import { useHasPermission } from '@zealous-admin/auth'
import { createEmptySchema, FormDesigner, parseSchema } from '@zealous-admin/form-designer/index'
import { useAppMessage } from '@zealous-admin/layout/index'
import { getOptionSetPageAPI } from '@zealous-admin/metadata/index'
import { Empty, Spin } from 'antd'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createFormDraftAPI, getFormDetailAPI, updateFormAPI } from '@/apis/form'

export default function FormDesignPage() {
  const { message } = useAppMessage()
  const hasPermission = useHasPermission()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('id'))
  const [loading, setLoading] = useState(!!id)
  const [notFound, setNotFound] = useState(false)
  const [initialSchema, setInitialSchema] = useState<FormSchema>()
  const [lockVersion, setLockVersion] = useState(0)
  const [optionSets, setOptionSets] = useState<Array<{ code: string, name: string, status: number }>>([])

  useEffect(() => {
    getOptionSetPageAPI({ pageNum: 1, pageSize: 200 })
      .then(result => setOptionSets(result.list))
      .catch(() => setOptionSets([]))
  }, [])

  useEffect(() => {
    if (!id)
      return
    getFormDetailAPI(id).then(async (res) => {
      let detail = res.data
      if (detail.status === 1 && !detail.hasDraft) {
        await createFormDraftAPI(id)
        detail = (await getFormDetailAPI(id)).data
      }
      // 无条件重置设计器 store：空 schema 用空模板，避免画布残留上一张表单字段
      setLockVersion(detail.lockVersion ?? 0)
      if (detail.schema) {
        try {
          setInitialSchema(parseSchema(detail.schema))
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
    const res = await updateFormAPI({ id, schema: JSON.stringify(schema), lockVersion })
    setLockVersion(res.data.lockVersion)
    message.success('保存成功')
  }

  if (loading)
    return <Spin style={{ display: 'block', margin: '120px auto' }} />
  if (notFound)
    return <Empty description="表单不存在或已被删除" style={{ marginTop: 120 }} />

  return (
    <div style={{ height: '100%' }}>
      <FormDesigner
        key={id}
        initialSchema={initialSchema}
        optionSets={optionSets}
        onSave={id && hasPermission('form:form:edit') ? handleSave : undefined}
      />
    </div>
  )
}
