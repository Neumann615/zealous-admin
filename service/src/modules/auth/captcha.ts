import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { BadRequestError } from '../../lib/errors'

export interface SliderCaptchaChallenge {
  captchaId: string
  bgUrl: string
  puzzleUrl: string
}

export interface SliderCaptchaVerifyInput {
  captchaId: string
  x: number
  y: number
  duration: number
  trail: Array<[number, number]>
}

export interface CaptchaContext {
  username: string
  ip: string
}

interface ChallengeRecord {
  targetX: number
  expiresAt: number
}

interface VerifiedTokenRecord {
  expiresAt: number
  context?: CaptchaContext
}

const CHALLENGE_TTL_MS = 3 * 60 * 1000
const TOKEN_TTL_MS = 5 * 60 * 1000
const POSITION_TOLERANCE = 6
const MIN_DRAG_DURATION_MS = 100
const MAX_DRAG_DURATION_MS = 30 * 1000
const MAX_CHALLENGES = 5000

const challenges = new Map<string, ChallengeRecord>()
const verifiedTokens = new Map<string, VerifiedTokenRecord>()

function dataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function cleanup(now: number): void {
  for (const [id, challenge] of challenges) {
    if (challenge.expiresAt <= now)
      challenges.delete(id)
  }
  for (const [token, record] of verifiedTokens) {
    if (record.expiresAt <= now)
      verifiedTokens.delete(token)
  }
}

export function createSliderCaptcha(): SliderCaptchaChallenge {
  const now = Date.now()
  cleanup(now)
  if (challenges.size >= MAX_CHALLENGES)
    throw new BadRequestError('验证码请求过于频繁，请稍后再试')

  const captchaId = randomUUID()
  const width = 320
  const height = 160
  const targetX = 40 + Math.floor(Math.random() * 220)
  const hue = Math.floor(Math.random() * 360)
  const circles = Array.from({ length: 12 }, (_, index) => {
    const radius = 8 + ((index * 17 + targetX) % 28)
    const x = (index * 53 + targetX * 3) % width
    const y = (index * 41 + targetX * 5) % height
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="hsla(${(hue + index * 23) % 360}, 62%, 62%, 0.24)" />`
  }).join('')

  const bgUrl = dataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${hue}, 68%, 88%)" />
          <stop offset="100%" stop-color="hsl(${(hue + 48) % 360}, 58%, 72%)" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      ${circles}
      <path d="M ${targetX + 8} 48 h 11 a 7 7 0 1 1 14 0 h 11 v 26 a 7 7 0 1 0 0 14 v 24 h -36 a 7 7 0 1 1 -14 0 h -6 z" fill="rgba(15, 23, 42, 0.42)" stroke="rgba(15, 23, 42, 0.65)" stroke-width="2" />
    </svg>
  `.trim())

  const puzzleUrl = dataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="${height}" viewBox="0 0 44 ${height}">
      <path d="M 8 48 h 11 a 7 7 0 1 1 14 0 h 11 v 26 a 7 7 0 1 0 0 14 v 24 h -36 a 7 7 0 1 1 -14 0 h -6 z" fill="rgba(255, 255, 255, 0.82)" stroke="rgba(15, 23, 42, 0.72)" stroke-width="2" />
    </svg>
  `.trim())

  challenges.set(captchaId, { targetX, expiresAt: now + CHALLENGE_TTL_MS })
  return { captchaId, bgUrl, puzzleUrl }
}

export function verifySliderCaptcha(input: SliderCaptchaVerifyInput, context?: CaptchaContext): string {
  const now = Date.now()
  cleanup(now)
  const challenge = challenges.get(input.captchaId)
  challenges.delete(input.captchaId)

  if (!challenge || challenge.expiresAt <= now)
    throw new BadRequestError('验证码已过期，请重新验证')
  if (!Number.isFinite(input.x))
    throw new BadRequestError('验证码位置不合法')
  if (input.duration < MIN_DRAG_DURATION_MS || input.duration > MAX_DRAG_DURATION_MS)
    throw new BadRequestError('验证码操作不合法')
  if (!Array.isArray(input.trail) || input.trail.length < 2)
    throw new BadRequestError('验证码操作轨迹不完整')
  if (Math.abs(input.x - challenge.targetX) > POSITION_TOLERANCE)
    throw new BadRequestError('验证码位置不正确，请重新验证')

  const token = randomUUID()
  verifiedTokens.set(token, { expiresAt: now + TOKEN_TTL_MS, context })
  return token
}

export function consumeCaptchaToken(token: string | undefined, context?: CaptchaContext): boolean {
  if (!token)
    return false
  const record = verifiedTokens.get(token)
  const matchesContext = !record?.context
    || (context?.username.toLowerCase() === record.context.username.toLowerCase() && context?.ip === record.context.ip)
  const valid = Boolean(record && record.expiresAt > Date.now() && matchesContext)
  if (record && matchesContext)
    verifiedTokens.delete(token)
  return valid
}
