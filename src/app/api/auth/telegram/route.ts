import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { createHmac } from 'crypto'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const JWT_SECRET = process.env.JWT_SECRET ?? ''

// Верификация Telegram initData по стандарту:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
function verifyInitData(initData: string): { id: string } | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  params.delete('hash')
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b))
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (expectedHash !== hash) return null

  const userRaw = params.get('user')
  if (!userRaw) return null

  try {
    const user = JSON.parse(userRaw) as { id: number }
    return { id: String(user.id) }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не настроен' }, { status: 500 })
  }

  let initData: string
  try {
    const body = await req.json() as { initData?: string }
    initData = body.initData ?? ''
  } catch {
    return NextResponse.json({ error: 'Невалидный JSON' }, { status: 400 })
  }

  if (!initData) {
    return NextResponse.json({ error: 'initData отсутствует' }, { status: 400 })
  }

  const user = verifyInitData(initData)
  if (!user) {
    return NextResponse.json({ error: 'Невалидная подпись Telegram' }, { status: 401 })
  }

  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(JWT_SECRET))

  return NextResponse.json({ token, userId: user.id })
}
