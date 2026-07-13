import { Button, Card, DatePicker, Form, Input, InputNumber, TimePicker } from 'antd'
import { useState } from 'react'

export default function KeepAlive() {
  const [count, setCount] = useState(0)
  const [form] = Form.useForm()

  return (
    <div className="app-container">
      <Card title="页面保活">
        <div style={{ marginBottom: 24 }}>
          <Button type="primary" onClick={() => setCount(c => c + 1)}>
            点击次数:
            {' '}
            {count}
          </Button>
        </div>

        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item label="文本输入" name="text">
            <Input placeholder="请输入文本" />
          </Form.Item>

          <Form.Item label="文本域" name="textarea">
            <Input.TextArea placeholder="请输入多行文本" rows={4} />
          </Form.Item>

          <Form.Item label="数字输入" name="number">
            <InputNumber min={0} max={100} placeholder="请输入数字" />
          </Form.Item>

          <Form.Item label="日期选择" name="date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="时间选择" name="time">
            <TimePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}