import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { jwtVerify, SignJWT } from 'jose'

const DEV_SECRET = 'zealous-admin-dev-secret-please-override'

/** 访问令牌有效期：默认 2h，前端静默续期；可用 JWT_EXPIRES_IN 覆盖 */
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h'

let secret: Uint8Array | undefined

function getSecret(): Uint8Array {
  if (secret)
    return secret
  const configured = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : DEV_SECRET)
  if (!configured)
    throw new Error('[auth] 生产环境必须配置 JWT_SECRET 环境变量')
  secret = new TextEncoder().encode(configured)
  return secret
}

/** 启动期校验：生产环境缺少 JWT_SECRET 时直接拒绝启动 */
export function assertJwtSecretConfigured(): void {
  getSecret()
}

export interface TokenPayload {
  sub: string
  jti?: string
  iat?: number
  exp?: number
}

export async function signToken(payload: { sub: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return { sub: String(payload.sub), jti: payload.jti, iat: payload.iat, exp: payload.exp }
}