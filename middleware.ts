import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const publicPaths = ['/api/health', '/api/auth']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Публичные пути — пропускаем
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // API routes — требуем JWT в заголовке Authorization
  if (pathname.startsWith('/api/')) {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Токен не передан' }, { status: 401 })
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? '')
      const { payload } = await jwtVerify(token, secret)
      if (!payload.sub) throw new Error('Нет sub в токене')

      // Пробрасываем user_id в Route Handler через request headers
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-user-id', payload.sub)
      return NextResponse.next({ request: { headers: requestHeaders } })
    } catch {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
