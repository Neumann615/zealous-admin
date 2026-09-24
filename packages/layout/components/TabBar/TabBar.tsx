import type { DragEndEvent } from '@dnd-kit/react'
import type { MenuProps } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import {
  CaretDownOutlined,
  CloseOutlined,
  FullscreenOutlined,
  LeftSquareOutlined,
  PushpinOutlined,
  RightSquareOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { useMount } from 'ahooks'
import { Dropdown, Popover, Tooltip } from 'antd'
import { createStyles } from 'antd-style'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useControlTab } from '../../hooks/useControlTab'
import { useT } from '../../hooks/useT'
import { usePageStore, useTopBarStore } from '../../store/index'
import { MenuIcon } from '../MenuIcon/MenuIcon'

const useStyles = createStyles(({ token, css }) => ({
  headerTabs: {
    boxSizing: 'border-box',
    backgroundColor: token.colorBgBase,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: token.paddingXS,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  headerTabsLeft: {
    flex: 1,
    width: '1px',
  },
  headerTabsRight: {
    display: 'grid',
    placeItems: 'center',
    borderRadius: token.borderRadiusLG,
    backgroundColor: token.colorBgContainerDisabled,
    boxSizing: 'border-box',
    padding: token.paddingXS,
    overflow: 'hidden',
    marginRight: token.marginXS,
    marginLeft: token.marginXS,
  },
  headerTabsContent: css`
    width: 100%;
    display: flex;
    height: 48px;
    align-items: flex-end;
    overflow-x: auto;

    ::-webkit-scrollbar {
      display: none;
    }
  `,
  headerTabItem: css`
    width: 144px;
    height: 40px;
    text-align: center;
    font-size: ${token.fontSize}px;
    border-radius: ${token.borderRadiusLG}px ${token.borderRadiusLG}px 0 0;
    color: ${token.colorTextTertiary};
    cursor: pointer;
    transition: all 0.4s;
    margin-left: ${token.marginXXS}px;
    padding: 0 ${token.paddingXS}px;

    :hover {
      background-color: ${token.colorBgContainerDisabled};
    }
  `,
  nowTabItem: css`
    width: 144px;
    height: 40px;
    text-align: center;
    font-size: ${token.fontSize}px;
    border-radius: ${token.borderRadiusLG}px ${token.borderRadiusLG}px 0 0;
    color: ${token.colorTextTertiary};
    cursor: pointer;
    transition: all 0.4s;
    margin-left: ${token.marginXXS}px;
    padding: 0 ${token.paddingXS}px;
    background-color: ${token.colorBgContainerDisabled};
  `,
  /* card 风格 - 卡片式：四周圆角 + 边框，激活时主题色描边 */
  cardTabItem: css`
    width: 144px;
    height: 36px;
    text-align: center;
    font-size: ${token.fontSize}px;
    border-radius: ${token.borderRadiusLG}px;
    color: ${token.colorTextTertiary};
    cursor: pointer;
    transition: all 0.4s;
    margin: 6px 0 0 ${token.marginXXS}px;
    padding: 0 ${token.paddingXS}px;
    border: 1px solid transparent;
    box-sizing: border-box;

    :hover {
      background-color: ${token.colorBgContainerDisabled};
    }
  `,
  cardNowTabItem: css`
    width: 144px;
    height: 36px;
    text-align: center;
    font-size: ${token.fontSize}px;
    border-radius: ${token.borderRadiusLG}px;
    color: ${token.colorTextTertiary};
    cursor: pointer;
    transition: all 0.4s;
    margin: 6px 0 0 ${token.marginXXS}px;
    padding: 0 ${token.paddingXS}px;
    background-color: ${token.colorBgContainerDisabled};
    border: 1px solid ${token.colorBorderSecondary};
    box-sizing: border-box;
  `,
  /* block 风格 - 方块：无圆角，选中效果与默认一致，宽高填满容器 */
  blockTabItem: css`
    width: 144px;
    height: 100%;
    text-align: center;
    font-size: ${token.fontSize}px;
    color: ${token.colorTextTertiary};
    cursor: pointer;
    transition: all 0.4s;
    margin-left: ${token.marginXXS}px;
    padding: 0 ${token.paddingXS}px;

    :hover {
      background-color: ${token.colorBgContainerDisabled};
    }
  `,
  blockNowTabItem: css`
    width: 144px;
    height: 100%;
    text-align: center;
    font-size: ${token.fontSize}px;
    color: ${token.colorTextTertiary};
    cursor: pointer;
    transition: all 0.4s;
    margin-left: ${token.marginXXS}px;
    padding: 0 ${token.paddingXS}px;
    background-color: ${token.colorBgContainerDisabled};
  `,
  tabTitle: css`
    width: 100%;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(
      to right,
      #000 calc(100% - 20px),
      transparent
    );
  `,
  tabClose: css`
    box-sizing: border-box;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    transition: all 0.2s;
    display: grid;
    place-items: center;

    :hover {
      background-color: ${token.colorFillSecondary};
    }
  `,
  contextMenuIcon: css`
    .i-icon {
      display: grid;
      place-items: center;
      width: 15px;
      height: 15px;
    }
  `,
  tabPopover: {
    width: '166px',
    height: 'auto',
  },
  tabPopoverHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabPopoverHeaderItem: {
    boxSizing: 'border-box',
    padding: token.paddingXS,
    display: 'grid',
    placeItems: 'center',
    borderRadius: token.borderRadiusLG,
    overflow: 'hidden',
    backgroundColor: token.colorBgLayout,
    cursor: 'pointer',
  },
  tabPopoverHeaderItemDisabled: {
    cursor: 'not-allowed',
  },
  tabPopoverMain: {
    width: '100%',
    height: 'auto',
    maxHeight: '180px',
    marginTop: token.marginXS,
    overflow: 'auto',
  },
  tabPopoverMainItem: css`
    width: 100%;
    height: 36px;
    line-height: 36px;
    cursor: pointer;
    transition: all 0.3s;
    box-sizing: border-box;
    padding: 0 ${token.paddingXS}px;
    border-radius: ${token.borderRadiusLG}px;
    overflow: 'hidden';
    font-size: ${token.fontSizeSM}px;

    .i-icon {
      display: grid;
      place-items: center;
      width: 15px;
      height: 15px;
    }

    .close-icon {
      display: none;
      transition: all 0.3s;
      box-sizing: border-box;
      padding: 2px;
    }

    &:hover {
      background-color: ${token.colorBgLayout};

      .close-icon {
        transition: all 0.3s;
        display: block;
        box-sizing: border-box;
        padding: 2px;
      }
    }
  `,
  tabPopoverMainItemSelection: {
    backgroundColor: token.colorBgLayout,
  },
}))

interface TabItemProps {
  tabItem: any
  index: number
  nowTab: any
  tabsLength: number
  isTabBarOnTop: boolean
  styles: any
  theme: any
  tabBar: any
  tabItems: MenuProps['items']
  getTabItemClass: (isActive: boolean) => string
  getTabWidthStyle: () => CSSProperties
  renderTabIcon: (tabId: string, size?: number) => ReactNode
  onOpen: (menuData: any) => void
  onDblClick: (tabItem: any) => void
  onCloseClick: (tabItem: any) => void
  onContextMenuOpen: (open: boolean, tabItem: any) => void
}

// 单个标签项：通过 useSortable 注册拖拽排序能力
function TabItem(props: TabItemProps) {
  const {
    tabItem,
    index,
    nowTab,
    tabsLength,
    isTabBarOnTop,
    styles,
    theme,
    tabBar,
    tabItems,
    getTabItemClass,
    getTabWidthStyle,
    renderTabIcon,
    onOpen,
    onDblClick,
    onCloseClick,
    onContextMenuOpen,
  } = props

  const { ref, isDragging } = useSortable({
    id: tabItem.tabId,
    index,
    group: 'tab-bar',
  })

  return (
    <div
      id={`header-tab-${tabItem.tabId}`}
      ref={ref}
      style={{
        opacity: isDragging ? 0.7 : 1,
        height: tabBar.style === 'default' ? 'auto' : '100%',
      }}
    >
      <Dropdown
        placement={isTabBarOnTop ? 'bottomLeft' : 'topLeft'}
        trigger={['contextMenu']}
        onOpenChange={(v) => {
          onContextMenuOpen(v, tabItem)
        }}
        menu={{ items: tabItems }}
      >
        <div
          onClick={() => {
            onOpen(tabItem.menuData)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onDblClick(tabItem)
          }}
          className={getTabItemClass(nowTab.tabId === tabItem.tabId)}
          style={{
            ...getTabWidthStyle(),
            borderRadius: tabBar.style === 'card'
              ? `${theme.borderRadiusLG}px`
              : tabBar.style === 'block'
                ? '0px'
                : isTabBarOnTop
                  ? `${theme.borderRadiusLG}px ${theme.borderRadiusLG}px 0 0`
                  : `0 0 ${theme.borderRadiusLG}px ${theme.borderRadiusLG}px`,
          }}
        >
          <div
            className="flex-sb"
            style={{ width: '100%', height: '100%' }}
          >
            <div className="flex-start" style={{ flex: 1 }}>
              {renderTabIcon(tabItem.tabId, 15)}
              <div className={styles.tabTitle}>
                {tabItem.title}
              </div>
            </div>
            {tabsLength > 1
              ? (
                  <div
                    className={styles.tabClose}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      onCloseClick(tabItem)
                    }}
                  >
                    {tabItem.isFixed
                      ? (
                          <PushpinOutlined style={{ fontSize: '10px' }} />
                        )
                      : (
                          <CloseOutlined style={{ fontSize: '10px' }} />
                        )}
                  </div>
                )
              : null}
          </div>
        </div>
      </Dropdown>
    </div>
  )
}

