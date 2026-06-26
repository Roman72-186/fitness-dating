import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getAllProfiles, getProfile, fetchActedTargetIds } from '@/lib/db'
import { buildFeed } from '@/lib/filtering'

function parseExcludedIds(req: NextRequest): Set<string> {
  const raw = req.nextUrl.searchParams.get('exclude') ?? ''
  return new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))
}

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Не авторизован' }, { status: 401 })
  }

  try {
    const isGuest = userId.startsWith('guest_')
    const excludedIds = parseExcludedIds(req)
    const [allProfiles, me, actedIds] = await Promise.all([
      getAllProfiles(),
      isGuest ? Promise.resolve(null) : getProfile(userId),
      isGuest ? Promise.resolve(new Set<string>()) : fetchActedTargetIds(userId),
    ])

    if (!isGuest && !me) {
      return NextResponse.json({
        ok: false,
        error: 'PROFILE_REQUIRED',
        message: 'Анкета не найдена. Сначала пройдите регистрацию в боте.',
      }, { status: 403 })
    }

    const profile = buildFeed(allProfiles, me, actedIds)
      .find((candidate) => !excludedIds.has(candidate.user_id))

    if (!profile) {
      return NextResponse.json({
        ok: false,
        error: 'NO_MORE_PROFILES',
        message: 'Анкеты пока закончились. Попробуй зайти позже.',
      }, { status: 404 })
    }

    return NextResponse.json({ ok: true, profile, hasMore: true })
  } catch (err) {
    console.error('[api/profiles/next]', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Внутренняя ошибка' }, { status: 500 })
  }
}
