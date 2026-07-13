import {
  blue,
  cyan,
  geekblue,
  gold,
  green,
  lime,
  magenta,
  orange,
  purple,
  red,
  volcano,
  yellow,
} from '@ant-design/colors'
import { createStyles, keyframes } from 'antd-style'
import { useEffect, useMemo, useRef, useState } from 'react'

const sparkle = keyframes({
  '0%': {
    opacity: 0,
    transform: 'scale(0) rotate(0deg)',
  },
  '50%': {
    opacity: 1,
    transform: 'scale(1) rotate(50deg)',
  },
  '100%': {
    opacity: 0,
    transform: 'scale(0) rotate(50deg)',
  },
})

const useStyles = createStyles(({ token, css }) => ({
  container: css`
    position: relative;
    display: inline-block;
    font-size: inherit;
  `,
  text: css`
    display: inline-block;
    font-weight: bold;
    color: ${token.colorText};
  `,
  sparkle: css`
    position: absolute;
    pointer-events: none;
    animation: ${sparkle} ease-in-out infinite;
  `,
  sparklesLayer: css`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    transition: opacity 0.33s ease-in-out;
  `,
}))

// 生成指定范围的随机整数（包含最小值和最大值）
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function SparklesText({
  text,
  fontSize = 30,
  shapeCount = Math.floor(text.length * 1.2),
  shapes = ['four-point-star'],
  animationSpeed = 'medium',
}: SparklesTextProps) {
  const { styles, theme: token } = useStyles()
  const [cycleCount, setCycleCount] = useState(0)
  const [sparkles, setSparkles] = useState<any[]>([])
  const [isTransitioning, setIsTransitioning] = useState(false)
  const timerRef = useRef<number | null>(null)
  const animationSpeedValue = animationSpeedMap[animationSpeed]

  const generateSparkles = useMemo(() => {
    return () => {
      const positions: { left: number, top: number }[] = []
      const minDistance = 15 // 最小间距，避免重叠

      return Array.from({ length: shapeCount }, (_, i) => {
        const shape = shapes[Math.floor(Math.random() * shapes.length)]
        const color = themeColorList[Math.floor(Math.random() * themeColorList.length)]
        // 尝试找到不重叠的随机位置
        let left: number, top: number
        let attempts = 0
        const maxAttempts = 50

        do {
          // 完全随机位置，增加垂直范围
          left = Math.random() * 100
          top = Math.random() * 120 - 20

          // 检查是否与已有位置太近
          const tooClose = positions.some((pos) => {
            const dx = pos.left - left
            const dy = pos.top - top
            return Math.sqrt(dx * dx + dy * dy) < minDistance
          })

          if (!tooClose) {
            positions.push({ left, top })
            break
          }

          attempts++
        } while (attempts < maxAttempts)

        // 均匀分配动画延迟
        const delay = (i / shapeCount) * animationSpeedValue
        const duration = animationSpeedValue * (0.8 + Math.random() * 0.4)
        const size = randomInRange(Math.floor(fontSize * 0.4), Math.floor(fontSize * 1.1))

        return {
          id: i,
          left: Math.max(0, Math.min(100, left)),
          top: Math.max(-20, Math.min(80, top)),
          delay,
          duration,
          size,
          color,
          shape,
          rotate: Math.random() * 360,
        }
      })
    }
  }, [text, fontSize, shapeCount, shapes, animationSpeed, token])

  useEffect(() => {
    if (cycleCount === 0) {
      // 首次加载
      setSparkles(generateSparkles())
    }
    else {
      // 切换时的平滑过渡
      setIsTransitioning(true)
      // 等待旧效果淡出后显示新效果
      setTimeout(() => {
        setSparkles(generateSparkles())
        setIsTransitioning(false)
      }, 330) // 300ms 淡出时间
    }

    // 每5个周期后重新生成
    const cycleDuration = animationSpeedValue * 5

    timerRef.current = window.setTimeout(() => {
      setCycleCount(prev => prev + 1)
    }, cycleDuration * 1000)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [cycleCount, animationSpeed])

  return (
    <span className={styles.container}>
      <span className={styles.text} style={{ fontSize: `${fontSize}px` }}>
        {text}
      </span>
      <span className={styles.sparklesLayer} style={{ opacity: isTransitioning ? 0 : 1 }}>
        {sparkles.map(item => (
          <span
            key={item.id}
            className={styles.sparkle}
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              animationDelay: `${item.delay}s`,
              animationDuration: `${item.duration}s`,
              width: `${item.size}px`,
              height: `${item.size}px`,
              transform: `rotate(${item.rotate}deg)`,
            } as React.CSSProperties}
          >
            <ShapeComponent shape={item.shape} color={item.color} />
          </span>
        ))}
      </span>
    </span>
  )
}

type SparkleShape = 'star' | 'four-point-star' | 'flower'

type AnimationSpeed = 'fast' | 'medium' | 'slow'

interface SparklesTextProps {
  text: string
  fontSize?: number
  shapeCount?: number
  shapes?: SparkleShape[]
  animationSpeed?: AnimationSpeed
}

const animationSpeedMap = {
  fast: 1,
  medium: 1.5,
  slow: 2,
}

const themeColorList = [
  blue.primary,
  red.primary,
  volcano.primary,
  green.primary,
  orange.primary,
  yellow.primary,
  cyan.primary,
  geekblue.primary,
  purple.primary,
  magenta.primary,
  lime.primary,
  gold.primary,
]

function StarSVG({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill={color}>
      <path
        d="M 100 20 L 118 76 L 176 75 L 129 109 L 147 165 L 100 130 L 53 165 L 71 109 L 24 75 L 82 76 Z"
        stroke={color}
        stroke-width="8"
        stroke-linejoin="round"
      />
    </svg>
  )
}

function FourPointStarSVG({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill={color}>
      <path d="M 100 20 L 120 80 L 180 100 L 120 120 L 100 180 L 80 120 L 20 100 L 80 80 Z" />
    </svg>
  )
}

function FlowerSVG({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill={color}>
      <defs>
        <path id="petal" d="M 100 100 C 135 55, 125 15, 100 15 C 75 15, 65 55, 100 100 Z" />
      </defs>
      <g>
        <use href="#petal" transform="rotate(0 100 100)" />
        <use href="#petal" transform="rotate(60 100 100)" />
        <use href="#petal" transform="rotate(120 100 100)" />
        <use href="#petal" transform="rotate(180 100 100)" />
        <use href="#petal" transform="rotate(240 100 100)" />
        <use href="#petal" transform="rotate(300 100 100)" />
        <circle cx="100" cy="100" r="18" />
      </g>
    </svg>
  )
}

function ShapeComponent({ shape, color }: { shape: SparkleShape, color: string }) {
  switch (shape) {
    case 'star':
      return <StarSVG color={color} />
    case 'four-point-star':
      return <FourPointStarSVG color={color} />
    case 'flower':
      return <FlowerSVG color={color} />
    default:
      return <FourPointStarSVG color={color} />
  }
}
