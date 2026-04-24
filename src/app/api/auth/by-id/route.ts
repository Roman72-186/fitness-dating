import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET ?? ''

export async function POST(req: NextRequest) {
  let telegramId: string
  try {
    const body = await req.json() as { telegram_id?: string }
    telegramId = String(body.telegram_id ?? '').trim()
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

  return NextResponse.json({ token, userId: telegramId })
}
