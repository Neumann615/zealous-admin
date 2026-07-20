import { jwtVerify, SignJWT } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'zealous-admin-secret-key-change-in-production',
)

const EXPIRES_IN = '7d'

export async function signToken(payload: { sub: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET)
  return payload.sub as string
}
