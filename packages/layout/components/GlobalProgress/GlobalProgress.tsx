/* eslint-disable react-refresh/only-export-components */
import { withNProgress } from '@tanem/react-nprogress'
import { createStyles } from 'antd-style'
import { usePageStore } from '../../store/index'

const useStyles = createStyles(() => ({}))

const Bar: React.FC<{
  animationDuration: number
  progress: number
}> = ({ animationDuration, progress }) => {
  const { theme } = useStyles()
  return (
    <div
      style={{
        background: theme.colorPrimaryBorder,
        height: 4,
        left: 0,
        marginLeft: `${(-1 + progress) * 100}%`,
        position: 'fixed',
        top: 0,
        transition: `margin-left ${animationDuration}ms linear`,
        width: '100%',
        zIndex: 1031,
      }}
    >
      <div
        style={{
          boxShadow: `0 0 10px ${theme.colorPrimaryBorder}, 0 0 5px ${theme.colorPrimaryBorder}`,
          display: 'block',
          height: '100%',
          opacity: 1,
          position: 'absolute',
          right: 0,
          transform: 'rotate(3deg) translate(0px, -4px)',
          width: 100,
        }}
      />
    </div>
  )
}

const Container: React.FC<{
  animationDuration: number
  isFinished: boolean
  children: React.ReactNode
}> = ({ animationDuration, children, isFinished }) => (
  <div
    style={{
      opacity: isFinished ? 0 : 1,
      pointerEvents: 'none',
      transition: `opacity ${animationDuration}ms linear`,
    }}
  >
    {children}
  </div>
)

const Spinner: React.FC = () => {
  const { theme } = useStyles()
  return (
    <div
      style={{
        display: 'block',
        position: 'fixed',
        right: 15,
        top: 15,
        zIndex: 1031,
      }}
    >
      <div
        style={{
          animation: '400ms linear infinite rotate',
          borderBottom: '3px solid transparent',
          borderLeft: `3px solid ${theme.colorPrimary}`,
          borderRadius: '50%',
          borderRight: '3px solid transparent',
          borderTop: `3px solid ${theme.colorPrimary}`,
          boxSizing: 'border-box',
          height: 18,
          width: 18,
        }}
      />
    </div>
  )
}

const _GlobalProgress: React.FC<{
  animationDuration: number
  isFinished: boolean
  progress: number
}> = ({ isFinished, progress, animationDuration }) => {
  const { isEnablePageLoadProgress } = usePageStore()
  return isEnablePageLoadProgress
    ? (
        <Container
          animationDuration={animationDuration}
          isFinished={isFinished}
        >
          <Bar animationDuration={animationDuration} progress={progress} />
          <Spinner />
        </Container>
      )
    : null
}

export const GlobalProgress = withNProgress(_GlobalProgress)
