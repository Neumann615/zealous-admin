import { useFireworks } from '@zealous-admin/layout/index'
import { Button, Card, Space, InputNumber } from 'antd'
import { useState } from 'react'

export default function fireworks() {
  const { throwCards } = useFireworks()
  const [count, setCount] = useState(200)

  return (
    <Card title="彩带庆祝效果">
      <Space wrap>
        <InputNumber
          min={50}
          max={500}
          value={count}
          onChange={v => setCount(v || 50)}
          style={{ width: 120 }}
        />
        <Button type="primary" onClick={() => throwCards({ count })}>庆祝彩带</Button>
      </Space>
    </Card>
  )
}