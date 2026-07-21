import { Alert } from 'antd'

export default function MenuActiveChildren() {
  return (
    <div className="app-container">
      <Alert
        type="info"
        message="子级图标激活"
        description="注意看子级导航的图标切换"
      />
    </div>
  )
}
