import type { MenuProps } from 'antd'
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
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { useMount } from 'ahooks'
import { Dropdown, Popover, Tooltip } from 'antd'
import { createStyles } from 'antd-style'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useControlTab } from '../../hooks/useControlTab'
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
  tabTitle: css`
    width: 84px;
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

export function TabBar() {
  const { openTab, closeTab, swapTab, fixedTab } = useControlTab()
  const { styles, theme } = useStyles()
  const { changeIsMaximize } = usePageStore()
  const { tabs, nowTab, tabBar, order } = useTopBarStore()

  const isTabBarOnTop = order.indexOf('TabBar') < order.indexOf('Toolbar')

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
        label: '重新加载',
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
        label: nowOpenTab.isFixed ? '取消固定' : '固定',
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
        label: '最大化',
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
        label: '关闭标签页',
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
        label: '关闭其他标签页',
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
        label: '关闭左侧标签页',
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
        label: '关闭右侧标签页',
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
  }, [nowTab, nowOpenTab, isOpenTab, tabs])

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
        tooltip: '搜索',
        icon: <SearchOutlined />,
        onClick: () => { },
        disabled: false,
      },
      {
        tooltip: '关闭其他标签页',
        icon: <CloseOutlined />,
        onClick: () => { },
        disabled: tabs?.length === 1,
      },
      {
        tooltip: '关闭左侧标签页',
        icon: <LeftSquareOutlined />,
        onClick: () => {
          if (!leftCount)
            return
          closeTab(nowTab.tabId, 'left')
        },
        disabled: !leftCount,
      },
      {
        tooltip: '关闭右侧标签页',
        icon: <RightSquareOutlined />,
        onClick: () => {
          if (!rightCount)
            return
          closeTab(nowTab.tabId, 'right')
        },
        disabled: !rightCount,
      },
    ]
  }, [nowTab, tabs])

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

  return tabBar.isEnableTabBar
    ? (
        <div className={styles.headerTabs}>
          <div className={styles.headerTabsLeft} ref={headerTabsRef}>
            <DragDropContext
              onDragEnd={(result: any) => {
                if (!result.destination)
                  return
                swapTab(result.source.index, result.destination.index)
              }}
            >
              <Droppable
                droppableId="droppable"
                direction="horizontal"
                isDropDisabled={false}
                isCombineEnabled={true}
                ignoreContainerClipping={false}
              >
                {(droppableProvided: any) => (
                  <div
                    className={styles.headerTabsContent}
                    ref={droppableProvided.innerRef}
                    style={{
                      alignItems: isTabBarOnTop ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {tabs.map((tabItem: any, index: number) => {
                      return (
                        <Draggable
                          key={tabItem.tabId}
                          draggableId={tabItem.tabId}
                          index={index}
                        >
                          {(provided: any, snapshot: any) => (
                            <div
                              id={`header-tab-${tabItem.tabId}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.7 : 1,
                              }}
                            >
                              <Dropdown
                                key={tabItem.tabId}
                                placement={isTabBarOnTop ? 'bottomLeft' : 'topLeft'}
                                trigger={['contextMenu']}
                                onOpenChange={(v) => {
                                  setIsOpenTab(v)
                                  if (v) {
                                    setNowOpenTab(tabItem)
                                  }
                                }}
                                menu={{ items: tabItems }}
                              >
                                <div
                                  onClick={() => {
                                    openTab(tabItem.menuData)
                                  }}
                                  className={
                                    nowTab.tabId === tabItem.tabId
                                      ? styles.nowTabItem
                                      : styles.headerTabItem
                                  }
                                  key={tabItem.tabId}
                                  style={{
                                    borderRadius: isTabBarOnTop
                                      ? `${theme.borderRadiusLG}px ${theme.borderRadiusLG}px 0 0`
                                      : `0 0 ${theme.borderRadiusLG}px ${theme.borderRadiusLG}px`,
                                  }}
                                >
                                  <div
                                    className="flex-sb"
                                    style={{ width: '100%', height: '100%' }}
                                  >
                                    <div className="flex-start">
                                      {tabItem.icon || tabItem.menuData?.selectIcon
                                        ? (
                                            <MenuIcon
                                              size={15}
                                              style={{ marginRight: theme.marginXS }}
                                              icon={tabItem.icon}
                                              selectIcon={tabItem.menuData?.selectIcon}
                                              isActive={nowTab.tabId === tabItem.tabId}
                                            >
                                            </MenuIcon>
                                          )
                                        : null}
                                      <div className={styles.tabTitle}>
                                        {tabItem.title}
                                      </div>
                                    </div>
                                    {tabs?.length > 1
                                      ? (
                                          <div
                                            className={styles.tabClose}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              e.preventDefault()
                                              if (tabItem.isFixed) {
                                                fixedTab(tabItem.tabId)
                                              }
                                              else {
                                                closeTab(tabItem.tabId)
                                              }
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
                          )}
                        </Draggable>
                      )
                    })}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
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
                                <div className="flex-start">
                                  {tabItem.icon || tabItem.menuData?.selectIcon
                                    ? (
                                        <MenuIcon
                                          size={14}
                                          style={{ marginRight: theme.marginXS }}
                                          icon={tabItem.icon}
                                          selectIcon={tabItem.menuData?.selectIcon}
                                          isActive={nowTab.tabId === tabItem.tabId}
                                        >
                                        </MenuIcon>
                                      )
                                    : null}
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
