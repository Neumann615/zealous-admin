import { createStyles, keyframes } from 'antd-style'

export type PatternType = 'grid' | 'dot'

export type AnimationDirection
  = | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'none'

export type MaskDirection
  = | 'all'
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-bottom'
    | 'left-right'
    | 'none'

export interface PatternBgProps {
  pattern?: PatternType
  size?: number
  animationDirection?: AnimationDirection
  maskDirection?: MaskDirection
  opacity?: number
  color?: string
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

function getMaskStyle(direction: MaskDirection, size: number) {
  const fadeSize = `${size * 4}px`
  const fadePercent = '12%'

  switch (direction) {
    case 'all':
      return {
        WebkitMaskImage: `
          linear-gradient(to bottom, transparent 0%, black ${fadePercent}, black calc(100% - ${fadePercent}), transparent 100%),
          linear-gradient(to right, transparent 0%, black ${fadePercent}, black calc(100% - ${fadePercent}), transparent 100%)
        `,
        WebkitMaskComposite: 'source-in',
        maskImage: `
          linear-gradient(to bottom, transparent 0%, black ${fadePercent}, black calc(100% - ${fadePercent}), transparent 100%),
          linear-gradient(to right, transparent 0%, black ${fadePercent}, black calc(100% - ${fadePercent}), transparent 100%)
        `,
        maskComposite: 'intersect',
      }
    case 'top':
      return {
        WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${fadePercent}, black 100%)`,
        maskImage: `linear-gradient(to bottom, transparent 0%, black ${fadePercent}, black 100%)`,
      }
    case 'bottom':
      return {
        WebkitMaskImage: `linear-gradient(to top, transparent 0%, black ${fadePercent}, black 100%)`,
        maskImage: `linear-gradient(to top, transparent 0%, black ${fadePercent}, black 100%)`,
      }
    case 'left':
      return {
        WebkitMaskImage: `linear-gradient(to right, transparent 0%, black ${fadePercent}, black 100%)`,
        maskImage: `linear-gradient(to right, transparent 0%, black ${fadePercent}, black 100%)`,
      }
    case 'right':
      return {
        WebkitMaskImage: `linear-gradient(to left, transparent 0%, black ${fadePercent}, black 100%)`,
        maskImage: `linear-gradient(to left, transparent 0%, black ${fadePercent}, black 100%)`,
      }
    case 'top-bottom':
      return {
        WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${fadePercent}, black calc(100% - ${fadePercent}), transparent 100%)`,
        maskImage: `linear-gradient(to bottom, transparent 0%, black ${fadePercent}, black calc(100% - ${fadePercent}), transparent 100%)`,
      }
    case 'left-right':
      return {
        WebkitMaskImage: `linear-gradient(to right, transparent 0%, black ${fadePercent}, black calc(100% - ${fadePercent}), transparent 100%)`,
        maskImage: `linear-gradient(to right, transparent 0%, black ${fadePercent}, black calc(100% - ${fadePercent}), transparent 100%)`,
      }
    default:
      return {}
  }
}

const moveUp = keyframes({
  '0%': {
    transform: 'translateY(0)',
  },
  '100%': {
    transform: 'translateY(-24px)',
  },
})

const moveDown = keyframes({
  '0%': {
    transform: 'translateY(-24px)',
  },
  '100%': {
    transform: 'translateY(0)',
  },
})

const moveLeft = keyframes({
  '0%': {
    transform: 'translateX(0)',
  },
  '100%': {
    transform: 'translateX(-24px)',
  },
})

const moveRight = keyframes({
  '0%': {
    transform: 'translateX(-24px)',
  },
  '100%': {
    transform: 'translateX(0)',
  },
})

const useStyles = createStyles(({ token, css }) => {
  const defaultColor = token.colorBorder

  return {
    wrapper: css`
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${token.colorBgLayout};
    `,

    pattern: css`
      position: absolute;
      inset: -24px 0 0 0;
      pointer-events: none;
      opacity: 0.5;
    `,

    gridPattern: css`
      background-image:
        linear-gradient(${defaultColor} 1px, transparent 1px),
        linear-gradient(90deg, ${defaultColor} 1px, transparent 1px);
    `,

    dotPattern: css`
      background-image: radial-gradient(circle, ${defaultColor} 1px, transparent 1px);
    `,

    content: css`
      position: relative;
      z-index: 1;
    `,
  }
})

const animationMap: Record<AnimationDirection, typeof moveUp | null> = {
  up: moveUp,
  down: moveDown,
  left: moveLeft,
  right: moveRight,
  none: null,
}

export function PatternBg({
  pattern = 'grid',
  size = 24,
  animationDirection = 'up',
  maskDirection = 'all',
  opacity = 0.5,
  color,
  className,
  style,
  children,
}: PatternBgProps) {
  const { styles, cx } = useStyles()

  const maskStyle = getMaskStyle(maskDirection, size)
  const animationName = animationMap[animationDirection]
  const animationDuration = animationName ? `${1.5 * (24 / size)}s` : undefined

  const patternStyle: React.CSSProperties = {
    backgroundSize: `${size}px ${size}px`,
    opacity,
    ...maskStyle,
  }

  if (animationName) {
    patternStyle.animationName = animationName
    patternStyle.animationDuration = animationDuration
    patternStyle.animationTimingFunction = 'linear'
    patternStyle.animationIterationCount = 'infinite'
  }

  if (pattern === 'dot') {
    patternStyle.backgroundPosition = `${size / 2}px ${size / 2}px`
  }

  return (
    <div className={cx(styles.wrapper, className)} style={style}>
      <div
        className={cx(
          styles.pattern,
          pattern === 'grid' ? styles.gridPattern : styles.dotPattern,
        )}
        style={patternStyle}
      />
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}