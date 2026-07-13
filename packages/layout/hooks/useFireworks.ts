import { useCallback, useEffect, useRef } from 'react'
import { themeColorList } from '../utils/data'

// ---------- 默认颜色 ----------
const defaultColors = themeColorList

interface CardThrowConfig {
  count?: number
  colors?: string[]
  startX?: number
  startY?: number
  gravity?: number
  throwSpeed?: { min: number, max: number }
  spreadAngle?: number
  rotationSpeed?: { min: number, max: number }
  cardSize?: number // 卡片逻辑尺寸（更小）
}

interface CardParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alpha: number
  decay: number
  gravity: number
  rotation: number // 用于平面旋转和 3D 翻转驱动
  rotationSpeed: number
  startY: number
}

const DEFAULT_CONFIG: CardThrowConfig = {
  count: 120,
  colors: defaultColors,
  startX: window.innerWidth / 2,
  startY: window.innerHeight * 0.5,
  gravity: 0.2,
  throwSpeed: { min: 8, max: 16 },
  spreadAngle: Math.PI / 3.5, // 60° 伞状
  rotationSpeed: { min: 0.08, max: 0.18 }, // 自转/翻转速度稍慢，更轻盈
  cardSize: 8, // ← 尺寸缩小一倍（原 14）
}

/* ---------- 高清 Canvas 创建 ---------- */
function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 9999;
  `
  return canvas
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const width = window.innerWidth
  const height = window.innerHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  if (ctx)
    ctx.scale(dpr, dpr) // 使用逻辑坐标，清晰无模糊
}

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomColor(colors: string[]): string {
  return colors[Math.floor(Math.random() * colors.length)]
}

/* ---------- Hook ---------- */
export function useFireworks() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const cardsRef = useRef<CardParticle[]>([])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas)
      return
    const ctx = canvas.getContext('2d')
    if (!ctx)
      return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  // 创建卡片（伞状初速度）
  const createCard = useCallback((config: CardThrowConfig, originX: number, originY: number): CardParticle => {
    const speed = random(config.throwSpeed!.min, config.throwSpeed!.max)
    const halfSpread = config.spreadAngle! / 2

    const angleOffset = random(-halfSpread, halfSpread)
    const vx = Math.sin(angleOffset) * speed
    const vy = -Math.cos(angleOffset) * speed

    return {
      x: originX + random(-15, 15),
      y: originY + random(-5, 5),
      vx,
      vy,
      color: randomColor(config.colors!),
      alpha: 1,
      decay: random(0.002, 0.004),
      gravity: config.gravity!,
      rotation: random(0, Math.PI * 2),
      rotationSpeed: random(config.rotationSpeed!.min, config.rotationSpeed!.max) * (Math.random() > 0.5 ? 1 : -1),
      startY: originY,
    }
  }, [])

  // ★ 核心改动：绘制带 3D 翻转效果的薄纸片
  const drawCard = useCallback((ctx: CanvasRenderingContext2D, p: CardParticle, size: number) => {
    ctx.save()
    ctx.translate(p.x, p.y)

    // 平面旋转（让纸片方向随机）
    ctx.rotate(p.rotation * 0.3) // 旋转速度降低，避免与翻转冲突

    // 3D 翻转模拟：通过水平缩放，周期性地变窄 -> 变宽 -> 变窄
    const flipFactor = Math.abs(Math.cos(p.rotation * 2.5)) // 频率可调
    const scaleX = 0.2 + flipFactor * 0.8 // 范围 0.2 ~ 1.0，薄到全宽
    ctx.scale(scaleX, 1)

    // 绘制薄卡片，阴影更轻、更淡
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = p.color
    ctx.shadowColor = p.color
    ctx.shadowBlur = 3 // 阴影变小，突出“薄”的感觉

    const half = size / 2
    ctx.beginPath()
    ctx.roundRect(-half, -half, size, size, 2) // 圆角也减小
    ctx.fill()

    ctx.restore()
  }, [])

  // 动画循环
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas)
      return
    const ctx = canvas.getContext('2d')
    if (!ctx)
      return

    clear()
    const startY = DEFAULT_CONFIG.startY!
    const logicalWidth = canvas.width / (window.devicePixelRatio || 1)
    const logicalHeight = canvas.height / (window.devicePixelRatio || 1)

    cardsRef.current = cardsRef.current.filter((card) => {
      card.vy += card.gravity
      card.x += card.vx
      card.y += card.vy

      card.vx *= 0.995
      card.rotation += card.rotationSpeed

      if (card.y > startY) {
        card.alpha -= card.decay * 5
      }
      else {
        card.alpha -= card.decay
      }

      const outOfScreen
        = card.x < -80
          || card.x > logicalWidth + 80
          || card.y < -80
          || card.y > logicalHeight + 80

      if (card.alpha <= 0 || card.y > startY + 150 || outOfScreen) {
        return false
      }

      drawCard(ctx, card, DEFAULT_CONFIG.cardSize!)
      return true
    })

    if (cardsRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [clear, drawCard])

  const throwCards = useCallback((config: CardThrowConfig = {}) => {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    if (!canvasRef.current) {
      const canvas = createCanvas()
      document.body.appendChild(canvas)
      resizeCanvas(canvas)
      canvasRef.current = canvas

      window.addEventListener('resize', () => {
        if (canvasRef.current)
          resizeCanvas(canvasRef.current)
      })
    }

    const startX = mergedConfig.startX ?? DEFAULT_CONFIG.startX!
    const startY = mergedConfig.startY ?? DEFAULT_CONFIG.startY!

    for (let i = 0; i < mergedConfig.count!; i++) {
      cardsRef.current.push(createCard(mergedConfig, startX, startY))
    }

    animate()
  }, [createCard, animate])

  useEffect(() => {
    return () => {
      if (animationRef.current)
        cancelAnimationFrame(animationRef.current)
      if (canvasRef.current) {
        document.body.removeChild(canvasRef.current)
        canvasRef.current = null
      }
    }
  }, [])

  return { throwCards }
}