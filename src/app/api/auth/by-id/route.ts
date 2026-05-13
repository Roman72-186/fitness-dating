import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { prisma, maskPhone } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET ?? ''
const SYNC_SECRET = process.env.SYNC_SECRET ?? ''

// Защищённый endpoint: JWT по telegram_id для серверных интеграций (бот, внешние сервисы)
// Опционально принимает username и phone для апсерта в User
export async function POST(req: NextRequest) {
  let telegramId: string
  let secret: string
  let username: string | undefined
  let phone: string | undefined

  try {
    const body = await req.json() as {
      telegram_id?: string
      secret?: string
      username?: string
      phone?: string
    }
    telegramId = String(body.telegram_id ?? '').trim()
    secret = body.secret ?? ''
    username = body.username
    phone = body.phone
  } catch {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Невалидный JSON' }, { status: 400 })
  }

  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Невалидный telegram_id' }, { status: 400 })
  }

  if (!SYNC_SECRET || secret !== SYNC_SECRET) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // Апсертим telegram_username и phone если переданы (не перезаписываем пустыми)
  try {
    if (username || phone) {
      console.log(`[auth/by-id] telegram_id=${telegramId} phone=${maskPhone(phone)}`)
      await prisma.user.upsert({
        where: { telegram_id: telegramId },
        create: {
          telegram_id: telegramId,
          ...(username ? { telegram_username: username } : {}),
          ...(phone ? { phone } : {}),
        },
        update: {
          ...(username ? { telegram_username: username } : {}),
          ...(phone ? { phone } : {}),
        },
      })
    }
  } catch {
    // Апсерт опциональный — не блокируем выдачу токена
  }

  const token = await new SignJWT({ sub: telegramId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(JWT_SECRET))

  return NextResponse.json({ ok: true, token, userId: telegramId })
}
