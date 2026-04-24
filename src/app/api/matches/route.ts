import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { fetchMatches } from '@/lib/watbot-api'

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  try {
    const matches = await fetchMatches(userId)

    // Данные партнёра встроены в запись мэтча — определяем кто партнёр
    const result = matches.map((match) => {
      const iAmInitiator = match.id_tg === userId
      return {
        partnerId: iAmInitiator ? match.id_tg_m : match.id_tg,
        name: iAmInitiator ? match.imia_m : match.imia,
        age: iAmInitiator
          ? (match.vozrast_m ? parseInt(match.vozrast_m, 10) : 0)
          : (match.vozrast ? parseInt(match.vozrast, 10) : 0),
        club: iAmInitiator ? match.klub_m : match.klub,
        city: iAmInitiator ? match.gorod_m : match.gorod,
        about: iAmInitiator ? match.o_sebe_m : match.o_sebe,
        photo: iAmInitiator ? match.foto_m : match.foto,
        username: match.username ?? null,
      }
    })

    return NextResponse.json({ matches: result })
  } catch (err) {
    console.error('[api/matches] Ошибка:', err)
    return NextResponse.json({ error: 'Ошибка загрузки мэтчей' }, { status: 500 })
  }
}
