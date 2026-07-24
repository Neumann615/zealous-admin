import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Form, Input, Modal } from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { loginAction, logoutAction } from '../../hooks/useAuth'
import { useReLoginStore } from '../../store/reLogin'

const useStyles = createStyles(({ token }) => ({
  tip: {
    color: token.colorTextSecondary,
    fontSize: token.fontSize,
    marginBottom: 16,
  },
}))

export function ReLoginModal() {
  const { styles } = useStyles()
  const { visible, hide } = useReLoginStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      await loginAction({
        username: values.userName.trim(),
        password: values.password,
      })
      hide()
      location.reload()
    }
    catch {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    hide()
    logoutAction()
  }

  return (
    <Modal
      open={visible}
      title="登录已过期"
      okText="重新登录"
      cancelText="退出"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      closable={false}
      maskClosable={false}
    >
      <div className={styles.tip}>你的登录凭证已失效，请重新输入用户名和密码</div>
      <Form form={form} autoComplete="off">
        <Form.Item
          name="userName"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input
            placeholder="用户名"
            prefix={<UserOutlined />}
            allowClear
          />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 3, message: '密码不能小于3位' },
          ]}
        >
          <Input.Password
            placeholder="密码"
            prefix={<LockOutlined />}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
