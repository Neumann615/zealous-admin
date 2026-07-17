import type { ExpireMode, MenuType } from '../../types/config'
import {
  BgColorsOutlined,
  CopyOutlined,
  FullscreenOutlined,
  MoonOutlined,
  ReloadOutlined,
  SearchOutlined,
  SunOutlined,
  SyncOutlined,
  TranslationOutlined,
} from '@ant-design/icons'
import { useInterval, useUnmount } from 'ahooks'
import { Alert, App, Button, Card, Col, Input, Modal, Radio, Row, Segmented, Select, Slider, Switch, Tooltip } from 'antd'
import { createStyles } from 'antd-style'
import { useEffect, useRef, useState } from 'react'
// @ts-ignore
import { CSSTransition } from 'react-transition-group'
import _defaultSetting from '../../defaultSetting'
import {
  useAppStore,
  useMenuStore,
  usePageStore,
  useThemeStore,
  useTopBarStore,
} from '../../store/index'
import {
  breadcrumbStyleList,
  expireModeList,
  layoutScopeList,
  menuTypeList,
  mergeAttribute,
  tabBarDblClickEventTypeList,
  tabBarStyleList,
  tabBarWidthTypeList,
  themeColorList,
  topBarPositionList,
  transitionTypeList,
} from '../../utils/index'

const useStyles = createStyles(({ token, css }) => {
  return {
    configContainer: css`
      width: 100%;
      display: flex;
      flex-direction: column;
      background-color: ${token.colorBgContainerDisabled};
    `,
    configContent: css`
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 16px;
      display: flex;
      gap: 16px;
    `,
    configColumn: css`
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    `,
    configItem: css`
      line-height: 30px;
      min-height: 30px;
    `,
    cardContent: css`
      display: flex;
      flex-direction: column;
      gap: 12px;
    `,
    moduleTitle: css`
      font-size: 15px;
      font-weight: 500;
      color: ${token.colorText};
      margin-bottom: 8px;
    `,
    moduleLable: css`
      font-size: 15px;
      font-weight: 500;
      color: ${token.colorText};
    `,
    menuType: css`
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
    `,
    themeItem: css`
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
    `,
    checkedColor: css`
      width: 24px;
      height: 16px;
      border-radius: 50%;
      transform: rotate(-30deg);
      box-sizing: border-box;
      transition: all 0.25s;
    `,
    unCheckedColor: css`
      width: 16px;
      height: 16px;
      border-radius: 50%;
      transition: all 0.25s;
    `,
    checkedIcon: css`
      position: absolute;
      bottom: 0px;
      right: 0px;
      width: 100%;
      height: 100%;
      border: 4px solid ${token.colorPrimaryBorder};
      border-radius: ${token.borderRadius}px;
      transition: all 0.25s;
    `,
    unCheckedIcon: css`
      position: absolute;
      bottom: 0px;
      right: 0px;
      width: 100%;
      height: 100%;
      border: 1px solid ${token.colorBorderSecondary};
      border-radius: ${token.borderRadius}px;
      pointer-events: none;
      transition: all 0.25s;
    `,
    transitionContainer: css`
      width: 100%;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${token.boxShadow};
      box-sizing: border-box;
      position: relative;
      padding: 6px;
      border-radius: ${token.borderRadius}px;
      cursor: pointer;
    `,
    transitionContent: css`
      width: 100%;
      height: 100%;
      border-radius: ${token.borderRadius}px;
      background-color: ${token.colorPrimaryBg};
    `,
    layoutContainer: css`
      width: 100%;
      height: 78px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${token.boxShadow};
      box-sizing: border-box;
      padding: 16px;
      border-radius: ${token.borderRadius}px;
      position: relative;
      cursor: pointer;
    `,
    layoutContent: css`
      width: 100%;
      height: 100%;
      border-radius: ${token.borderRadiusSM}px;
      overflow: hidden;
    `,
    appModuleContainer: css`
      width: 100%;
      border: 1px solid ${token.colorBorderSecondary};
      box-sizing: border-box;
      padding: 16px;
      padding-top: 48px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      border-radius: ${token.borderRadius}px;
    `,
    appModuleTitle: css`
      position: absolute;
      top: 0px;
      left: 0px;
      padding: 8px 16px;
      display: flex;
      font-size: 16px;
      font-weight: 500;
      color: ${token.colorTextHeading};
      background-color: ${token.colorBgContainerDisabled};
      border-bottom-right-radius: ${token.borderRadius}px;
    `,
    resetModal: css`
      .ant-modal-body {
        padding: 0px;
        max-height: 70vh;
        overflow-y: auto;
      }
      .ant-modal-header {
        padding: 16px;
        margin-bottom: 0;
      }
      .ant-modal-container {
        padding: 0px;
      }
      .ant-modal-footer {
        margin: 0;
        padding: 12px 16px;
      }
      .ant-card-head {
        padding: 6px 16px;
        background-color: ${token.colorBgElevated};
        color: ${token.colorTextSecondary};
        font-size: 15px;
        font-weight: 500;
      }
      .ant-card-body {
        padding: 12px 16px;
      }
    `,
    customHeader: css`
      display: flex;
      align-items: center;
      gap: 8px;
      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: ${token.colorTextHeading};
      }
      p {
        margin: 0;
        font-size: 13px;
        color: ${token.colorTextDescription};
      }
    `,
    customFooter: css`
      width: 100%;
    `,
  }
})

