import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { fetchIncomingLikes } from '@/lib/watbot-api'

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  try {
    const likes = await fetchIncomingLikes(userId)

    // Данные профиля лайкнувшего уже встроены в запись (imia_m, foto_m и т.д.)
    const result = likes.map((like) => ({
      likerId: like.id_tg_m,
      name: like.imia_m,
      age: like.vozrast_m ? parseInt(like.vozrast_m, 10) : 0,
      club: like.klub_m,
      city: like.gorod_m,
      about: like.o_sebe_m,
      photo: like.foto_m,
    }))

    return NextResponse.json({ likes: result })
  } catch (err) {
    console.error('[api/likes] Ошибка:', err)
    return NextResponse.json({ error: 'Ошибка загрузки лайков' }, { status: 500 })
  }
}
