import { FullscreenExitOutlined } from '@ant-design/icons'
import { createStyles } from 'antd-style'
import { useRef, useState } from 'react'
import { useLocation, useOutlet } from 'react-router'
// @ts-ignore
import { CSSTransition, SwitchTransition } from 'react-transition-group'
import { useAppStore, usePageStore } from '../../store/index'
import { transitionTypeSet } from '../../utils/data'

const useStyles = createStyles(({ token, css }) => ({
  content: {
    width: 'auto',
    height: '100%',
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: token.colorBgBase,
  },
  maxContent: css`
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background-color: ${token.colorBgBase};
    position: fixed;
    inset: 0;
    z-index: 9999;
  `,
  exitMaxBtn: css`
    position: absolute;
    width: 48px;
    height: 48px;
    right: 0;
    z-index: 999;
    cursor: pointer;
    border-radius: 0 0 0 100%;
    background-color: ${token.colorBgContainerDisabled};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorIcon};
    transition: background-color 0.2s;
  `,
  exitMaxBtnIcon: css`
    transform: translate(4px, -3px);
  `,
  outletContainer: {
    width: '100%',
    height: '100%',
  },
  insideCenterWrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: token.colorBgLayout,
  },
}))

export function Content() {
  const { styles } = useStyles()
  const nodeRef = useRef<HTMLDivElement>(null)
  const currentOutlet = useOutlet()
  const location = useLocation()
  const {
    transitionType,
    isMaximize,
    changeIsMaximize,
    startGlobalProgressLoading,
    stopGlobalProgressLoading,
    globalProgressLoading,
    refreshKey,
    cachedPages,
  } = usePageStore()
  const { layout: layoutConfig } = useAppStore()

  const isInsideCenter = !isMaximize && layoutConfig.isCenter && layoutConfig.layoutScope === 'inside'

  // 判断当前路由是否需要缓存
  const shouldCache = Array.isArray(cachedPages) && cachedPages.includes(location.pathname)

  // KeepAlive 缓存：存储各个路由的 outlet
  const [outletCache, setOutletCache] = useState<Record<string, React.ReactNode>>({})

  // 用 ref 追踪缓存状态，避免渲染期间 setState 的无限循环
  const outletCacheRef = useRef(outletCache)
  outletCacheRef.current = outletCache

  const lastPathRef = useRef(location.pathname)
  const refreshKeyRef = useRef(refreshKey)

  // refreshKey 变化时清除所有缓存
  if (refreshKeyRef.current !== refreshKey) {
    refreshKeyRef.current = refreshKey
    setOutletCache({})
    outletCacheRef.current = {}
  }

  // pathname 变化时，如果是缓存页且未缓存，加入缓存
  if (lastPathRef.current !== location.pathname) {
    lastPathRef.current = location.pathname
    if (shouldCache && !outletCacheRef.current[location.pathname]) {
      setOutletCache(prev => ({ ...prev, [location.pathname]: currentOutlet }))
    }
  }

  // 首次渲染时，如果是缓存页且未缓存，也加入缓存
  if (shouldCache && !outletCacheRef.current[location.pathname]) {
    setOutletCache(prev => ({ ...prev, [location.pathname]: currentOutlet }))
  }

  // 缓存页面容器：始终在 DOM 中，通过 display 控制显隐
  // 这样缓存页的组件不会被卸载，保持内部状态
  const cachedLayer = (
    <div style={{
      display: shouldCache && Object.keys(outletCache).length > 0 ? 'block' : 'none',
      width: '100%',
      height: '100%',
    }}>
      {Object.entries(outletCache).map(([pathname, outlet]) => (
        <div
          key={pathname}
          style={{
            display: pathname === location.pathname ? 'block' : 'none',
            width: '100%',
            height: '100%',
          }}
        >
          {outlet}
        </div>
      ))}
    </div>
  )

  // 非缓存页面：使用过渡动画，始终在 DOM 中，通过 display 控制显隐
  // 当 shouldCache 为 true 时，使用固定 key 避免 CSSTransition 触发不必要的动画
  const transitionLayer = (
    <div style={{
      display: !shouldCache ? 'block' : 'none',
      width: '100%',
      height: '100%',
    }}>
      <SwitchTransition mode="out-in">
        <CSSTransition
          nodeRef={nodeRef}
          unmountOnExit
          onEntered={stopGlobalProgressLoading}
          onExit={startGlobalProgressLoading}
          key={shouldCache ? '__keepalive__' : location.pathname}
          timeout={500}
          classNames={transitionTypeSet[transitionType]}
        >
          <div className={styles.outletContainer} ref={nodeRef}>
            {currentOutlet}
          </div>
        </CSSTransition>
      </SwitchTransition>
    </div>
  )

  return (
    <div
      className={isMaximize ? styles.maxContent : styles.content}
      style={{ overflow: globalProgressLoading ? 'hidden' : 'auto' }}
    >
      {isMaximize && (
        <div className={styles.exitMaxBtn} onClick={changeIsMaximize}>
          <FullscreenExitOutlined className={styles.exitMaxBtnIcon} style={{ fontSize: 24 }} />
        </div>
      )}
      {isInsideCenter
        ? (
            <div className={styles.insideCenterWrapper}>
              <div style={{ maxWidth: layoutConfig.width, width: '100%', height: '100%' }}>
                {cachedLayer}
                {transitionLayer}
              </div>
            </div>
          )
        : (
            <>
              {cachedLayer}
              {transitionLayer}
            </>
          )}
    </div>
  )
}