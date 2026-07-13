import { FullscreenExitOutlined } from '@ant-design/icons'
import { createStyles } from 'antd-style'
import { useRef } from 'react'
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
  } = usePageStore()
  const { layout: layoutConfig } = useAppStore()

  const isInsideCenter = !isMaximize && layoutConfig.isCenter && layoutConfig.layoutScope === 'inside'

  const outletContent = (
    <SwitchTransition mode="out-in">
      <CSSTransition
        nodeRef={nodeRef}
        unmountOnExit
        onEntered={stopGlobalProgressLoading}
        onExit={startGlobalProgressLoading}
        key={location.key}
        timeout={500}
        classNames={transitionTypeSet[transitionType]}
      >
        <div className={styles.outletContainer} ref={nodeRef}>
          {currentOutlet}
        </div>
      </CSSTransition>
    </SwitchTransition>
  )

  return (
    <div
      className={isMaximize ? styles.maxContent : styles.content}
      style={{ overflow: globalProgressLoading ? 'hidden' : 'auto' }}
    >
      {isMaximize
        ? (
            <div className={styles.exitMaxBtn} onClick={changeIsMaximize}>
              <FullscreenExitOutlined className={styles.exitMaxBtnIcon} style={{ fontSize: 24 }} />
            </div>
          )
        : null}
      {isInsideCenter
        ? (
            <div className={styles.insideCenterWrapper}>
              <div style={{ maxWidth: layoutConfig.width, width: '100%', height: '100%' }}>
                {outletContent}
              </div>
            </div>
          )
        : outletContent}
    </div>
  )
}