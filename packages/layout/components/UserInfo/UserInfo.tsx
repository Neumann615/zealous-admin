import { HomeFilled, LogoutOutlined, MessageFilled, RightOutlined, SettingFilled, ToolFilled } from '@ant-design/icons'
import { App, Avatar, Divider, Popover } from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { useLogout } from '../../hooks/useAuth'
import { useT } from '../../hooks/useT'
import { useMenuStore, useUserStore } from '../../store/index'
import { ConfigPanel } from '../ConfigPanel/ConfigPanel'
import { FeedbackModal } from './FeedbackModal'
import { ProfileModal } from './ProfileModal'
import { ShortcutsModal } from './ShortcutsModal'

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

export function UserInfo() {
  const { message } = App.useApp()
  const { styles, theme } = useStyles()
  const t = useT()
  const menuStore = useMenuStore()
  const { menuType, subMenuCollapse } = menuStore
  const [configPanelOpen, setConfigPanelOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { logout } = useLogout()

  const userInfo = useUserStore(state => state.userInfo)
  const displayName = userInfo?.nickName || userInfo?.username || t('userInfo.notLoggedIn')
  const displayEmail = userInfo?.email || ''
  const avatarSrc = userInfo?.icon
    ? userInfo.icon
    : `https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${userInfo?.username}`

  const handleLogout = async () => {
    setPopoverOpen(false)
    setLoggingOut(true)
    try {
      await logout()
    }
    catch {
      message.error(t('userInfo.logoutFailed'))
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
        <div
          className={styles.menuItem}
          onClick={() => {
            setPopoverOpen(false)
            setProfileOpen(true)
          }}
        >
          <span className={styles.menuItemIcon}><HomeFilled /></span>
          <span>{t('userInfo.profile')}</span>
        </div>
        <div
          className={styles.menuItem}
          onClick={() => {
            setPopoverOpen(false)
            setConfigPanelOpen(true)
          }}
        >
          <span className={styles.menuItemIcon}><SettingFilled /></span>
          <span>{t('userInfo.preferences')}</span>
        </div>
        <div
          className={styles.menuItem}
          onClick={() => {
            setPopoverOpen(false)
            setFeedbackOpen(true)
          }}
        >
          <span className={styles.menuItemIcon}><MessageFilled /></span>
          <span>{t('userInfo.feedback')}</span>
        </div>
      </div>
      <Divider style={{ margin: 0 }} />
      <div className={styles.menuContent}>
        <div
          className={styles.menuItem}
          onClick={() => {
            setPopoverOpen(false)
            setShortcutsOpen(true)
          }}
        >
          <span className={styles.menuItemIcon}><ToolFilled /></span>
          <span>{t('userInfo.shortcuts')}</span>
        </div>
        <div
          className={styles.menuItemDanger}
          onClick={handleLogout}
          style={{ opacity: loggingOut ? 0.5 : 1, pointerEvents: loggingOut ? 'none' : 'auto' }}
        >
          <span className={styles.menuItemIcon}><LogoutOutlined /></span>
          <span>{loggingOut ? t('userInfo.loggingOut') : t('userInfo.logout')}</span>
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
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  )
}