interface ConfigPanelProps {
  isDev?: boolean
  open: boolean
  onClose: () => void
}

export function ConfigPanel({ open, onClose, isDev = true }: ConfigPanelProps) {
  const { message } = App.useApp()
  const appStore = useAppStore()
  const menuStore = useMenuStore()
  const themeStore = useThemeStore()
  const pageStore = usePageStore()
  const topBarStore = useTopBarStore()
  const { styles, theme } = useStyles()

  const mergeTopBar = (storeTopBar: any) => {
    const merged = mergeAttribute(_defaultSetting.topBar, storeTopBar)
    merged.toolbar = {
      ..._defaultSetting.topBar.toolbar,
      ...storeTopBar.toolbar,
    }
    return merged
  }

  const handleCopyConfig = async () => {
    const configString = `import type { LayoutConfig } from './types/config'

const defaultSetting: LayoutConfig = ${JSON.stringify(defaultSetting, null, 2)}

export default defaultSetting`
    try {
      await navigator.clipboard.writeText(configString)
      message.success('配置已复制到剪贴板')
    }
    catch {
      const textArea = document.createElement('textarea')
      textArea.value = configString
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      message.success('配置已复制到剪贴板')
    }
  }

  const [defaultSetting, setDefaultSetting] = useState({
    app: mergeAttribute(_defaultSetting.app, appStore),
    theme: mergeAttribute(_defaultSetting.theme, themeStore),
    menu: mergeAttribute(_defaultSetting.menu, menuStore),
    page: mergeAttribute(_defaultSetting.page, pageStore),
    topBar: mergeTopBar(topBarStore),
  })
  const [isTransition, setIsTransition] = useState(false)
  const transitionRef1 = useRef<HTMLDivElement>(null)
  const transitionRef2 = useRef<HTMLDivElement>(null)
  const transitionRef3 = useRef<HTMLDivElement>(null)
  const transitionRef4 = useRef<HTMLDivElement>(null)
  const transitionRef5 = useRef<HTMLDivElement>(null)
  const transitionRefs = [
    transitionRef1,
    transitionRef2,
    transitionRef3,
    transitionRef4,
    transitionRef5,
  ]

  useEffect(() => {
    useAppStore.setState(defaultSetting.app)
    useThemeStore.setState(defaultSetting.theme)
    useMenuStore.setState(defaultSetting.menu)
    usePageStore.setState(defaultSetting.page)
    useTopBarStore.setState(defaultSetting.topBar)
  }, [defaultSetting])

  useEffect(() => {
    if (open) {
      setDefaultSetting({
        app: mergeAttribute(_defaultSetting.app, appStore),
        theme: mergeAttribute(_defaultSetting.theme, themeStore),
        menu: mergeAttribute(_defaultSetting.menu, menuStore),
        page: mergeAttribute(_defaultSetting.page, pageStore),
        topBar: mergeTopBar(topBarStore),
      })
    }
  }, [open])

  const clearInterval = useInterval(
    () => {
      setIsTransition(!isTransition)
    },
    3000,
    { immediate: true },
  )

  useUnmount(() => {
    clearInterval()
  })

  function renderLayout(type: MenuType) {
    if (type === 'side') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: 4 }}>
          <div
            style={{
              width: '20%',
              height: '100%',
              backgroundColor: theme.colorPrimary,
            }}
          >
          </div>
          <div
            style={{
              width: '20%',
              height: '100%',
              backgroundColor: theme.colorPrimaryBgHover,
            }}
          >
          </div>
          <div
            style={{
              flex: 1,
              height: '100%',
              border: `2px dashed ${theme.colorPrimaryBorder}`,
              backgroundColor: theme.colorPrimaryBg,
            }}
          >
          </div>
        </div>
      )
    }
    else if (type === 'only-side') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: 4 }}>
          <div
            style={{
              width: '20%',
              height: '100%',
              backgroundColor: theme.colorPrimary,
            }}
          >
          </div>
          <div
            style={{
              flex: 1,
              height: '100%',
              border: `2px dashed ${theme.colorPrimaryBorder}`,
              backgroundColor: theme.colorPrimaryBg,
            }}
          >
          </div>
        </div>
      )
    }
    else if (type === 'head') {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            gap: 4,
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '23%',
              backgroundColor: theme.colorPrimary,
            }}
          >
          </div>
          <div style={{ flex: 1, height: '1px', display: 'flex', gap: 4 }}>
            <div
              style={{
                width: '20%',
                height: '100%',
                backgroundColor: theme.colorPrimaryBgHover,
              }}
            >
            </div>
            <div
              style={{
                flex: 1,
                height: '100%',
                border: `2px dashed ${theme.colorPrimaryBorder}`,
                backgroundColor: theme.colorPrimaryBg,
              }}
            >
            </div>
          </div>
        </div>
      )
    }
    else if (type === 'only-head') {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            gap: 4,
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '23%',
              backgroundColor: theme.colorPrimary,
            }}
          >
          </div>
          <div
            style={{
              flex: 1,
              height: '1px',
              width: '100%',
              border: `2px dashed ${theme.colorPrimaryBorder}`,
              backgroundColor: theme.colorPrimaryBg,
            }}
          >
          </div>
        </div>
      )
    }
    else if (type === 'simple') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: 4 }}>
          <div
            style={{
              width: '20%',
              height: '100%',
              backgroundColor: theme.colorPrimaryBgHover,
            }}
          >
          </div>
          <div
            style={{
              flex: 1,
              height: '100%',
              border: `2px dashed ${theme.colorPrimaryBorder}`,
              backgroundColor: theme.colorPrimaryBg,
            }}
          >
          </div>
        </div>
      )
    }
  }

  const renderThemeConfig = () => (
    <Card key="theme" title="主题">
      <div className={styles.cardContent}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
          }}
        >
          {themeColorList.map((color: string | undefined) => {
            return (
              <div
                key={color}
                onClick={() => {
                  setDefaultSetting({
                    ...defaultSetting,
                    theme: { ...defaultSetting.theme, themeColor: color },
                  })
                }}
                className={styles.themeItem}
              >
                <div
                  className={
                    defaultSetting.theme.themeColor === color
                      ? styles.checkedColor
                      : styles.unCheckedColor
                  }
                  style={{ backgroundColor: color }}
                >
                </div>
                <div
                  className={
                    defaultSetting.theme.themeColor === color
                      ? styles.checkedIcon
                      : styles.unCheckedIcon
                  }
                >
                </div>
              </div>
            )
          })}
        </div>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            颜色方案
          </Col>
          <Segmented
            options={[
              { value: '0', icon: <SunOutlined /> },
              { value: '1', icon: <MoonOutlined /> },
              { value: 'auto', icon: <SyncOutlined /> },
            ]}
            value={defaultSetting.theme.darkMode}
            onChange={(v: string) => {
              setDefaultSetting({
                ...defaultSetting,
                theme: {
                  ...defaultSetting.theme,
                  darkMode: v,
                },
              })
            }}
          />
        </Row>
        
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            色弱模式
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.theme.colorWeak}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  theme: { ...defaultSetting.theme, colorWeak: v },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
      </div>
    </Card>
  )

  const renderTransitionConfig = () => (
    <Card key="transition" title="页面">
      <div className={styles.cardContent}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 16,
          }}
        >
          {transitionTypeList.map((transition: any, index: number) => {
            return (
              <Tooltip title={transition.label} key={index}>
                <div
                  className={styles.transitionContainer}
                  onClick={() => {
                    setDefaultSetting({
                      ...defaultSetting,
                      page: {
                        ...defaultSetting.page,
                        transitionType: transition.value,
                      },
                    })
                  }}
                >
                  <CSSTransition
                    nodeRef={transitionRefs[index]}
                    timeout={800}
                    in={isTransition}
                    unmountOnExit
                    classNames={transition.classNames}
                  >
                    <div
                      className={styles.transitionContent}
                      ref={transitionRefs[index]}
                    >
                    </div>
                  </CSSTransition>
                  {defaultSetting.page.transitionType === transition.value
                    ? (
                        <div className={styles.checkedIcon}></div>
                      )
                    : null}
                </div>
              </Tooltip>
            )
          })}
        </div>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            载入进度条
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.page.isEnablePageLoadProgress}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  page: {
                    ...defaultSetting.page,
                    isEnablePageLoadProgress: v,
                  },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
      </div>
    </Card>
  )

  const renderMenuTypeConfig = () => (
    <Card key="menuType" title="导航菜单">
      <div className={styles.cardContent}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {menuTypeList.map((item: any, index: number) => {
            return (
              <Tooltip title={item.label} key={index}>
                <div
                  className={styles.layoutContainer}
                  onClick={() => {
                    setDefaultSetting({
                      ...defaultSetting,
                      menu: { ...defaultSetting.menu, menuType: item.value },
                    })
                  }}
                >
                  {defaultSetting.menu.menuType === item.value
                    ? (
                        <div className={styles.checkedIcon}></div>
                      )
                    : null}
                  <div className={styles.layoutContent}>
                    {renderLayout(item.value)}
                  </div>
                </div>
              </Tooltip>
            )
          })}
        </div>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            次导航手风琴模式
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.menu.subMenuUniqueOpened}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  menu: { ...defaultSetting.menu, subMenuUniqueOpened: v },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            启用次导航折叠按钮
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.menu.isEnableSubMenuCollapse}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  menu: { ...defaultSetting.menu, isEnableSubMenuCollapse: v },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            次导航折叠
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.menu.subMenuCollapse}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  menu: { ...defaultSetting.menu, subMenuCollapse: v },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
      </div>
    </Card>
  )

  const renderTopBarConfig = () => (
    <Card key="topBar" title="顶栏">
      <div className={styles.cardContent}>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            标签栏
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.topBar.tabBar.isEnableTabBar}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  topBar: {
                    ...defaultSetting.topBar,
                    tabBar: { ...defaultSetting.topBar.tabBar, isEnableTabBar: v },
                  },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            展示切换
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.topBar.order[0] === 'TabBar'}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  topBar: {
                    ...defaultSetting.topBar,
                    order: v ? ['TabBar', 'Toolbar'] : ['Toolbar', 'TabBar'],
                  },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            定位
          </Col>
          <Col>
            <Radio.Group
              value={defaultSetting.topBar.position}
              onChange={(v: any) => {
                setDefaultSetting({
                  ...defaultSetting,
                  topBar: {
                    ...defaultSetting.topBar,
                    position: v.target.value,
                  },
                })
              }}
            >
              {topBarPositionList.map((item) => {
                return (
                  <Radio.Button key={item.value} value={item.value}>
                    {item.label}
                  </Radio.Button>
                )
              })}
            </Radio.Group>
          </Col>
        </Row>
      </div>
    </Card>
  )

  const toolbarFuncItems: { key: string, label: string, icon: React.ReactNode }[] = [
    { key: 'isEnableSearch', label: '搜索', icon: <SearchOutlined /> },
    { key: 'isEnableI18n', label: '国际化', icon: <TranslationOutlined /> },
    { key: 'isEnablePageReload', label: '页面重载', icon: <ReloadOutlined /> },
    { key: 'isEnableFullscreen', label: '全屏', icon: <FullscreenOutlined /> },
    { key: 'isEnableTheme', label: '颜色主题', icon: <BgColorsOutlined /> },
  ]

  const renderToolbarFuncConfig = () => {
    return (
      <Card key="toolbarFunc" title="工具栏">
        <div className={styles.cardContent}>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              面包屑
            </Col>
            <Col>
              <Switch
                defaultChecked={defaultSetting.topBar.toolbar.breadcrumb.isEnableBreadcrumb}
                onChange={(v: boolean) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    topBar: {
                      ...defaultSetting.topBar,
                      toolbar: {
                        ...defaultSetting.topBar.toolbar,
                        breadcrumb: {
                          ...defaultSetting.topBar.toolbar.breadcrumb,
                          isEnableBreadcrumb: v,
                        },
                      },
                    },
                  })
                }}
              >
              </Switch>
            </Col>
          </Row>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              面包屑样式
            </Col>
            <Col>
              <Radio.Group
                value={defaultSetting.topBar.toolbar.breadcrumb.style}
                onChange={(v: any) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    topBar: {
                      ...defaultSetting.topBar,
                      toolbar: {
                        ...defaultSetting.topBar.toolbar,
                        breadcrumb: {
                          ...defaultSetting.topBar.toolbar.breadcrumb,
                          style: v.target.value,
                        },
                      },
                    },
                  })
                }}
              >
                {breadcrumbStyleList.map((item) => {
                  return (
                    <Radio.Button key={item.value} value={item.value}>
                      {item.label}
                    </Radio.Button>
                  )
                })}
              </Radio.Group>
            </Col>
          </Row>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              显示首页
            </Col>
            <Col>
              <Switch
                defaultChecked={defaultSetting.topBar.toolbar.breadcrumb.isEnableMainNav}
                onChange={(v: boolean) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    topBar: {
                      ...defaultSetting.topBar,
                      toolbar: {
                        ...defaultSetting.topBar.toolbar,
                        breadcrumb: {
                          ...defaultSetting.topBar.toolbar.breadcrumb,
                          isEnableMainNav: v,
                        },
                      },
                    },
                  })
                }}
              >
              </Switch>
            </Col>
          </Row>
          {toolbarFuncItems.map(item => (
            <Row key={item.key} align="middle" className={styles.configItem}>
              <Col flex={1} className={styles.moduleLable}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.icon}
                  {item.label}
                </span>
              </Col>
              <Col>
                <Switch
                  defaultChecked={defaultSetting.topBar.toolbar[item.key]}
                  onChange={(v: boolean) => {
                    setDefaultSetting({
                      ...defaultSetting,
                      topBar: {
                        ...defaultSetting.topBar,
                        toolbar: {
                          ...defaultSetting.topBar.toolbar,
                          [item.key]: v,
                        },
                      },
                    })
                  }}
                />
              </Col>
            </Row>
          ))}
        </div>
      </Card>
    )
  }

  const renderTabBarConfig = () => (
    <Card key="tabBar" title="标签栏">
      <div className={styles.cardContent}>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            样式风格
          </Col>
          <Col>
            <Radio.Group
              value={defaultSetting.topBar.tabBar.style}
              onChange={(v: any) => {
                setDefaultSetting({
                  ...defaultSetting,
                  topBar: {
                    ...defaultSetting.topBar,
                    tabBar: {
                      ...defaultSetting.topBar.tabBar,
                      style: v.target.value,
                    },
                  },
                })
              }}
            >
              {tabBarStyleList.map((item) => {
                return (
                  <Radio.Button key={item.value} value={item.value}>
                    {item.label}
                  </Radio.Button>
                )
              })}
            </Radio.Group>
          </Col>
        </Row>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            显示图标
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.topBar.tabBar.showIcon}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  topBar: {
                    ...defaultSetting.topBar,
                    tabBar: {
                      ...defaultSetting.topBar.tabBar,
                      showIcon: v,
                    },
                  },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            双击标签页
          </Col>
          <Col>
            <Select
              defaultValue={defaultSetting.topBar.tabBar.dblClickEvent}
              onChange={(v: string) => {
                setDefaultSetting({
                  ...defaultSetting,
                  topBar: {
                    ...defaultSetting.topBar,
                    tabBar: {
                      ...defaultSetting.topBar.tabBar,
                      dblClickEvent: v,
                    },
                  },
                })
              }}
              style={{ width: 140 }}
              options={tabBarDblClickEventTypeList}
            >
            </Select>
          </Col>
        </Row>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            标签页宽度
          </Col>
          <Col>
            <Select
              defaultValue={defaultSetting.topBar.tabBar.widthType}
              onChange={(v: string) => {
                setDefaultSetting({
                  ...defaultSetting,
                  topBar: {
                    ...defaultSetting.topBar,
                    tabBar: {
                      ...defaultSetting.topBar.tabBar,
                      widthType: v,
                    },
                  },
                })
              }}
              style={{ width: 140 }}
              options={tabBarWidthTypeList}
            >
            </Select>
            {defaultSetting.topBar.tabBar.widthType !== 'auto' && (
              <Slider
                min={100}
                max={250}
                defaultValue={defaultSetting.topBar.tabBar.width}
                onChange={(v: number) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    topBar: {
                      ...defaultSetting.topBar,
                      tabBar: {
                        ...defaultSetting.topBar.tabBar,
                        width: v,
                      },
                    },
                  })
                }}
                style={{ width: 120 }}
              >
              </Slider>
            )}
          </Col>
        </Row>
      </div>
    </Card>
  )

  const renderAppConfig = () => (
    <Card key="app" title="应用">
      <div className={styles.cardContent}>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            移动端访问
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.app.isEnableMobileAccess}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  app: { ...defaultSetting.app, isEnableMobileAccess: v },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            动态标题
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.app.isEnableDynamicTitle}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  app: { ...defaultSetting.app, isEnableDynamicTitle: v },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            哀悼模式
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.app.isEnableMourningMode}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  app: { ...defaultSetting.app, isEnableMourningMode: v },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
        <Row align="middle" className={styles.configItem}>
          <Col flex={1} className={styles.moduleLable}>
            水印
          </Col>
          <Col>
            <Switch
              defaultChecked={defaultSetting.app.isEnableWatermark}
              onChange={(v: boolean) => {
                setDefaultSetting({
                  ...defaultSetting,
                  app: { ...defaultSetting.app, isEnableWatermark: v },
                })
              }}
            >
            </Switch>
          </Col>
        </Row>
        <div className={styles.appModuleContainer}>
          <div className={styles.appModuleTitle}>账号</div>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              权限验证
            </Col>
            <Col>
              <Switch
                defaultChecked={defaultSetting.app.account.isEnablePermission}
                onChange={(v: boolean) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      account: {
                        ...defaultSetting.app.account,
                        isEnablePermission: v,
                      },
                    },
                  })
                }}
              >
              </Switch>
            </Col>
          </Row>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              过期模式
            </Col>
            <Col>
              <Select
                defaultValue={defaultSetting.app.account.expireMode}
                onChange={(v: ExpireMode) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      account: { ...defaultSetting.app.account, expireMode: v },
                    },
                  })
                }}
                options={expireModeList}
              >
              </Select>
            </Col>
          </Row>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              多账号管理
            </Col>
            <Col>
              <Switch
                defaultChecked={defaultSetting.app.account.isEnableMultiAccount}
                onChange={(v: boolean) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      account: {
                        ...defaultSetting.app.account,
                        isEnableMultiAccount: v,
                      },
                    },
                  })
                }}
              >
              </Switch>
            </Col>
          </Row>
        </div>
        <div className={styles.appModuleContainer}>
          <div className={styles.appModuleTitle}>主页</div>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              启用
            </Col>
            <Col>
              <Switch
                defaultChecked={defaultSetting.app.homePage.isEnableHomePage}
                onChange={(v: boolean) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      homePage: {
                        ...defaultSetting.app.homePage,
                        isEnableHomePage: v,
                      },
                    },
                  })
                }}
              >
              </Switch>
            </Col>
          </Row>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              标题
            </Col>
            <Col>
              <Input
                defaultValue={defaultSetting.app.homePage.title}
                onChange={(v: any) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      homePage: {
                        ...defaultSetting.app.homePage,
                        title: v.target.value,
                      },
                    },
                  })
                }}
              >
              </Input>
            </Col>
          </Row>
        </div>
        <div className={styles.appModuleContainer}>
          <div className={styles.appModuleTitle}>布局</div>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              居中显示
            </Col>
            <Col>
              <Switch
                defaultChecked={defaultSetting.app.layout.isCenter}
                onChange={(v: boolean) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      layout: {
                        ...defaultSetting.app.layout,
                        isCenter: v,
                      },
                    },
                  })
                }}
              >
              </Switch>
            </Col>
          </Row>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              作用范围
            </Col>
            <Col>
              <Radio.Group
                defaultValue={defaultSetting.app.layout.layoutScope}
                onChange={(v: any) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      layout: {
                        ...defaultSetting.app.layout,
                        layoutScope: v.target.value,
                      },
                    },
                  })
                }}
              >
                {layoutScopeList.map((item) => {
                  return (
                    <Radio.Button key={item.value} value={item.value}>
                      {item.label}
                    </Radio.Button>
                  )
                })}
              </Radio.Group>
            </Col>
          </Row>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              居中宽度
            </Col>
            <Col>
              <Slider
                min={1200}
                max={1600}
                defaultValue={defaultSetting.app.layout.width}
                onChange={(v: number) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      layout: {
                        ...defaultSetting.app.layout,
                        width: v,
                      },
                    },
                  })
                }}
                style={{ width: 160 }}
              >
              </Slider>
            </Col>
          </Row>
        </div>
        <div className={styles.appModuleContainer}>
          <div className={styles.appModuleTitle}>版权</div>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              启用
            </Col>
            <Col>
              <Switch
                defaultChecked={defaultSetting.app.copyright.isEnableCopyright}
                onChange={(v: boolean) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      copyright: {
                        ...defaultSetting.app.copyright,
                        isEnableCopyright: v,
                      },
                    },
                  })
                }}
              >
              </Switch>
            </Col>
          </Row>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              日期
            </Col>
            <Col>
              <Input
                defaultValue={defaultSetting.app.copyright.date}
                onChange={(v: any) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      copyright: {
                        ...defaultSetting.app.copyright,
                        date: v.target.value,
                      },
                    },
                  })
                }}
              >
              </Input>
            </Col>
          </Row>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              公司
            </Col>
            <Col>
              <Input
                defaultValue={defaultSetting.app.copyright.company}
                onChange={(v: any) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      copyright: {
                        ...defaultSetting.app.copyright,
                        company: v.target.value,
                      },
                    },
                  })
                }}
              >
              </Input>
            </Col>
          </Row>
          <Row align="middle" className={styles.configItem}>
            <Col flex={1} className={styles.moduleLable}>
              网站
            </Col>
            <Col>
              <Input
                defaultValue={defaultSetting.app.copyright.website}
                onChange={(v: any) => {
                  setDefaultSetting({
                    ...defaultSetting,
                    app: {
                      ...defaultSetting.app,
                      copyright: {
                        ...defaultSetting.app.copyright,
                        website: v.target.value,
                      },
                    },
                  })
                }}
              >
              </Input>
            </Col>
          </Row>
        </div>
      </div>
    </Card>
  )

  const configModules = isDev
    ? [
        { key: 'theme', render: renderThemeConfig, column: '1' },
        { key: 'toolbarFunc', render: renderToolbarFuncConfig, column: '1' },
        { key: 'tabBar', render: renderTabBarConfig, column: '1' },
        { key: 'topBar', render: renderTopBarConfig, column: '1' },
        { key: 'transition', render: renderTransitionConfig, column: '1' },
        { key: 'menuType', render: renderMenuTypeConfig, column: '2' },
        { key: 'app', render: renderAppConfig, column: '2' },
      ]
    : [
        { key: 'theme', render: renderThemeConfig, column: '1' },
        { key: 'menuType', render: renderMenuTypeConfig, column: '1' },
        { key: 'transition', render: renderTransitionConfig, column: '1' },
        { key: 'toolbarFunc', render: renderToolbarFuncConfig, column: '2' },
        { key: 'tabBar', render: renderTabBarConfig, column: '2' },
        { key: 'topBar', render: renderTopBarConfig, column: '2' },
      ]

  const columnModules1 = configModules.filter(m => m.column === '1')
  const columnModules2 = configModules.filter(m => m.column === '2')

  return (
    <Modal
      rootClassName={styles.resetModal}
      getContainer={() => document.getElementById('root') as HTMLElement}
      width={860}
      centered
      onCancel={onClose}
      open={open}
      title={(
        <div className={styles.customHeader}>
          {isDev
            ? (
                <>
                  <h2>应用配置</h2>
                  <p>在生产环境该模块会自动关闭，仅保留用户的偏好设置</p>
                </>
              )
            : (
                <h2>个人偏好</h2>
              )}
        </div>
      )}
      footer={(
        <div className={styles.customFooter}>
          {isDev
            ? (
                <>
                  <Alert
                    type="error"
                    title="调整配置仅临时生效，想真正应用于项目，请点击「 复制配置 」按钮，并粘贴到 packages/layout/defaultSettings.ts 文件中"
                    style={{
                      marginBottom: 8,
                      textAlign: 'center',
                      color: theme.colorError,
                    }}
                  />
                  <Button
                    icon={<CopyOutlined />}
                    style={{ width: '100%' }}
                    type="primary"
                    onClick={handleCopyConfig}
                  >
                    复制配置
                  </Button>
                </>
              )
            : (
                <Button style={{ width: '100%' }} type="primary">
                  重置
                </Button>
              )}
        </div>
      )}
    >
      <div className={styles.configContainer}>
        <div className={styles.configContent}>
          <div className={styles.configColumn}>
            {columnModules1.map(module => module.render())}
          </div>
          <div className={styles.configColumn}>
            {columnModules2.map(module => module.render())}
          </div>
        </div>
      </div>
    </Modal>
  )
}