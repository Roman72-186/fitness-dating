import { jwtVerify, type JWTPayload } from 'jose'
import type { NextRequest } from 'next/server'

export interface AuthPayload extends JWTPayload {
  sub: string // telegram_id
}

/**
 * Извлекает JWT токен из URL параметра ?token=
 * Используется только на клиенте при первом открытии Mini App
 */
export function parseTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('token')
}

/**
 * Верифицирует JWT токен через jose
 * Используется в middleware.ts на сервере
 */
export async function verifyJwt(token: string): Promise<AuthPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? '')
    const { payload } = await jwtVerify(token, secret)
    if (!payload.sub) return null
    return payload as AuthPayload
  } catch {
    return null
  }
}

// Читает user_id из Authorization заголовка — используется в route handlers
export async function getAuthUser(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null
  const payload = await verifyJwt(token)
  return payload?.sub ?? null
}