export function TabBar() {
  const { openTab, closeTab, moveTab, fixedTab, findIconByPath } = useControlTab()
  const { styles, theme } = useStyles()
  const t = useT()
  const { changeIsMaximize, refreshPage } = usePageStore()
  const { tabs, nowTab, tabBar, order } = useTopBarStore()

  const isTabBarOnTop = order.indexOf('TabBar') < order.indexOf('Toolbar')

  // 根据配置的标签页样式选择对应的 className
  const getTabItemClass = (isActive: boolean) => {
    const tabBarStyle = tabBar.style as 'default' | 'card' | 'block'
    const styleMap = {
      default: isActive ? 'nowTabItem' : 'headerTabItem',
      card: isActive ? 'cardNowTabItem' : 'cardTabItem',
      block: isActive ? 'blockNowTabItem' : 'blockTabItem',
    } as const
    return styles[styleMap[tabBarStyle] || styleMap.default]
  }

  // 根据 tabBar.widthType 计算标签宽度样式
  // fixed：固定宽度（取 tabBar.width）；auto：内容自适应
  // auto-min / auto-max：内容自适应并受 tabBar.width 的最小/最大宽度约束
  const getTabWidthStyle = () => {
    const width = tabBar.width
    switch (tabBar.widthType) {
      case 'fixed':
        return { width: `${width}px` }
      case 'auto':
        return { width: 'auto' }
      case 'auto-min':
        return { width: 'auto', minWidth: `${width}px` }
      case 'auto-max':
        return { width: 'auto', maxWidth: `${width}px` }
      default:
        return {}
    }
  }

  // 双击标签事件：根据 tabBar.dblClickEvent 配置执行对应操作
  const handleTabDblClick = (tabItem: any) => {
    const eventMap: Record<string, () => void> = {
      refresh: () => refreshPage(),
      close: () => closeTab(tabItem.tabId),
      fixed: () => fixedTab(tabItem.tabId),
      max: () => changeIsMaximize(),
      open: () => window.open(tabItem.tabId, '_blank'),
    }
    eventMap[tabBar.dblClickEvent]?.()
  }

  const [nowOpenTab, setNowOpenTab] = useState({ tabId: '', isFixed: false })
  const [isOpenTab, setIsOpenTab] = useState(false)
  const headerTabsRef = useRef<any>(null)
  const navigate = useNavigate()

  const tabItems = useMemo<MenuProps['items']>(() => {
    let nowOpenTabIndex = -1
    tabs.forEach((tabItem: any, index: number) => {
      if (tabItem.tabId === nowOpenTab.tabId) {
        nowOpenTabIndex = index
      }
    })
    let leftCount: number = 0
    let rightCount: number = 0
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].tabId !== nowOpenTab.tabId && !tabs[i].isFixed) {
        if (i < nowOpenTabIndex) {
          leftCount += 1
        }
        else if (i > nowOpenTabIndex) {
          rightCount += 1
        }
      }
    }
    return [
      {
        label: t('tabBar.reload'),
        key: '1',
        icon: (
          <div className={styles.contextMenuIcon}>
            <SyncOutlined />
          </div>
        ),
        onClick: () => {
          navigate(0)
        },
        disabled: nowOpenTab.tabId !== nowTab.tabId,
      },
      {
        label: nowOpenTab.isFixed ? t('tabBar.unpin') : t('tabBar.pin'),
        key: '3',
        icon: (
          <div className={styles.contextMenuIcon}>
            <PushpinOutlined rotate={nowOpenTab.isFixed ? 0 : -45} />
          </div>
        ),
        onClick: () => {
          fixedTab(nowOpenTab.tabId)
        },
      },
      {
        label: t('tabBar.maximize'),
        key: '4',
        icon: (
          <div className={styles.contextMenuIcon}>
            <FullscreenOutlined />
          </div>
        ),
        onClick: () => {
          const targetTab = tabs.find((tab: any) => tab.tabId === nowOpenTab.tabId)
          if (targetTab?.menuData) {
            openTab(targetTab.menuData)
          }
          changeIsMaximize()
        },
      },
      {
        label: t('tabBar.closeTab'),
        key: '2',
        icon: (
          <div className={styles.contextMenuIcon}>
            <CloseOutlined />
          </div>
        ),
        onClick: () => {
          closeTab(nowOpenTab.tabId)
        },
        disabled: tabs?.length === 1,
      },
      {
        label: t('tabBar.closeOtherTabs'),
        key: '5',
        icon: (
          <div className={styles.contextMenuIcon}>
            <CloseOutlined />
          </div>
        ),
        onClick: () => {
          closeTab(nowOpenTab.tabId, 'other')
        },
        disabled: tabs?.length === 1,
      },
      {
        label: t('tabBar.closeLeftTabs'),
        key: '6',
        icon: (
          <div className={styles.contextMenuIcon}>
            <LeftSquareOutlined />
          </div>
        ),
        onClick: () => {
          closeTab(nowOpenTab.tabId, 'left')
        },
        disabled: !leftCount,
      },
      {
        label: t('tabBar.closeRightTabs'),
        key: '7',
        icon: (
          <div className={styles.contextMenuIcon}>
            <RightSquareOutlined />
          </div>
        ),
        onClick: () => {
          closeTab(nowOpenTab.tabId, 'right')
        },
        disabled: !rightCount,
      },
    ]
  }, [nowTab, nowOpenTab, isOpenTab, tabs, t])

  const popoverItems = useMemo(() => {
    let nowTabIndex = -1
    tabs.forEach((tabItem: any, index: number) => {
      if (tabItem.tabId === nowTab.tabId) {
        nowTabIndex = index
      }
    })
    let leftCount: number = 0
    let rightCount: number = 0
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].tabId !== nowTab.tabId && !tabs[i].isFixed) {
        if (i < nowTabIndex) {
          leftCount += 1
        }
        else if (i > nowTabIndex) {
          rightCount += 1
        }
      }
    }
    return [
      {
        tooltip: t('tabBar.search'),
        icon: <SearchOutlined />,
        onClick: () => { },
        disabled: false,
      },
      {
        tooltip: t('tabBar.closeOtherTabs'),
        icon: <CloseOutlined />,
        onClick: () => { },
        disabled: tabs?.length === 1,
      },
      {
        tooltip: t('tabBar.closeLeftTabs'),
        icon: <LeftSquareOutlined />,
        onClick: () => {
          if (!leftCount)
            return
          closeTab(nowTab.tabId, 'left')
        },
        disabled: !leftCount,
      },
      {
        tooltip: t('tabBar.closeRightTabs'),
        icon: <RightSquareOutlined />,
        onClick: () => {
          if (!rightCount)
            return
          closeTab(nowTab.tabId, 'right')
        },
        disabled: !rightCount,
      },
    ]
  }, [nowTab, tabs, t])

  useEffect(() => {
    const dom = document.getElementById(`header-tab-${nowTab.tabId}`)
    if (dom) {
      dom.scrollIntoView()
    }
  }, [tabs, nowTab])

  useMount(() => {
    if (headerTabsRef.current) {
      headerTabsRef.current.addEventListener('mousewheel', (e: Event) => {
        const wheelEvent = e as WheelEvent
        const wheelDelta = wheelEvent.deltaY ? -wheelEvent.deltaY : (wheelEvent as any).wheelDelta ? (wheelEvent as any).wheelDelta : -(wheelEvent as any).detail * 50
        const scrollSpace = Math.abs(wheelDelta)
        if (wheelDelta > 0) {
          headerTabsRef.current.children[0].scrollLeft -= scrollSpace
        }
        if (wheelDelta < 0) {
          headerTabsRef.current.children[0].scrollLeft += scrollSpace
        }
      })
    }
  })

  function renderTabIcon(tabId: string, size: number = 15) {
    if (!tabBar.showIcon)
      return null
    const { icon, selectIcon } = findIconByPath(tabId)
    if (!icon)
      return null
    return (
      <MenuIcon
        size={size}
        style={{ marginRight: theme.marginXS }}
        icon={icon}
        selectIcon={selectIcon}
        isActive={nowTab.tabId === tabId}
      >
      </MenuIcon>
    )
  }

  return tabBar.isEnableTabBar
    ? (
        <div className={styles.headerTabs}>
          <div className={styles.headerTabsLeft} ref={headerTabsRef}>
            <DragDropProvider
              onDragEnd={(event: DragEndEvent) => {
                if (event.canceled)
                  return
                const { source } = event.operation
                if (!isSortable(source))
                  return
                const { index, initialIndex } = source
                if (index !== initialIndex) {
                  moveTab(initialIndex, index)
                }
              }}
            >
              <div
                className={styles.headerTabsContent}
                style={{
                  alignItems: isTabBarOnTop ? 'flex-end' : 'flex-start',
                }}
              >
                {tabs.map((tabItem: any, index: number) => {
                  return (
                    <TabItem
                      key={tabItem.tabId}
                      tabItem={tabItem}
                      index={index}
                      nowTab={nowTab}
                      tabsLength={tabs.length}
                      isTabBarOnTop={isTabBarOnTop}
                      styles={styles}
                      theme={theme}
                      tabBar={tabBar}
                      tabItems={tabItems}
                      getTabItemClass={getTabItemClass}
                      getTabWidthStyle={getTabWidthStyle}
                      renderTabIcon={renderTabIcon}
                      onOpen={openTab}
                      onDblClick={handleTabDblClick}
                      onCloseClick={(item: any) => {
                        if (item.isFixed) {
                          fixedTab(item.tabId)
                        }
                        else {
                          closeTab(item.tabId)
                        }
                      }}
                      onContextMenuOpen={(v, item) => {
                        setIsOpenTab(v)
                        if (v) {
                          setNowOpenTab(item)
                        }
                      }}
                    />
                  )
                })}
              </div>
            </DragDropProvider>
          </div>
          {tabs?.length > 1
            ? (
                <Popover
                  placement={isTabBarOnTop ? 'bottomLeft' : 'topLeft'}
                  content={(
                    <div className={styles.tabPopover}>
                      <div className={styles.tabPopoverHeader}>
                        {popoverItems.map((item: any, index: number) => {
                          return (
                            <Tooltip title={item.tooltip} key={index}>
                              <div
                                className={
                                  `${styles.tabPopoverHeaderItem
                                  } ${item.disabled
                                    ? styles.tabPopoverHeaderItemDisabled
                                    : ''}`
                                }
                              >
                                {item.icon}
                              </div>
                            </Tooltip>
                          )
                        })}
                      </div>
                      <div className={styles.tabPopoverMain}>
                        {tabs.map((tabItem: any, index: number) => {
                          return (
                            <div
                              key={index}
                              onClick={() => {
                                openTab(tabItem.menuData)
                              }}
                              className={
                                `${styles.tabPopoverMainItem
                                } ${nowTab.tabId === tabItem.tabId
                                  ? styles.tabPopoverMainItemSelection
                                  : ''}`
                              }
                            >
                              <div
                                className="flex-sb"
                                style={{ width: '100%', height: '100%' }}
                              >
                                <div className="flex-start" style={{ flex: 1 }}>
                                  {renderTabIcon(tabItem.tabId, 14)}
                                  <div className={styles.tabTitle}>
                                    {tabItem.title}
                                  </div>
                                </div>
                                <div
                                  className="close-icon"
                                  onClick={() => {
                                    closeTab(tabItem.tabId)
                                  }}
                                >
                                  <CloseOutlined style={{ fontSize: '12px' }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  trigger="hover"
                >
                  <div className={styles.headerTabsRight}>
                    <CaretDownOutlined
                      style={{ fontSize: theme.fontSizeXL, color: theme.colorText }}
                    />
                  </div>
                </Popover>
              )
            : null}
        </div>
      )
    : null
}
