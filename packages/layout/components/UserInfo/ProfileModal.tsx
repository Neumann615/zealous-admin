import { LockOutlined, MailOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { App, Avatar, Badge, Button, Card, Descriptions, Divider, Form, Input, Modal, Space, Tag, Typography } from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { logoutAction } from '../../hooks/useAuth'
import { useT } from '../../hooks/useT'
import { useUserStore } from '../../store/index'
import http from '../../utils/http'

const { Text, Title } = Typography

/** 修改当前登录用户密码 */
function updatePasswordAPI(data: { oldPassword: string, newPassword: string }) {
  return http({
    method: 'POST',
    url: '/admin/updatePassword',
    data,
  })
}

const useStyles = createStyles(({ token, css }) => {
  const gradient = `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryHover} 100%)`

  return {
    body: {
      padding: 0,
    },
    resetModal: css`
      .ant-modal-body {
        padding: 0px;
      }
      .ant-modal-container {
        padding: 0px;
      }
      .ant-card-body {
        padding: ${token.padding}px;
      }
    `,
    banner: css`
      position: relative;
      overflow: hidden;
      padding: ${token.paddingLG}px ${token.paddingLG}px;
      background: ${gradient};
      color: #fff;
      &::before,
      &::after {
        content: '';
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.12);
      }
      &::before {
        width: 220px;
        height: 220px;
        right: -60px;
        top: -90px;
      }
      &::after {
        width: 150px;
        height: 150px;
        right: 150px;
        bottom: -80px;
      }
    `,
    bannerInner: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: token.paddingLG,
    },
    avatarWrap: {
      flexShrink: 0,
      display: 'flex',
      padding: 4,
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.3)',
      boxShadow: `0 6px 20px rgba(0, 0, 0, 0.18)`,
    },
    bannerInfo: {
      flex: 1,
      minWidth: 0,
    },
    bannerName: {
      margin: 0,
      color: '#fff',
      fontSize: token.fontSizeHeading3,
      fontWeight: token.fontWeightStrong,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    bannerSub: {
      marginTop: 6,
      color: 'rgba(255, 255, 255, 0.85)',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: token.fontSize,
    },
    bannerTags: {
      marginTop: 10,
    },
    roleTag: {
      background: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(255, 255, 255, 0.4)',
      color: '#fff',
      borderRadius: token.borderRadiusSM,
    },
    bannerMeta: {
      flexShrink: 0,
      textAlign: 'right',
      fontSize: token.fontSizeSM,
    },
    metaItem: {
      'display': 'flex',
      'alignItems': 'center',
      'justifyContent': 'flex-end',
      'gap': 6,
      'color': 'rgba(255, 255, 255, 0.85)',
      'marginTop': 8,
      '&:first-child': { marginTop: 0 },
    },
    content: {
      padding: token.padding,
      display: 'flex',
      gap: token.padding,
    },
    card: {
      width: '50%',
      boxShadow: token.boxShadowTertiary,
      borderRadius: token.borderRadiusLG,
    },
    cardTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: token.fontSizeLG,
      fontWeight: token.fontWeightStrong,
      color: token.colorText,
    },
    descLabel: {
      color: token.colorTextSecondary,
    },
    formTip: {
      marginTop: token.margin,
      color: token.colorTextTertiary,
      fontSize: token.fontSizeSM,
      textAlign: 'center',
    },
  }
})

export interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { styles, theme } = useStyles()
  const { message } = App.useApp()
  const t = useT()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const userInfo = useUserStore(state => state.userInfo)
  const { username, nickName, email, icon: avatar, roles, status, loginTime } = userInfo ?? {}
  const displayName = nickName || username || t('userInfo.notLoggedIn')
  const avatarSrc = avatar || `https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${username}`

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      await updatePasswordAPI({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      message.success(t('profile.passwordChanged'))
      form.resetFields()
      setTimeout(logoutAction, 1500)
    }
    catch {
      // 错误提示已由 http 拦截器统一处理
    }
    finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      className={styles.resetModal}
      width={880}
      open={open}
      onCancel={onClose}
      closable={false}
      footer={null}
      title={null}
      styles={{ body: { padding: 0 } }}
    >
      <div className={styles.body}>
        <div className={styles.banner}>
          <div className={styles.bannerInner}>
            <div className={styles.avatarWrap}>
              <Avatar size={72} src={avatarSrc} />
            </div>
            <div className={styles.bannerInfo}>
              <Title level={4} className={styles.bannerName}>{displayName}</Title>
              <div className={styles.bannerSub}>
                <UserOutlined />
                <span>
                  @
                  {username || '-'}
                </span>
                {email && (
                  <>
                    <Divider type="vertical" style={{ borderColor: 'rgba(255,255,255,0.4)', margin: '0 4px' }} />
                    <MailOutlined />
                    <span>{email}</span>
                  </>
                )}
              </div>
              <div className={styles.bannerTags}>
                {roles?.length
                  ? roles.map(role => <Tag key={role} className={styles.roleTag}>{role}</Tag>)
                  : <Tag className={styles.roleTag}>{t('profile.defaultRole')}</Tag>}
              </div>
            </div>
            <div className={styles.bannerMeta}>
              <div className={styles.metaItem}>
                <Badge status={Number(status) === 1 ? 'success' : 'error'} text={Number(status) === 1 ? t('profile.accountNormal') : t('profile.accountDisabled')} />
              </div>
              <div className={styles.metaItem}>
                <span>{t('profile.lastLogin')}</span>
                <span>{loginTime || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <Card className={styles.card}>
            <div className={styles.cardTitle}>
              <SafetyCertificateOutlined style={{ color: theme.colorPrimary }} />
              {t('profile.title')}
            </div>
            <Divider style={{ margin: '12px 0 16px' }} />
            <Descriptions column={1} colon={false} size="middle">
              <Descriptions.Item label={<span className={styles.descLabel}>{t('profile.username')}</span>}>
                <Space>
                  <UserOutlined style={{ fontSize: 12 }} />
                  {username || '-'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label={<span className={styles.descLabel}>{t('profile.nickname')}</span>}>
                {nickName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<span className={styles.descLabel}>{t('profile.email')}</span>}>
                {email || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<span className={styles.descLabel}>{t('profile.accountStatus')}</span>}>
                <Badge status={Number(status) === 1 ? 'success' : 'error'} text={Number(status) === 1 ? t('profile.statusEnabled') : t('profile.statusDisabled')} />
              </Descriptions.Item>
              <Descriptions.Item label={<span className={styles.descLabel}>{t('profile.role')}</span>}>
                <Space wrap>
                  {roles?.length
                    ? roles.map(role => <Tag color="blue" key={role}>{role}</Tag>)
                    : <Text type="secondary">-</Text>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label={<span className={styles.descLabel}>{t('profile.lastLoginTime')}</span>}>
                {loginTime || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          <Card className={styles.card}>
            <div className={styles.cardTitle}>
              <LockOutlined style={{ color: theme.colorPrimary }} />
              {t('profile.changePassword')}
            </div>
            <Divider style={{ margin: '12px 0 16px' }} />
            <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSubmit}>
              <Form.Item
                label={t('profile.oldPassword')}
                name="oldPassword"
                rules={[{ required: true, message: t('profile.oldPasswordRequired') }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder={t('profile.oldPasswordPlaceholder')} />
              </Form.Item>
              <Form.Item
                label={t('profile.newPassword')}
                name="newPassword"
                rules={[
                  { required: true, message: t('profile.newPasswordRequired') },
                  { min: 6, max: 20, message: t('profile.passwordLength') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value !== getFieldValue('oldPassword')) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error(t('profile.passwordSame')))
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<SafetyCertificateOutlined />} placeholder={t('profile.newPasswordPlaceholder')} />
              </Form.Item>
              <Form.Item
                label={t('profile.confirmPassword')}
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: t('profile.confirmPasswordRequired') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error(t('profile.passwordMismatch')))
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<UserOutlined />} placeholder={t('profile.confirmPasswordPlaceholder')} />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" block loading={submitting}>
                  {t('profile.submit')}
                </Button>
              </Form.Item>
              <div className={styles.formTip}>{t('profile.tip')}</div>
            </Form>
          </Card>
        </div>
      </div>
    </Modal>
  )
}
