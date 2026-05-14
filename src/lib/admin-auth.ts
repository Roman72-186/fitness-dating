import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const ADMIN_TOKEN_MAX_AGE = '8h'

interface AdminPayload extends JWTPayload {
  role: 'admin'
}

function getAdminLogin(): string {
  return process.env.ADMIN_LOGIN ?? ''
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? ''
}

function getAdminSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || ''
  return new TextEncoder().encode(secret)
}

export function hasAdminCredentials(): boolean {
  return getAdminLogin().length > 0 && getAdminPassword().length > 0 && getAdminSecret().length > 0
}

export function isAdminCredentials(login: string, password: string): boolean {
  return login === getAdminLogin() && password === getAdminPassword()
}

export async function createAdminToken(): Promise<string> {
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime(ADMIN_TOKEN_MAX_AGE)
    .sign(getAdminSecret())
}

export async function verifyAdminToken(token: string | null | undefined): Promise<boolean> {
  if (!token || !hasAdminCredentials()) return false

  try {
    const { payload } = await jwtVerify(token, getAdminSecret())
    const adminPayload = payload as AdminPayload
    return adminPayload.sub === 'admin' && adminPayload.role === 'admin'
  } catch {
    return false
  }
}
