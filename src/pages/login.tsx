import {
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useUserStore } from '@zealous-admin/auth'
import { useAppMessage, useAppStore, useLogin } from '@zealous-admin/layout/index'
import { Button, Checkbox, Form, Input, Tooltip, Typography } from 'antd'
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
      background: ${token.colorBgBase};

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

        @media (prefers-reduced-motion: reduce) {
          animation: none;
        }
      }
    `,

    card: css`
      position: relative;
      z-index: 1;
      width: 400px;
      max-width: calc(100vw - ${token.paddingLG * 2}px);
      padding: ${token.paddingXL}px ${token.paddingXL - 4}px ${token.paddingLG + 8}px;
      border-radius: ${token.borderRadiusLG * 2}px;
      background: ${token.colorBgContainer};
      border: 1px solid ${token.colorBorder};
      box-shadow: ${token.boxShadowSecondary};

      .ant-form-item { margin-bottom: ${token.marginMD}px; }

      /* 输入框覆写 */
      .ant-input-affix-wrapper {
        border-radius: ${token.borderRadiusLG}px;
        padding: ${token.paddingSM}px ${token.paddingMD}px;
      }
    `,

    logo: css`
      position: absolute;
      top: ${token.marginLG}px;
      left: ${token.marginLG}px;
      width: ${token.controlHeight}px;
      height: ${token.controlHeight}px;
    `,

    header: css`
      text-align: center;
      margin-bottom: ${token.marginXXL}px;
      h1 {
        margin: 0;
        font-size: ${token.fontSizeXL * 1.5}px;
        font-weight: ${token.fontWeightStrong};
        color: ${token.colorTextHeading};
      }
      p {
        margin: ${token.marginXS}px 0 0;
        color: ${token.colorTextDescription};
        font-size: ${token.fontSize}px;
      }
    `,

    submitBtn: css`
      width: 100%;
      height: ${token.controlHeightLG}px;
      margin-top: ${token.marginSM}px;
      border-radius: ${token.borderRadiusLG}px;
      font-size: ${token.fontSizeLG}px;
      font-weight: ${token.fontWeightStrong};
      letter-spacing: 1px;
    `,

    bottom: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      .ant-form-item { margin-bottom: 0 !important; }
      a {
        font-size: ${token.fontSizeSM}px;
        line-height: ${token.controlHeightLG}px;
      }
    `,

    demoSection: css`
      text-align: center;
      margin-top: ${token.marginMD}px;
      p {
        color: ${token.colorTextDescription};
        font-size: ${token.fontSizeSM}px;
        margin-bottom: ${token.marginSM}px;
        &::before, &::after {
          content: '';
          display: inline-block;
          width: 60px;
          height: 1px;
          background: ${token.colorBorder};
          vertical-align: middle;
          margin: 0 ${token.marginSM}px;
        }
      }
    `,

    demoBtns: css`
      display: flex;
      gap: ${token.marginMD}px;
    `,

    demoBtn: css`
      flex: 1;
      height: ${token.controlHeight}px;
      border-radius: ${token.borderRadius}px;
    `,
  }
})

export default function Login() {
  const { message } = useAppMessage()
  const { styles } = useStyles()
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const appStore = useAppStore()
  const { userInfo } = useUserStore()
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

      if (!success) {
        message.error('用户名或密码错误，请重试')
        return
      }

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
      }, 800)
    }
    catch (err) {
      console.error('登录失败:', err)
      message.error('登录失败，请检查网络连接后重试')
    }
  }

  const onFinishFailed = () => {
    const firstError = document.querySelector('.ant-form-item-has-error input') as HTMLInputElement | null
    firstError?.focus()
  }

  const demoAccounts = [
    { label: '管理员', userName: 'admin', password: 'admin123', hint: '拥有全部权限' },
    { label: '测试用户', userName: 'test', password: 'test123', hint: '受限制的只读权限' },
  ]

  const fillDemo = (userName: string, password: string) => {
    form.setFieldsValue({ userName, password })
  }

  useEffect(() => {
    const username = userInfo?.username || ''
    if (username) {
      form.setFieldsValue({ userName: username })
    }
    else {
      form.setFieldsValue({ userName: 'admin' })
    }
  }, [])

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <img
          className={styles.logo}
          src={appStore.logo || '/logo.svg'}
          alt={`${appStore.name} logo`}
        />
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
              aria-label="用户名"
              allowClear
              prefix={<UserOutlined />}
            />
          </Form.Item>

          <Form.Item name="password" rules={[{ validator: validatePassword }]}>
            <Input.Password
              placeholder="密码"
              aria-label="密码"
              prefix={<LockOutlined />}
              iconRender={visible =>
                visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            />
          </Form.Item>

          <div className={styles.bottom}>
            <Form.Item name="autoLogin" valuePropName="checked">
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <Link onClick={() => message.info('请联系管理员重置密码')}>忘记密码?</Link>
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
                <Tooltip key={acc.userName} title={acc.hint}>
                  <Button
                    className={styles.demoBtn}
                    onClick={() => fillDemo(acc.userName, acc.password)}
                  >
                    {acc.label}
                  </Button>
                </Tooltip>
              ))}
            </div>
          </div>
        </Form>
      </div>
    </div>
  )
}
