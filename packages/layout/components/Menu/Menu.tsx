import type { MenuItem } from '../../types/config'
import type { UserInfoData } from '../UserInfo/UserInfo'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { ZaShinyText } from '@zealous-admin/components/index'
import { Menu as AntdMenu, Flex } from 'antd'
import { createStyles } from 'antd-style'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useControlTab } from '../../hooks/useControlTab'
import { useAppStore, useMenuStore } from '../../store/index'
import { Logo } from '../Logo/Logo'
import { MenuIcon } from '../MenuIcon/MenuIcon'
import { UserInfo } from '../UserInfo/UserInfo'

const useStyles = createStyles(({ token, css }) => ({
  asideMenu: css`
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background-color: ${token.colorBgBase};
    transition: width 0.3s;
    border-right: 1px solid ${token.colorBorderSecondary};
    overflow: hidden;
  `,
  asideMenuHeader: css`
    display: flex;
    align-items: center;
    boxsizing: border-box;
    padding: ${token.paddingMD}px;
    height: 48px;
    gap: ${token.paddingXS}px;
    justify-content: center;
  `,
  asideMenuLogo: {
    width: '38px',
    height: '38px',
    display: 'block',
    border: 'none',
  },
  asideMenuTitle: {
    textAlign: 'center',
    flex: 1,
  },
  asideMenuContent: {
    flex: 1,
    height: '1px',
    width: '100%',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  asideMenuFooter: {
    padding: `${token.paddingSM}px`,
    boxSizing: 'border-box',
  },
  asideMenuFooterModule: css`
    width: auto;
    height: auto;
    box-sizing: border-box;
    padding: ${token.paddingXS}px;
    background-color: ${token.colorFillContent};
    border-radius: ${token.borderRadiusSM}px;
    cursor: pointer;
    transition: all 0.3s;
    color: ${token.colorText};

    :hover {
      transition: all 0.3s;
      background-color: ${token.colorFillContentHover};
    }
  `,
}))

interface MenuProps {
  userInfo?: UserInfoData
  onLogout?: () => void
}

export function Menu({ userInfo, onLogout }: MenuProps) {
  const { styles, theme } = useStyles()
  const {
    menuData,
    subMenuCollapse,
    mainNavData,
    menuType,
    menuCurrentKeys,
    subMenuUniqueOpened,
    changeSubMenuCollapse,
    isEnableSubMenuCollapse,
    openKeys,
    setOpenKeys,
    setMobileDrawerOpen,
  } = useMenuStore(
    useShallow((state: any) => ({
      menuData: state.menuData,
      subMenuCollapse: state.subMenuCollapse,
      mainNavData: state.mainNavData,
      menuType: state.menuType,
      menuCurrentKeys: state.menuCurrentKeys,
      subMenuUniqueOpened: state.subMenuUniqueOpened,
      changeSubMenuCollapse: state.changeSubMenuCollapse,
      isEnableSubMenuCollapse: state.isEnableSubMenuCollapse,
      openKeys: state.openKeys,
      setOpenKeys: state.setOpenKeys,
      mainNavCurrentKeys: state.mainNavCurrentKeys,
      setMobileDrawerOpen: state.setMobileDrawerOpen,
    })),
  )
  const { name } = useAppStore(
    useShallow((state: any) => ({
      name: state.name,
    })),
  )
  const { openTab } = useControlTab()

  // 移动端：菜单项点击后关闭抽屉
  function handleMenuClick(v: any) {
    openTab(v)
    setMobileDrawerOpen(false)
  }

  const rootSubmenuKeys = useMemo(() => {
    return menuData
      .filter((item: any) => {
        return item.children?.length
      })
      .map((item1: MenuItem) => item1.key)
  }, [menuData])

  function generatorMenuData(v: any) {
    for (let i = 0; i < v.length; i++) {
      v[i].icon = v[i].icon || v[i].selectIcon
        ? (
            <MenuIcon
              size={19}
              color={
                menuCurrentKeys[menuCurrentKeys.length - 1] === v[i].key
                  ? theme.colorWhite
                  : ''
              }
              icon={v[i].icon || ''}
              selectIcon={v[i].selectIcon}
              isActive={menuCurrentKeys.includes(v[i].key)}
              gap={theme.marginSM}
            >
            </MenuIcon>
          )
        : null
      if (v[i].children?.length) {
        generatorMenuData(v[i].children)
      }
    }
  }

  const renderMenuData = useMemo(() => {
    const a = JSON.parse(
      JSON.stringify(menuType === 'simple' ? mainNavData : menuData),
    )
    generatorMenuData(a)
    return a
  }, [menuData, mainNavData, menuType, theme, menuCurrentKeys])

  function onOpenChange(keys: string[]) {
    const latestOpenKey = keys.find(
      (key: string) => !openKeys.includes(key),
    )
    if (latestOpenKey && !rootSubmenuKeys.includes(latestOpenKey!)) {
      setOpenKeys(keys)
    }
    else {
      // 精简模式下主导航不限制手风琴
      const isAccordion = subMenuUniqueOpened && menuType !== 'simple'
      setOpenKeys(
        isAccordion ? (latestOpenKey ? [latestOpenKey] : []) : keys,
      )
    }
  }

  return (
    <div
      className={styles.asideMenu}
      style={{ width: menuData?.length ? (subMenuCollapse ? 64 : 230) : 0 }}
    >
      {!subMenuCollapse
        ? (
            ['simple', 'side', 'only-side'].includes(menuType)
              ? (
                  <div className={styles.asideMenuHeader}>
                    {menuType === 'simple'
                      ? (
                          <>
                            <Logo size={26} />
                            <div className="text-ellipsis">
                              <ZaShinyText text={`${name}`} />
                            </div>
                          </>
                        )
                      : null}
                    {['side', 'only-side'].includes(menuType)
                      ? (
                          <div className={`${styles.asideMenuTitle} text-ellipsis`}>
                            <ZaShinyText text={name} />
                          </div>
                        )
                      : null}
                  </div>
                )
              : null
          )
        : null}
      <div className={styles.asideMenuContent}>
        <AntdMenu
          openKeys={openKeys}
          selectedKeys={menuCurrentKeys}
          inlineCollapsed={subMenuCollapse}
          mode="inline"
          items={renderMenuData}
          onOpenChange={onOpenChange}
          onClick={handleMenuClick}
        />
      </div>
      {isEnableSubMenuCollapse
        ? (
            <Flex
              className={styles.asideMenuFooter}
              style={{
                padding: ['simple'].includes(menuType) ? `0 ${theme.paddingSM}px` : `${theme.paddingSM}px`,
              }}
              align="center"
              justify={subMenuCollapse ? 'center' : 'flex-end'}
            >
              <div className={styles.asideMenuFooterModule}>
                {subMenuCollapse
                  ? (
                      <MenuUnfoldOutlined
                        onClick={changeSubMenuCollapse}
                        style={{
                          fontSize: theme.fontSizeXL,
                        }}
                      >
                      </MenuUnfoldOutlined>
                    )
                  : (
                      <MenuFoldOutlined
                        onClick={changeSubMenuCollapse}
                        style={{
                          fontSize: theme.fontSizeXL,
                        }}
                      >
                      </MenuFoldOutlined>
                    )}
              </div>
            </Flex>
          )
        : null}
      { ['simple'].includes(menuType) ? <UserInfo userInfo={userInfo} onLogout={onLogout}></UserInfo> : null}
    </div>
  )
}
