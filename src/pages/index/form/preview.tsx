import { FormRenderer } from '@zealous-admin/form-designer/index'
import { useAppMessage } from '@zealous-admin/layout/index'
import { Card, Empty, Form, Select, Space } from 'antd'
import { createStyles } from 'antd-style'
import { useEffect, useState } from 'react'
import { getFormListAPI } from '@/apis/form'

interface FormOption {
  id: number
  name: string
  description: string
  status: number
}

const useStyles = createStyles(({ css, token }) => ({
  root: css`
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: ${token.marginLG}px;
    height: 100%;
    padding: ${token.paddingLG}px;
    background: ${token.colorBgLayout};
  `,
  select: css`
    flex-shrink: 0;
    width: 280px;
    margin: 0 auto;
  `,
  panel: css`
    flex: 1;
    min-height: 0;
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    overflow: hidden;
  `,
  panelBody: css`
    height: 100%;
    min-height: 320px;
    overflow-y: auto;
    padding: ${token.paddingLG}px;
  `,
  emptyBody: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 320px;
  `,
  controls: css`
    flex-shrink: 0;
    justify-content: center;
  `,
}))

export default function FormPreviewPage() {
  const { styles } = useStyles()
  const { message } = useAppMessage()
  const [form] = Form.useForm()
  const [list, setList] = useState<FormOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number>()

  useEffect(() => {
    getFormListAPI({ pageNum: 1, pageSize: 100 })
      .then((res) => {
        setList(res.data.list)
        const first = res.data.list.find((item: FormOption) => item.status === 1) || res.data.list[0]
        if (first)
          setSelectedId(first.id)
      })
      .catch(() => { /* 错误提示由 http 拦截器统一弹出 */ })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (values: Record<string, any>) => {
    if (!selectedId)
      return
    try {
      await import('@/apis/form').then(m => m.submitFormDataAPI({ formId: selectedId, data: values }))
      message.success('提交成功')
      form.resetFields()
    }
    catch { /* 失败提示由 http 拦截器统一弹出 */ }
  }

  return (
    <div className={styles.root}>
      <Space className={styles.controls}>
        <Select<number>
          className={styles.select}
          placeholder="请选择要预览的表单"
          value={selectedId}
          loading={loading}
          showSearch
          optionFilterProp="label"
          onChange={(value) => {
            setSelectedId(value)
            form.resetFields()
          }}
          options={list.map(item => ({
            value: item.id,
            label: `${item.name}${item.status !== 1 ? '（未发布）' : ''}`,
          }))}
        />
      </Space>

      <Card
        className={styles.panel}
        styles={{ body: { height: '100%', padding: 0 } }}
      >
        <div className={selectedId ? styles.panelBody : styles.emptyBody}>
          {selectedId
            ? (
                <FormRenderer
                  key={selectedId}
                  formId={selectedId}
                  form={form}
                  onSubmit={handleSubmit}
                />
              )
            : (
                <Empty description={loading ? '加载中...' : '请选择要预览的表单'} />
              )}
        </div>
      </Card>
    </div>
  )
}
