import { createStyles, keyframes } from 'antd-style'
import { useMemo } from 'react'

const shimmer = keyframes({
  '0%': {
    backgroundPosition: '200% center',
  },
  '100%': {
    backgroundPosition: '-200% center',
  },
})

const useStyles = createStyles(({ css }) => ({
  container: css`
    position: relative;
    display: inline-block;
  `,
  text: css`
    display: inline-block;
    font-weight: 600;
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: ${shimmer} linear infinite;
  `,
}))

export interface ShinyTextProps {
  text: string
  fontSize?: number
  speed?: 'slow' | 'medium' | 'fast'
  shinyColor?: string
  textColor?: string
}

const speedMap = {
  slow: 6,
  medium: 4.5,
  fast: 3,
}

export function ShinyText({
  text,
  fontSize = 18,
  speed = 'slow',
  shinyColor,
  textColor,
}: ShinyTextProps) {
  const { styles, theme } = useStyles()

  const customStyle = useMemo(() => {
    const baseColor = textColor || theme.colorPrimary
    // 毛玻璃效果：使用半透明的白色/浅色
    const shimmerColor = shinyColor || theme.colorBgElevated
    return {
      background: `linear-gradient(
      90deg,
      ${baseColor} 0%,
      ${baseColor} 40%,
      ${shimmerColor} 50%,
      ${baseColor} 60%,
      ${baseColor} 100%
    )`,
      backgroundSize: '200% auto',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      animationDuration: `${speedMap[speed]}s`,
    }
  }, [speed, textColor, shinyColor, theme])

  return (
    <span className={styles.container} key={JSON.stringify(customStyle)}>
      <span
        className={styles.text}
        style={{
          fontSize: `${fontSize}px`,
          ...customStyle,
        }}
      >
        {text}
      </span>
    </span>
  )
}
