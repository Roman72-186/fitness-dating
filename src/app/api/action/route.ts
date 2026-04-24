import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import {
  fetchProfile,
  writeView,
  writeLike,
  checkMutualLike,
  writeMatch,
} from '@/lib/watbot-api'
import { notifyMatch } from '@/lib/watbot-notify'
import { invalidateFeedCache } from '@/lib/redis'

const ActionSchema = z.object({
  targetId: z.string().min(1),
  action: z.enum(['like', 'skip']),
})

export async function POST(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Невалидный JSON' }, { status: 400 })
  }

  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Невалидные данные' }, { status: 400 })
  }

  const { targetId, action } = parsed.data

  try {
    await writeView(userId, targetId)
    await invalidateFeedCache(userId)

    if (action === 'skip') {
      return NextResponse.json({ ok: true, isMatch: false })
    }

    // Для записи лайка нужны профили обоих — WATBOT хранит полные данные в строке лайка
    const [myProfile, targetProfile] = await Promise.all([
      fetchProfile(userId),
      fetchProfile(targetId),
    ])

    if (!myProfile || !targetProfile) {
      return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 })
    }

    await writeLike(userId, targetId, myProfile, targetProfile)

    const isMatch = await checkMutualLike(userId, targetId)

    if (isMatch) {
      await writeMatch(userId, targetId, myProfile, targetProfile)
      notifyMatch(userId, targetId).catch(() => {})
    }

    return NextResponse.json({ ok: true, isMatch })
  } catch (err) {
    console.error('[api/action] Ошибка:', err)
    return NextResponse.json({ error: 'Ошибка сохранения действия' }, { status: 500 })
  }
}
