import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAppMessage, useAppStore, useLogin, useUserStore } from '@zealous-admin/layout/index'
import { Button, Checkbox, Form, Input, Typography } from 'antd'
import { createStyles, keyframes } from 'antd-style'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const { Link } = Typography

const gridMove = keyframes`
  from { background-position: 0 0; }
  to   { background-position: 0 -24px; }
`

const useStyles = createStyles(({ token, css }) => {
  return {
    wrapper: css`
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      width: 100%;
      overflow: hidden;
      background: ${token.colorBgLayout};

      /* 网格背景 — 向上移动 + 四边渐变消失 */
      &::before {
        content: '';
        position: absolute;
        inset: -24px 0 0 0;
        pointer-events: none;
        background-image:
          linear-gradient(${token.colorBorder} 1px, transparent 1px),
          linear-gradient(90deg, ${token.colorBorder} 1px, transparent 1px);
        background-size: 24px 24px;
        opacity: .5;
        animation: ${gridMove} 1.5s linear infinite;
        /* 蒙版：四边向中心渐变，边缘透明露出 wrapper 背景色 */
        -webkit-mask-image:
          linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%),
          linear-gradient(to right,  transparent 0%, black 12%, black 88%, transparent 100%);
        -webkit-mask-composite: source-in;
        mask-image:
          linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%),
          linear-gradient(to right,  transparent 0%, black 12%, black 88%, transparent 100%);
        mask-composite: intersect;
      }
    `,

    card: css`
      position: relative;
      z-index: 1;
      width: 400px;
      padding: 40px 36px 32px;
      border-radius: 12px;
      background: ${token.colorBgContainer};
      border: 1px solid ${token.colorBorder};
      box-shadow: ${token.boxShadowSecondary};

      .ant-form-item { margin-bottom: 20px; }

      /* 输入框覆写 */
      .ant-input-affix-wrapper {
        border-radius: 8px;
        padding: 8px 12px;
      }
    `,

    logo: css`
      position: absolute;
      top: 18px;
      left: 18px;
      width: 32px;
      height: 32px;
    `,

    header: css`
      text-align: center;
      margin-bottom: 32px;
      h1 {
        margin: 0;
        font-size: 30px;
        font-weight: 700;
        color: ${token.colorTextHeading};
      }
      p {
        margin: 6px 0 0;
        color: ${token.colorTextDescription};
        font-size: 14px;
      }
    `,

    submitBtn: css`
      width: 100%;
      height: 44px;
      margin-top: 8px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 1px;
    `,

    bottom: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      .ant-form-item { margin-bottom: 0 !important; }
      a { font-size: 13px; }
    `,

    demoSection: css`
      text-align: center;
      margin-top: 20px;
      p {
        color: ${token.colorTextDescription};
        font-size: 13px;
        margin-bottom: 10px;
        &::before, &::after {
          content: '';
          display: inline-block;
          width: 60px;
          height: 1px;
          background: ${token.colorBorder};
          vertical-align: middle;
          margin: 0 10px;
        }
      }
    `,

    demoBtns: css`
      display: flex;
      gap: 12px;
    `,

    demoBtn: css`
      flex: 1;
      height: 36px;
      border-radius: 6px;
    `,
  }
})

export default function Login() {
  const { message } = useAppMessage()
  const { styles } = useStyles()
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const appStore = useAppStore()
  const mallUserStore = useUserStore()
  const { login, loading } = useLogin()

  const validateUsername = (_rule: any, value: string) => {
    if (!value || value.trim() === '') {
      return Promise.reject(new Error('请输入用户名'))
    }
    return Promise.resolve()
  }

  const validatePassword = (_rule: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入密码'))
    }
    if (value.length < 3) {
      return Promise.reject(new Error('密码不能小于3位'))
    }
    return Promise.resolve()
  }

  const onFinish = async () => {
    try {
      const values = await form.validateFields()
      const success = await login({
        username: values.userName.trim(),
        password: values.password,
      })

      if (!success) return

      if (values.autoLogin) {
        window.localStorage.setItem(
          'remember',
          JSON.stringify({
            autoLogin: values.autoLogin,
            userName: values.userName,
            password: values.password,
          }),
        )
      }
      message.success('登录成功')
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 1500)
    }
    catch (err) {
      console.error('登录失败:', err)
    }
  }

  const onFinishFailed = () => {}

  const demoAccounts = [
    { label: '管理员', userName: 'admin', password: 'admin123' },
    { label: '测试用户', userName: 'test', password: 'test123' },
  ]

  const fillDemo = (userName: string, password: string) => {
    form.setFieldsValue({ userName, password })
  }

  useEffect(() => {
    const { username, password } = mallUserStore.userInfo
    if (username && username !== '') {
      form.setFieldsValue({ userName: username, password })
    }
    else {
      form.setFieldsValue({ userName: 'admin' })
    }
  }, [])

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <img className={styles.logo} src={appStore.logo || '/logo.svg'} alt="logo" />
        <div className={styles.header}>
          <h1>{appStore.name}</h1>
          <p>欢迎回来，请登录你的账号</p>
        </div>

        <Form
          form={form}
          name="login"
          size="large"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item name="userName" rules={[{ validator: validateUsername }]}>
            <Input
              placeholder="用户名"
              allowClear
              prefix={<UserOutlined />}
            />
          </Form.Item>

          <Form.Item name="password" rules={[{ validator: validatePassword }]}>
            <Input.Password
              placeholder="密码"
              prefix={<LockOutlined />}
              iconRender={visible =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
            />
          </Form.Item>

          <div className={styles.bottom}>
            <Form.Item name="autoLogin" valuePropName="checked">
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <Link style={{ lineHeight: '40px' }}>忘记密码?</Link>
          </div>

          <Form.Item>
            <Button
              htmlType="submit"
              type="primary"
              className={styles.submitBtn}
              loading={loading}
              block
            >
              登 录
            </Button>
          </Form.Item>

          <div className={styles.demoSection}>
            <p>演示账号</p>
            <div className={styles.demoBtns}>
              {demoAccounts.map(acc => (
                <Button
                  key={acc.userName}
                  className={styles.demoBtn}
                  onClick={() => fillDemo(acc.userName, acc.password)}
                >
                  {acc.label}
                </Button>
              ))}
            </div>
          </div>
        </Form>
      </div>
    </div>
  )
}
