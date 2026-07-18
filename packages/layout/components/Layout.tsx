import type { UserInfoData } from './UserInfo/UserInfo'
import { ConfigProvider } from 'antd'
import { createStyles } from 'antd-style'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useControlTab } from '../hooks/useControlTab'
import { useAppStore, useMenuStore, usePageStore, useTopBarStore } from '../store/index'
import { Content } from './Content/Content'
import { Footer } from './Footer/Footer'
import { GlobalProgress } from './GlobalProgress/GlobalProgress'
import { Header } from './Header/Header'
import { MainNav } from './MainNav/MainNav'
import { Menu } from './Menu/Menu'
import { MobileBlock } from './MobileBlock/MobileBlock'
import { Setting } from './Setting/Setting'
import 'animate.css'
import './reset.css'

const useStyles = createStyles(({ token }) => ({
  // 侧边栏模式布局
  layoutContainerStyle: {
    display: 'flex',
    width: '100%',
    height: '100vh',
  },
  layoutSiderStyle: {
    width: 'auto',
    display: 'flex',
  },
  layoutMainStyle: {
    flex: 1,
    width: '1px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  // 顶部模式布局
  headContainer: {
    display: 'flex',
    width: '100%',
    height: '100vh',
    flexDirection: 'column',
  },
  headTop: {
    width: '100%',
    height: 'auto',
  },
  headContent: {
    flex: 1,
    height: '1px',
    display: 'flex',
  },
  headContentMenu: {
    width: 'auto',
    height: '100%',
    backgroundColor: token.colorBgContainer,
  },
  headContentMain: {
    height: '100%',
    flex: 1,
    width: '1px',
    display: 'flex',
    flexDirection: 'column',
  },
  onlyHeadContent: {
    flex: 1,
    height: '1px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  // 精简模式布局
  singleMain: {
    width: '100%',
    height: '100vh',
    display: 'flex',
  },
  singleMainLeft: {
    width: 'auto',
    height: '100%',
    backgroundColor: token.colorBgContainer,
  },
  singleMainContent: {
    flex: 1,
    width: '1px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  // 外部居中布局
  outsideCenterBg: {
    width: '100%',
    height: '100vh',
    backgroundColor: token.colorBgBase,
    display: 'flex',
    justifyContent: 'center',
  },
  outsideCenterWrapper: {
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    boxSizing: 'border-box',
    borderLeft: `1px solid ${token.colorBorderSecondary}`,
    borderRight: `1px solid ${token.colorBorderSecondary}`,
  },
}))

interface LayoutProps {
  userInfo?: UserInfoData
  onLogout?: () => void
}

export function Layout({ userInfo, onLogout }: LayoutProps) {
  const { theme, styles } = useStyles()
  const { menuType, menuCurrentKeys, openKeys, mainNavCurrentKeys } = useMenuStore()
  const globalProgressLoading = usePageStore(state => state.globalProgressLoading)
  const { layout: layoutConfig, name: appName } = useAppStore()
  const { nowTab } = useTopBarStore()
  const { syncTabFromUrl } = useControlTab()
  const location = useLocation()

  // 浏览器后退/前进时同步 tab 与面包屑
  useEffect(() => {
    syncTabFromUrl(location.pathname)
  }, [location.pathname])

  // 动态网站标题：切换路由时映射到菜单名称
  useEffect(() => {
    if (nowTab?.title) {
      document.title = `${nowTab.title} - ${appName}`
    }
    else {
      document.title = appName
    }
  }, [nowTab?.title])

  function renderLayout() {
    if (menuType === 'side') {
      return (
        <div className={styles.layoutContainerStyle}>
          <div className={styles.layoutSiderStyle}>
            <MainNav userInfo={userInfo} onLogout={onLogout}></MainNav>
            <Menu></Menu>
          </div>
          <div className={styles.layoutMainStyle}>
            <Header></Header>
            <Content></Content>
            <Footer></Footer>
          </div>
        </div>
      )
    }
    else if (menuType === 'only-side') {
      return (
        <div className={styles.layoutContainerStyle}>
          <div className={styles.layoutSiderStyle}>
            <MainNav userInfo={userInfo} onLogout={onLogout}></MainNav>
          </div>
          <div className={styles.layoutMainStyle}>
            <Header></Header>
            <Content></Content>
            <Footer></Footer>
          </div>
        </div>
      )
    }
    else if (menuType === 'head') {
      return (
        <div className={styles.headContainer}>
          <div className={styles.headTop}>
            <MainNav userInfo={userInfo} onLogout={onLogout}></MainNav>
          </div>
          <div className={styles.headContent}>
            <div className={styles.headContentMenu}>
              <Menu></Menu>
            </div>
            <div className={styles.headContentMain}>
              <Header></Header>
              <Content></Content>
              <Footer></Footer>
            </div>
          </div>
        </div>
      )
    }
    else if (menuType === 'only-head') {
      return (
        <div className={styles.headContainer}>
          <div className={styles.headTop}>
            <MainNav userInfo={userInfo} onLogout={onLogout}></MainNav>
          </div>
          <div className={styles.onlyHeadContent}>
            <Header></Header>
            <Content></Content>
            <Footer></Footer>
          </div>
        </div>
      )
    }
    else if (menuType === 'simple') {
      return (
        <div className={styles.singleMain}>
          <div className={styles.singleMainLeft}>
            <Menu userInfo={userInfo} onLogout={onLogout}></Menu>
          </div>
          <div className={styles.singleMainContent}>
            <Header></Header>
            <Content></Content>
            <Footer></Footer>
          </div>
        </div>
      )
    }
  }

  useEffect(() => {
    // console.log('z-menuCurrentKeys', menuCurrentKeys)
    // console.log('z-openKeys', openKeys)
    // console.log('z-mainNavCurrentKeys', mainNavCurrentKeys)
  }, [menuCurrentKeys, openKeys, mainNavCurrentKeys])

  const isOutsideCenter = layoutConfig.isCenter && layoutConfig.layoutScope === 'outside'

  const layoutContent = renderLayout()

  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            itemBg: theme.colorBgBase,
            itemSelectedBg: theme.colorPrimary,
            itemSelectedColor: theme.colorWhite,
            subMenuItemBg: theme.colorBgBase,
            subMenuItemBorderRadius: theme.borderRadiusLG,
            itemHeight: 48,
            collapsedWidth: 64,
            dropdownWidth: 180,
          },
        },
      }}
    >
      <MobileBlock>
        {isOutsideCenter
          ? (
              <div className={styles.outsideCenterBg}>
                <div
                  className={styles.outsideCenterWrapper}
                  style={{ maxWidth: layoutConfig.width, width: '100%' }}
                >
                  {layoutContent}
                </div>
              </div>
            )
          : layoutContent}
        <Setting></Setting>
        <GlobalProgress
          isAnimating={globalProgressLoading}
          key={location.key}
        >
        </GlobalProgress>
      </MobileBlock>
    </ConfigProvider>
  )
}
