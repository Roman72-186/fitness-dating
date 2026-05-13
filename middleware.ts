import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Пути без JWT: auth-эндпоинты, health, webhook бота
const publicPaths = ['/api/health', '/api/auth', '/api/bot', '/api/admin']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Токен не передан' }, { status: 401 })
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? '')
      const { payload } = await jwtVerify(token, secret)
      if (!payload.sub) throw new Error('Нет sub в токене')

      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-user-id', payload.sub)
      return NextResponse.next({ request: { headers: requestHeaders } })
    } catch {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Недействительный токен' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
