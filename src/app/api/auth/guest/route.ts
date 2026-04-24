import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET ?? ''

export async function POST(req: NextRequest) {
  let guestId: string
  try {
    const body = await req.json() as { guest_id?: string }
    guestId = String(body.guest_id ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Невалидный JSON' }, { status: 400 })
  }

  if (!guestId || !/^guest_[\w-]{36}$/.test(guestId)) {
    return NextResponse.json({ error: 'Невалидный guest_id' }, { status: 400 })
  }

  const token = await new SignJWT({ sub: guestId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(new TextEncoder().encode(JWT_SECRET))

  return NextResponse.json({ token, userId: guestId })
}
