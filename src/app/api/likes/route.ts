import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { fetchIncomingLikes } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Не авторизован' }, { status: 401 })
  }

  try {
    const raw = await fetchIncomingLikes(userId)
    // Форматируем под ожидание фронта: { from_user_id, profile: Profile }
    const likes = raw.map((l) => ({
      from_user_id: l.likerId,
      profile: {
        user_id: l.likerId,
        name: l.name,
        age: l.age,
        gender: 'other' as const,
        interested_in: 'all' as const,
        about: l.about,
        photos: l.photo ? [l.photo] : [],
        city: l.city,
        club: l.club,
        active: true,
      },
    }))
    return NextResponse.json({ ok: true, likes })
  } catch (err) {
    console.error('[api/likes]', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Ошибка загрузки лайков' }, { status: 500 })
  }
}
