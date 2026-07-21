import { HomeFilled, LogoutOutlined, RightOutlined, SettingFilled, ToolFilled } from '@ant-design/icons'
import { App, Avatar, Divider, Popover } from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMenuStore } from '../../store/index'
import { ConfigPanel } from '../ConfigPanel/ConfigPanel'

export interface UserInfoData {
  username: string
  email: string
  avatar: string
  nickName?: string
}

interface UserInfoProps {
  userInfo?: UserInfoData
  onLogout?: () => void
}

const useStyles = createStyles(({ token }) => ({
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: token.paddingSM,
  },
  avatar: {
    boxSizing: 'border-box',
    borderRadius: token.borderRadius,
    padding: token.paddingXS,
    cursor: 'pointer',
    backgroundColor: token.colorBgTextHover,
    transition: 'all 0.2s',
  },
  avatar2: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    borderRadius: token.borderRadius,
    padding: token.paddingXS,
    cursor: 'pointer',
    backgroundColor: token.colorBgTextHover,
    transition: 'all 0.2s',
  },
  menuContainer: {
    width: 200,
  },
  menuHeader: {
    padding: token.paddingSM,
  },
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginSM,
  },
  userText: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontWeight: token.fontWeightStrong,
    color: token.colorText,
    fontSize: token.fontSizeLG,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  userSub: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    marginTop: 2,
  },
  menuContent: {
    padding: token.paddingXXS,
  },
  menuItem: {
    'display': 'flex',
    'alignItems': 'center',
    'gap': token.marginXS,
    'padding': `${token.paddingXS}px ${token.paddingSM}px`,
    'cursor': 'pointer',
    'transition': 'all 0.2s',
    'color': token.colorText,
    'borderRadius': token.borderRadius,
    'fontSize': token.fontSize,
    '&:hover': {
      backgroundColor: token.colorBgTextHover,
    },
  },
  menuItemDanger: {
    'display': 'flex',
    'alignItems': 'center',
    'gap': token.marginXS,
    'padding': `${token.paddingXS}px ${token.paddingSM}px`,
    'cursor': 'pointer',
    'transition': 'all 0.2s',
    'color': token.colorError,
    'borderRadius': token.borderRadius,
    'fontSize': token.fontSize,
    '&:hover': {
      backgroundColor: token.colorErrorBg,
    },
  },
  menuItemIcon: {
    fontSize: token.fontSize,
    display: 'flex',
    alignItems: 'center',
  },
}))

export function UserInfo({ userInfo, onLogout }: UserInfoProps) {
  const { message } = App.useApp()
  const { styles, theme } = useStyles()
  const navigate = useNavigate()
  const menuStore = useMenuStore()
  const { menuType, subMenuCollapse } = menuStore
  const [configPanelOpen, setConfigPanelOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const displayName = userInfo?.nickName || userInfo?.username || '未登录'
  const displayEmail = userInfo?.email || ''
  const avatarSrc = userInfo?.avatar
    ? userInfo.avatar
    : `https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${userInfo?.username}`

  const handleLogout = async () => {
    setPopoverOpen(false)
    setLoggingOut(true)
    try {
      if (onLogout) {
        await onLogout()
      }
      message.success('已退出登录')
      navigate('/login', { replace: true })
    }
    catch {
      message.error('退出失败，请重试')
    }
    finally {
      setLoggingOut(false)
    }
  }

  const content = (
    <div className={styles.menuContainer}>
      <div className={styles.menuHeader}>
        <div className={styles.avatarRow}>
          <Avatar size={36} src={avatarSrc} />
          <div className={styles.userText}>
            <div className={styles.userName}>{displayName}</div>
            {displayEmail && <div className={styles.userSub}>{displayEmail}</div>}
          </div>
        </div>
      </div>
      <Divider style={{ margin: 0 }} />
      <div className={styles.menuContent}>
        <div className={styles.menuItem} onClick={() => { setPopoverOpen(false) }}>
          <span className={styles.menuItemIcon}><HomeFilled /></span>
          <span>用户信息</span>
        </div>
        <div
          className={styles.menuItem}
          onClick={() => {
            setPopoverOpen(false)
            setConfigPanelOpen(true)
          }}
        >
          <span className={styles.menuItemIcon}><SettingFilled /></span>
          <span>偏好设置</span>
        </div>
      </div>
      <Divider style={{ margin: 0 }} />
      <div className={styles.menuContent}>
        <div className={styles.menuItem} onClick={() => { }}>
          <span className={styles.menuItemIcon}><ToolFilled /></span>
          <span>快捷键</span>
        </div>
        <div
          className={styles.menuItemDanger}
          onClick={handleLogout}
          style={{ opacity: loggingOut ? 0.5 : 1, pointerEvents: loggingOut ? 'none' : 'auto' }}
        >
          <span className={styles.menuItemIcon}><LogoutOutlined /></span>
          <span>{loggingOut ? '退出中...' : '退出登录'}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.userInfo}>
      <Popover
        arrow={false}
        styles={{ container: { padding: 0 } }}
        placement="rightBottom"
        content={content}
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
      >
        {menuType === 'simple'
          ? (subMenuCollapse
              ? <div className={styles.avatar}>
                  <Avatar size={28} src={avatarSrc} />
                </div>
              : <div className={styles.avatar2}>
                  <div className={'flex-center'} style={{ gap: theme.marginXS }}>
                    <Avatar size={28} src={avatarSrc} />
                    <div style={{ color: theme.colorText }}>{displayName}</div>
                  </div>
                  <RightOutlined style={{ color: theme.colorIcon }} />
                </div>)
          : <div className={styles.avatar}>
              <Avatar size={32} src={avatarSrc} />
            </div>}
      </Popover>
      <ConfigPanel
        isDev={false}
        open={configPanelOpen}
        onClose={() => setConfigPanelOpen(false)}
      />
    </div>
  )
}