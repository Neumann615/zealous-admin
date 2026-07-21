import { Alert } from 'antd'

export default function MenuActiveParentTest() {
  return (
    <div className="app-container">
      <Alert
        type="info"
        message="父级图标激活"
        description="注意看父级导航的图标切换"
      />
    </div>
  )
}
