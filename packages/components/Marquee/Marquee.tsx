import { createStyles, keyframes } from 'antd-style'
import React from 'react'

const marqueeHorizontal = keyframes({
  '0%': {
    transform: 'translateX(0)',
  },
  '100%': {
    transform: 'translateX(-50%)',
  },
})

const marqueeVertical = keyframes({
  '0%': {
    transform: 'translateY(0)',
  },
  '100%': {
    transform: 'translateY(-50%)',
  },
})

export interface MarqueeProps {
  children: React.ReactNode
  /** 是否在悬停时暂停 */
  pauseOnHover?: boolean
  /** 是否反向滚动 */
  reverse?: boolean
  /** 重复次数，用于创建无缝滚动效果，建议 ≥ 2 */
  repeat?: number
  className?: string
  /** 内联样式 */
  style?: React.CSSProperties
  /** 动画时长（秒） */
  duration?: number
  /** 是否显示渐变蒙层 */
  gradient?: boolean
  /** 子项之间的间距 */
  gap?: number
  /** 滚动方向 */
  direction?: 'horizontal' | 'vertical'
}

const useStyles = createStyles(({ token, css }) => ({
  wrapper: css`
        position: relative;
        overflow: hidden;
        width: 100%;
        height: 100%;
    `,
  container: css`
        will-change: transform;
        animation: linear infinite;
    `,
  containerHorizontal: css`
        display: flex;
        width: fit-content;
    `,
  containerVertical: css`
        display: flex;
        flex-direction: column;
        height: fit-content;
    `,
  containerPauseOnHover: css`
        &:hover {
            animation-play-state: paused;
        }
    `,
  containerReverse: css`
        animation-direction: reverse;
    `,
  gradientOverlayHorizontal: css`
        pointer-events: none;
        position: absolute;
        inset: 0;
        background: linear-gradient(to right, ${token.colorBgContainer} 0%, transparent 10%, transparent 90%, ${token.colorBgContainer} 100%);
    `,
  gradientOverlayVertical: css`
        pointer-events: none;
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, ${token.colorBgContainer} 0%, transparent 10%, transparent 90%, ${token.colorBgContainer} 100%);
    `,
}))

export function Marquee({
  className,
  children,
  pauseOnHover = false,
  reverse = false,
  repeat = 2,
  style,
  duration = 30,
  gradient = true,
  gap = 16,
  direction = 'horizontal',
}: MarqueeProps) {
  const { styles, cx } = useStyles()

  // 将 children 转换为数组
  const childrenArray = React.Children.toArray(children)

  // 创建重复的内容
  const content = Array.from({ length: repeat }, (_, repeatIndex) =>
    childrenArray.map((child, childIndex) => (
      <div key={`${repeatIndex}-${childIndex}`}>
        {child}
      </div>
    ))).flat()

  // 根据方向选择动画和样式
  const isVertical = direction === 'vertical'
  const animationName = isVertical ? marqueeVertical : marqueeHorizontal
  const gapStyle = isVertical ? { rowGap: `${gap}px` } : { gap: `${gap}px` }

  return (
    <div className={cx(styles.wrapper, className)} style={{ ...style }}>
      <div
        className={cx(
          styles.container,
          isVertical ? styles.containerVertical : styles.containerHorizontal,
          pauseOnHover && styles.containerPauseOnHover,
          reverse && styles.containerReverse,
        )}
        style={{
          animationName,
          animationDuration: `${duration}s`,
          ...gapStyle,
        }}
      >
        {content}
      </div>
      {gradient && (
        <div className={isVertical ? styles.gradientOverlayVertical : styles.gradientOverlayHorizontal} />
      )}
    </div>
  )
}
