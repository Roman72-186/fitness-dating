import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { fetchMatches } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Не авторизован' }, { status: 401 })
  }

  try {
    const raw = await fetchMatches(userId)
    // Форматируем под ожидание фронта: { user_a_id, user_b_id, timestamp, profile }
    // phone и telegram_username включены — единственное место, где они отдаются (§47)
    const matches = raw.map((m) => {
      const [a, b] = userId < m.partnerId ? [userId, m.partnerId] : [m.partnerId, userId]
      return {
        user_a_id: a,
        user_b_id: b,
        timestamp: m.createdAt.toISOString(),
        profile: {
          user_id: m.partnerId,
          name: m.name,
          age: m.age,
          gender: 'other' as const,
          interested_in: 'all' as const,
          about: m.about,
          photos: m.photo ? [m.photo] : [],
          city: m.city,
          club: m.club,
          telegram_username: m.telegram_username ?? undefined,
          active: true,
        },
        phone: m.phone,
        telegram_username: m.telegram_username,
      }
    })
    return NextResponse.json(
      { ok: true, matches },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    )
  } catch (err) {
    console.error('[api/matches]', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Ошибка загрузки мэтчей' }, { status: 500 })
  }
}
