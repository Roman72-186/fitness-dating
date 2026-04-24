import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fitness-dating-6o42.vercel.app'

// WATBOT сценарий вызывает этот эндпоинт с telegram_id пользователя.
// Мы возвращаем готовую ссылку для открытия приложения.
// WATBOT отправляет эту ссылку пользователю кнопкой в сообщении.

export async function POST(req: NextRequest) {
  let telegramId: string

  try {
    const body = await req.json() as Record<string, unknown>
    // WATBOT может передавать id_tg или telegram_id
    telegramId = String(body.id_tg ?? body.telegram_id ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Невалидный JSON' }, { status: 400 })
  }

  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'Невалидный telegram_id' }, { status: 400 })
  }

  const token = await new SignJWT({ sub: telegramId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(JWT_SECRET))

  const url = `${APP_URL}/?token=${token}`

  return NextResponse.json({ ok: true, url, token, userId: telegramId })
}

// GET — для тестирования через браузер: /api/auth/watbot?id_tg=270703004
export async function GET(req: NextRequest) {
  const telegramId = req.nextUrl.searchParams.get('id_tg') ??
                     req.nextUrl.searchParams.get('telegram_id') ?? ''

  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'Передай ?id_tg=ТВОЙ_TELEGRAM_ID' }, { status: 400 })
  }

  const token = await new SignJWT({ sub: telegramId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(JWT_SECRET))

  // Редирект сразу открывает приложение
  return NextResponse.redirect(`${APP_URL}/?token=${token}`)
}
