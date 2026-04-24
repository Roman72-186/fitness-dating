import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { fetchProfile } from '@/lib/watbot-api'

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  try {
    const profile = await fetchProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 })
    }
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[api/profile] Ошибка:', err)
    return NextResponse.json({ error: 'Ошибка загрузки профиля' }, { status: 500 })
  }
}
