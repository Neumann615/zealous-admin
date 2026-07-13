import type { MenuData, MenuItem } from '../../types/config'
import type { UserInfoData } from '../UserInfo/UserInfo'
import { ZShinyText } from '@zealous-admin/components/index'
import { Menu } from 'antd'
import { createStyles } from 'antd-style'
import { useShallow } from 'zustand/react/shallow'
import { useControlTab } from '../../hooks/useControlTab'
import { useAppStore, useMenuStore } from '../../store/index'
import { Logo } from '../Logo/Logo'
import { MenuIcon } from '../MenuIcon/MenuIcon'
import { UserInfo } from '../UserInfo/UserInfo'

const useStyles = createStyles(({ token, css }) => ({
  asideBar: {
    width: '84px',
    height: '100%',
    boxSizing: 'border-box',
    backgroundColor: token.colorBgBase,
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${token.colorBorderSecondary}`,
    padding: `0 ${token.paddingXXS}px`,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: token.paddingXS,
  },
  mainNavSideSubMenu: css`
    .ant-menu-submenu-selected > .ant-menu-submenu-title {
      background-color: ${token.colorPrimary} !important;
      color: ${token.colorWhite} !important;
    }
    .ant-menu-submenu-title {
      padding: ${token.paddingSM}px;
      height: auto !important;
      position: relative;
      overflow: visible;
    }
    .ant-menu-title-content {
      text-align: center;
      line-height: 1.2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: ${token.paddingXS}px;
      font-size: 14px;
    }
    .ant-menu-submenu-arrow {
      display: none;
    }
  `,
  mainNavTopSubMenu: css`
   .ant-menu-submenu-selected > .ant-menu-submenu-title {
      background-color: ${token.colorPrimary} !important;
      color: ${token.colorWhite} !important;
    }
    .ant-menu-submenu-title {
      padding: ${token.paddingSM}px;
      height: auto !important;
      position: relative;
      overflow: visible;
      margin-right: ${token.marginSM}px;
    }
    .ant-menu-title-content {
      text-align: center;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: ${token.paddingXS}px;
      font-size: 14px;
    }
    .ant-menu-submenu-arrow {
      display: none;
    }
  `,
  mainNavPopupSubMenu: css`
    .ant-menu-submenu-selected > .ant-menu-submenu-title {
      background-color: ${token.colorPrimary} !important;
      color: ${token.colorWhite} !important;
    }
  `,
  TopAsideBar: {
    width: '100%',
    height: '60px',
    padding: `0 ${token.paddingSM}`,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: token.colorBgBase,
    boxSizing: 'border-box',
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  TopLogoContainer: {
    width: '36px',
    height: '36px',
  },
  activeDot: css`
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: ${token.colorPrimary};
    border: 1px solid ${token.colorWhite};
    position: absolute;
    top: 50%;
    left: 0;
    transform: translate(-50%, -50%);
    z-index: 999;
  `,
  activeLine: css`
    width: 8px;
    height: 35%;
    border-radius: 99px;
    background-color: ${token.colorPrimary};
    border: 2px solid ${token.colorWhite};
    position: absolute;
    top: 50%;
    left: 0;
    transform: translate(-50%, -50%);
    z-index: 999;
  `,
  activeArrow: css`
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 7px solid ${token.colorWhite};
    position: absolute;
    right: 0px;
    top: 50%;
    transform: translateY(-50%);
  `,
  activeWrapper: css`
    position: relative;
  `,
}))

interface MainNavProps {
  userInfo?: UserInfoData
  onLogout?: () => void
}

export function MainNav({ userInfo, onLogout }: MainNavProps) {
  const { styles, theme } = useStyles()
  const { mainNavData, menuType, mainNavCurrentKeys, menuActiveStyle }
    = useMenuStore(
      useShallow((state: any) => ({
        mainNavData: state.mainNavData,
        menuType: state.menuType,
        mainNavCurrentKeys: state.mainNavCurrentKeys,
        menuActiveStyle: state.menuActiveStyle,
      })),
    )
  const { name } = useAppStore(
    useShallow((state: any) => ({
      name: state.name,
    })),
  )
  const { openTab } = useControlTab()

  function renderMenuActiveDom() {
    switch (menuActiveStyle) {
      case 'dot':
        return <div className={styles.activeDot} />
      case 'line':
        return <div className={styles.activeLine} />
      case 'arrow':
        return <div className={styles.activeArrow} />
      case 'none':
      default:
        return null
    }
  }

  // 递归渲染menu数组,根据是否有子节点判断类d是不是submenu,记录
  function _generatorMenuItem(menuData: MenuData): any[] {
    return menuData.map((item: MenuItem) => {
      const isActive = mainNavCurrentKeys.includes(item.key)
      if (item.children?.length) {
        return {
          key: item.key,
          label: item.label,
          icon: item.icon ? <MenuIcon icon={item.icon} color={isActive ? theme.colorWhite : ''}></MenuIcon> : null,
          children: _generatorMenuItem(item.children),
        }
      }
      else {
        return {
          key: item.key,
          label: item.label,
          icon: item.icon ? <MenuIcon icon={item.icon} color={isActive ? theme.colorWhite : ''}></MenuIcon> : null,
          onClick: () => openTab(item),
        }
      }
    })
  }

  function generatorMenuItem(
    menuData: any,
    isRenderChildren: boolean = true,
  ): any[] {
    return menuData.map((item: any, index: number) => {
      const isActive = mainNavCurrentKeys.includes(item.key)
      const activeDom = isActive ? renderMenuActiveDom() : null
      const labelContent = (
        <>
          <MenuIcon
            icon={item.icon}
            color={isActive ? theme.colorWhite : ''}
            size={20}
          >
          </MenuIcon>
          <div>{item.label}</div>
          {activeDom}
        </>
      )

      if (item.children?.length) {
        return {
          key: item.key,
          label: labelContent,
          popupClassName: styles.mainNavPopupSubMenu,
          popupOffset: menuType === 'only-head' ? [-70, 74] : [0, 0],
          children: isRenderChildren
            ? _generatorMenuItem(item.children)
            : undefined,
          onClick: () => {
            if (menuType === 'side' || menuType === 'head') {
              useMenuStore.setState(() => ({
                menuData: mainNavData[index].children,
                mainNavCurrentKeys: [item.key],
              }))
            }
          },
        }
      }
      else {
        return {
          key: item.key,
          label: labelContent,
          onClick: () => openTab(item),
        }
      }
    })
  }

  return (
    <>
      {menuType === 'side'
        ? (
            <div className={styles.asideBar}>
              <div className={styles.logoContainer}>
                <Logo />
              </div>
              <Menu
                styles={{
                  root: {
                    flex: 1,
                    overflowY: 'scroll',
                    scrollbarWidth: 'none',
                  },
                  item: {
                    padding: theme.paddingSM,
                    height: 'auto',
                    position: 'relative',
                    overflow: 'visible',
                  },
                  itemContent: {
                    textAlign: 'center',
                    lineHeight: 1.2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.paddingXS,
                    fontSize: 14,
                  },
                }}
                selectedKeys={mainNavCurrentKeys}
                items={generatorMenuItem(mainNavData, false)}
              />
              <UserInfo userInfo={userInfo} onLogout={onLogout} />
            </div>
          )
        : null}
      {menuType === 'only-side'
        ? (
            <div className={`${styles.asideBar} ${styles.mainNavSideSubMenu}`}>
              <div className={styles.logoContainer}>
                <Logo />
              </div>
              <Menu
                styles={{
                  root: {
                    flex: 1,
                    overflowY: 'scroll',
                    scrollbarWidth: 'none',
                  },
                  item: {
                    padding: theme.paddingSM,
                    height: 'auto',
                    position: 'relative',
                    overflow: 'visible',
                  },
                  itemContent: {
                    textAlign: 'center',
                    lineHeight: 1.2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.paddingXS,
                    fontSize: 14,
                  },
                }}
                selectedKeys={mainNavCurrentKeys}
                items={generatorMenuItem(mainNavData, true)}
              />
              <UserInfo userInfo={userInfo} onLogout={onLogout} />
            </div>
          )
        : null}
      {menuType === 'head'
        ? (
            <div className={styles.TopAsideBar}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className={styles.logoContainer}>
                  <Logo />
                </div>
                <ZShinyText text={name} />
              </div>
              <Menu
                styles={{
                  root: {
                    flex: 1,
                    overflowX: 'scroll',
                    scrollbarWidth: 'none',
                    padding: `0 ${theme.paddingMD}px`,
                    display: 'flex',
                  },
                  item: {
                    padding: theme.paddingSM,
                    height: 'auto',
                    position: 'relative',
                    overflow: 'visible',
                    width: 'auto',
                    marginRight: theme.marginSM,
                  },
                  itemContent: {
                    textAlign: 'center',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.paddingXS,
                    fontSize: 14,
                  },
                }}
                selectedKeys={mainNavCurrentKeys}
                items={generatorMenuItem(mainNavData, false)}
              />
              <UserInfo userInfo={userInfo} onLogout={onLogout} />
            </div>
          )
        : null}
      {menuType === 'only-head'
        ? (
            <div className={`${styles.TopAsideBar} ${styles.mainNavTopSubMenu}`}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className={styles.logoContainer}>
                  <Logo />
                </div>
                <ZShinyText text={name} />
              </div>
              <Menu
                styles={{
                  root: {
                    flex: 1,
                    overflowX: 'scroll',
                    scrollbarWidth: 'none',
                    display: 'flex',
                    padding: `0 ${theme.paddingMD}px`,
                  },
                  item: {
                    padding: theme.paddingSM,
                    height: 'auto',
                    position: 'relative',
                    overflow: 'visible',
                    width: 'auto',
                    marginRight: theme.marginSM,
                  },
                  itemContent: {
                    textAlign: 'center',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.paddingXS,
                    fontSize: 14,
                  },
                }}
                selectedKeys={mainNavCurrentKeys}
                items={generatorMenuItem(mainNavData, true)}
              />
              <UserInfo userInfo={userInfo} onLogout={onLogout} />
            </div>
          )
        : null}
    </>
  )
}
